/**
 * deltamind inspect — show active state grouped by kind.
 *
 * Flags: --kind <kind>, --json
 */

import { renderActiveState, queryItems } from "@deltamind/core";
import type { ActiveContextState, MemoryItem } from "@deltamind/core";
import { loadSession } from "../io.js";
import { formatGroupedByKind } from "../format.js";

export interface InspectOptions {
  kind?: string;
  json?: boolean;
  dir?: string;
}

export async function inspect(opts: InspectOptions = {}): Promise<string> {
  const { session } = loadSession(opts.dir);
  const state = session.state();

  if (opts.kind) {
    const items = queryItems(state, { kind: opts.kind as MemoryItem["kind"] });
    if (opts.json) return JSON.stringify(items, null, 2);
    if (items.length === 0) return `No items of kind "${opts.kind}".`;
    return formatGroupedByKind(items);
  }

  if (opts.json) {
    const items = [...state.items.values()];
    return JSON.stringify(items, null, 2);
  }

  return renderActiveState(state);
}

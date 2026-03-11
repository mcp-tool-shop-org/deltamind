/**
 * deltamind export — budgeted working-set text or ai-loadout JSON.
 *
 * Flags: --max-chars <n>, --for ai-loadout, --json
 */

import { toLoadoutIndex } from "@deltamind/core";
import { loadSession } from "../io.js";

export interface ExportOptions {
  maxChars?: number;
  format?: "text" | "ai-loadout";
  json?: boolean;
  dir?: string;
}

export async function exportCmd(opts: ExportOptions = {}): Promise<string> {
  const { session } = loadSession(opts.dir);

  if (opts.format === "ai-loadout") {
    const index = toLoadoutIndex(session);
    return JSON.stringify(index, null, 2);
  }

  const ctx = session.exportContext({ maxChars: opts.maxChars ?? 4000 });

  if (opts.json) {
    return JSON.stringify(ctx, null, 2);
  }

  return ctx.text;
}

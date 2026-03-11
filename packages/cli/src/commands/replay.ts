/**
 * deltamind replay — walk provenance log chronologically.
 *
 * Flags: --since <seq>, --type accepted|rejected|checkpoint, --json
 */

import { loadSession } from "../io.js";
import { formatProvenanceLine } from "../format.js";
import type { ProvenanceLine } from "@deltamind/core";

export interface ReplayOptions {
  since?: number;
  type?: "accepted" | "rejected" | "checkpoint";
  json?: boolean;
  dir?: string;
}

export async function replay(opts: ReplayOptions = {}): Promise<string> {
  const { provenance } = loadSession(opts.dir);

  if (provenance.length === 0) {
    return "No provenance events recorded.";
  }

  let filtered = provenance;

  if (opts.since !== undefined) {
    filtered = filtered.filter((line) => line.seq >= opts.since!);
  }

  if (opts.type) {
    filtered = filtered.filter((line) => line.type === opts.type);
  }

  if (opts.json) return JSON.stringify(filtered, null, 2);
  if (filtered.length === 0) return "No matching provenance events.";

  return filtered.map(formatProvenanceLine).join("\n");
}

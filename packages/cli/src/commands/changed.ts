/**
 * deltamind changed --since <value>
 *
 * Interprets --since as:
 * - ISO timestamp (contains "T" or "-")
 * - Sequence number (pure integer)
 * - Turn ID (starts with "t-")
 *
 * Groups output by kind.
 * Flags: --json
 */

import { changedSince } from "@deltamind/core";
import type { MemoryItem } from "@deltamind/core";
import { loadSession } from "../io.js";
import { formatGroupedByKind } from "../format.js";

export interface ChangedOptions {
  since: string;
  json?: boolean;
  dir?: string;
}

export async function changed(opts: ChangedOptions): Promise<string> {
  const { session } = loadSession(opts.dir);
  const state = session.state();

  const timestamp = resolveTimestamp(opts.since, state);
  const items = changedSince(state, timestamp);

  if (opts.json) return JSON.stringify(items, null, 2);
  if (items.length === 0) return `No changes since ${opts.since}.`;
  return `Changes since ${opts.since}:\n\n${formatGroupedByKind(items)}`;
}

/**
 * Resolve a --since value to an ISO timestamp.
 */
function resolveTimestamp(
  value: string,
  state: { deltaLog: Array<{ timestamp: string; sourceTurns?: Array<{ turnId: string }> }> },
): string {
  // ISO timestamp
  if (value.includes("T") || /^\d{4}-\d{2}/.test(value)) {
    return value;
  }

  // Pure integer → sequence number → look up timestamp from deltaLog
  const seq = parseInt(value, 10);
  if (!isNaN(seq) && String(seq) === value.trim()) {
    if (seq >= 0 && seq < state.deltaLog.length) {
      return state.deltaLog[seq].timestamp;
    }
    // If seq >= log length, use epoch (show everything)
    return new Date(0).toISOString();
  }

  // Turn ID → find earliest delta with that source turn
  for (const delta of state.deltaLog) {
    const sources = (delta as { sourceTurns?: Array<{ turnId: string }> }).sourceTurns;
    if (sources?.some((s) => s.turnId === value)) {
      return delta.timestamp;
    }
  }

  // Fallback: try as ISO anyway
  return value;
}

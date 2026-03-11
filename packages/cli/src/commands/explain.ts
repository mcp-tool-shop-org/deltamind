/**
 * deltamind explain <item-id>
 *
 * Shows: item fields, semanticId, source turns, tags.
 * Scans deltaLog for all deltas referencing this item.
 * Scans provenance for matching events.
 * Flags: --json
 */

import type { MemoryDelta, MemoryItem, ProvenanceLine } from "@deltamind/core";
import { loadSession } from "../io.js";
import { formatItemDetailed, formatProvenanceLine } from "../format.js";

export interface ExplainOptions {
  itemId: string;
  json?: boolean;
  dir?: string;
}

interface ExplainResult {
  item: MemoryItem | null;
  relatedDeltas: MemoryDelta[];
  provenanceEvents: ProvenanceLine[];
}

export async function explain(opts: ExplainOptions): Promise<string> {
  const { session, provenance } = loadSession(opts.dir);
  const state = session.state();

  const item = state.items.get(opts.itemId) ?? null;

  // Scan deltaLog for deltas referencing this item
  const relatedDeltas = state.deltaLog.filter((d) => {
    const rec = d as unknown as Record<string, unknown>;
    return rec.id === opts.itemId || rec.targetId === opts.itemId;
  });

  // Scan provenance for matching events
  const provenanceEvents = provenance.filter((line) => {
    if (line.type === "checkpoint") return false;
    if (line.type === "accepted" && line.itemId === opts.itemId) return true;
    const rec = line.delta as unknown as Record<string, unknown>;
    return rec.id === opts.itemId || rec.targetId === opts.itemId;
  });

  if (opts.json) {
    return JSON.stringify({ item, relatedDeltas, provenanceEvents }, null, 2);
  }

  if (!item && relatedDeltas.length === 0 && provenanceEvents.length === 0) {
    return `No item or history found for "${opts.itemId}".`;
  }

  const sections: string[] = [];

  if (item) {
    sections.push("=== Item ===");
    sections.push(formatItemDetailed(item));
  } else {
    sections.push(`Item "${opts.itemId}" not found in current state (may have been removed).`);
  }

  if (relatedDeltas.length > 0) {
    sections.push("");
    sections.push(`=== Delta History (${relatedDeltas.length} deltas) ===`);
    for (const d of relatedDeltas) {
      const sum = "summary" in d ? (d as { summary: string }).summary : "";
      sections.push(`  ${d.kind}${sum ? `: "${sum}"` : ""} @ ${d.timestamp}`);
    }
  }

  if (provenanceEvents.length > 0) {
    sections.push("");
    sections.push(`=== Provenance (${provenanceEvents.length} events) ===`);
    for (const line of provenanceEvents) {
      sections.push("  " + formatProvenanceLine(line));
    }
  }

  return sections.join("\n");
}

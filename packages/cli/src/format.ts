/**
 * Shared output formatting — no ANSI, pipe-friendly.
 *
 * All functions return strings. No side effects.
 * stderr/stdout routing is the caller's job.
 */

import type { MemoryItem, ProvenanceLine } from "@deltamind/core";

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/** One-line item summary. */
export function formatItem(item: MemoryItem): string {
  const parts = [`[${item.id}]`, item.kind, `"${item.summary}"`];
  if (item.status !== "active") parts.push(`(${item.status})`);
  if (item.confidence !== "high") parts.push(`[${item.confidence}]`);
  if (item.semanticId) parts.push(`sid:${item.semanticId}`);
  if (item.tags?.length) parts.push(`tags:${item.tags.join(",")}`);
  return parts.join("  ");
}

/** Multi-line detailed item view. */
export function formatItemDetailed(item: MemoryItem): string {
  const lines: string[] = [];
  lines.push(`id:         ${item.id}`);
  if (item.semanticId) lines.push(`semanticId: ${item.semanticId}`);
  lines.push(`kind:       ${item.kind}`);
  lines.push(`summary:    ${item.summary}`);
  lines.push(`status:     ${item.status}`);
  lines.push(`confidence: ${item.confidence}`);
  lines.push(`scope:      ${item.scope}`);
  lines.push(`lastTouched: ${item.lastTouched}`);
  lines.push(`sourceTurns: ${item.sourceTurns.map((s) => s.turnId).join(", ")}`);
  if (item.tags?.length) lines.push(`tags:       ${item.tags.join(", ")}`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

/** Group items by kind and render each group. */
export function formatGroupedByKind(items: MemoryItem[]): string {
  const groups = new Map<string, MemoryItem[]>();
  for (const item of items) {
    const list = groups.get(item.kind) ?? [];
    list.push(item);
    groups.set(item.kind, list);
  }

  const sections: string[] = [];
  for (const [kind, group] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    sections.push(`--- ${kind} (${group.length}) ---`);
    for (const item of group) {
      sections.push("  " + formatItem(item));
    }
  }
  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

/** One-line provenance event. */
export function formatProvenanceLine(line: ProvenanceLine): string {
  switch (line.type) {
    case "accepted": {
      const sum = "summary" in line.delta ? (line.delta as { summary: string }).summary : line.delta.kind;
      return `seq ${String(line.seq).padStart(4)}  ACCEPTED  ${line.delta.kind.padEnd(20)}  ${line.itemId}: "${sum}"`;
    }
    case "rejected": {
      const sum = "summary" in line.delta ? (line.delta as { summary: string }).summary : line.delta.kind;
      return `seq ${String(line.seq).padStart(4)}  REJECTED  ${line.delta.kind.padEnd(20)}  "${sum}" — ${line.reason}`;
    }
    case "checkpoint":
      return `seq ${String(line.seq).padStart(4)}  CHECKPOINT  items:${line.totalItems} deltas:${line.totalDeltas} turns:${line.totalTurns}`;
  }
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface StatsLike {
  totalTurns: number;
  totalItems: number;
  totalDeltas: number;
  seq: number;
  processCount: number;
  activeDecisions: number;
  activeConstraints: number;
  openTasks: number;
}

export function formatStats(stats: StatsLike): string {
  const lines: string[] = [];
  lines.push(`Sequence:     ${stats.seq}`);
  lines.push(`Items:        ${stats.totalItems}`);
  lines.push(`Deltas:       ${stats.totalDeltas}`);
  lines.push(`Turns:        ${stats.totalTurns}`);
  lines.push(`Processed:    ${stats.processCount} batches`);
  lines.push(`Decisions:    ${stats.activeDecisions} active`);
  lines.push(`Constraints:  ${stats.activeConstraints} active`);
  lines.push(`Tasks:        ${stats.openTasks} open`);
  return lines.join("\n");
}

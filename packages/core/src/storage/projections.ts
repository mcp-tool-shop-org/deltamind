/**
 * Human-readable markdown projections — inspection views, not source of truth.
 *
 * These are generated from state, never parsed back into state.
 * The snapshot is authoritative. Markdown is for humans.
 */

import type { ActiveContextState, MemoryItem } from "../types.js";
import {
  activeDecisions,
  activeConstraints,
  openTasks,
  supersededItems,
  unresolvedBranches,
  queryItems,
} from "../state.js";

// ---------------------------------------------------------------------------
// ACTIVE_STATE.md — full working set overview
// ---------------------------------------------------------------------------

export function renderActiveState(state: ActiveContextState): string {
  const sections: string[] = [];

  sections.push("# Active State");
  sections.push("");
  sections.push(`> Sequence: ${state.seq} | Items: ${state.items.size} | Deltas: ${state.deltaLog.length}`);
  sections.push("");

  const goals = queryItems(state, { kind: "goal", status: "active" });
  if (goals.length > 0) {
    sections.push("## Goals");
    sections.push("");
    for (const g of goals) {
      sections.push(renderItem(g));
    }
    sections.push("");
  }

  const decisions = activeDecisions(state);
  if (decisions.length > 0) {
    sections.push("## Decisions");
    sections.push("");
    for (const d of decisions) {
      sections.push(renderItem(d));
    }
    sections.push("");
  }

  const constraints = activeConstraints(state);
  if (constraints.length > 0) {
    sections.push("## Constraints");
    sections.push("");
    for (const c of constraints) {
      sections.push(renderItem(c));
    }
    sections.push("");
  }

  const tasks = openTasks(state);
  if (tasks.length > 0) {
    sections.push("## Open Tasks");
    sections.push("");
    for (const t of tasks) {
      sections.push(renderItem(t));
    }
    sections.push("");
  }

  const branches = unresolvedBranches(state);
  if (branches.length > 0) {
    sections.push("## Unresolved Branches");
    sections.push("");
    for (const b of branches) {
      sections.push(renderItem(b));
    }
    sections.push("");
  }

  const sup = supersededItems(state);
  if (sup.length > 0) {
    sections.push("## Superseded");
    sections.push("");
    for (const s of sup) {
      sections.push(renderItem(s));
    }
    sections.push("");
  }

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// DECISIONS.md — decisions ledger
// ---------------------------------------------------------------------------

export function renderDecisions(state: ActiveContextState): string {
  const sections: string[] = [];
  sections.push("# Decisions");
  sections.push("");

  const active = activeDecisions(state);
  if (active.length > 0) {
    sections.push("## Active");
    sections.push("");
    for (const d of active) {
      sections.push(renderItemDetailed(d));
    }
    sections.push("");
  }

  const sup = [...state.items.values()].filter(
    (i) => i.kind === "decision" && i.status === "superseded",
  );
  if (sup.length > 0) {
    sections.push("## Superseded");
    sections.push("");
    for (const d of sup) {
      sections.push(renderItemDetailed(d));
    }
    sections.push("");
  }

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// TASKS.md — task tracker
// ---------------------------------------------------------------------------

export function renderTasks(state: ActiveContextState): string {
  const sections: string[] = [];
  sections.push("# Tasks");
  sections.push("");

  const open = openTasks(state);
  if (open.length > 0) {
    sections.push("## Open");
    sections.push("");
    for (const t of open) {
      sections.push(renderItemDetailed(t));
    }
    sections.push("");
  }

  const resolved = queryItems(state, { kind: "task", status: "resolved" });
  if (resolved.length > 0) {
    sections.push("## Resolved");
    sections.push("");
    for (const t of resolved) {
      sections.push(renderItemDetailed(t));
    }
    sections.push("");
  }

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// CONSTRAINTS.md — constraints ledger
// ---------------------------------------------------------------------------

export function renderConstraints(state: ActiveContextState): string {
  const sections: string[] = [];
  sections.push("# Constraints");
  sections.push("");

  const active = activeConstraints(state);
  if (active.length > 0) {
    sections.push("## Active");
    sections.push("");
    for (const c of active) {
      sections.push(renderItemDetailed(c));
    }
    sections.push("");
  }

  return sections.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderItem(item: MemoryItem): string {
  const conf = item.confidence !== "high" ? ` [${item.confidence}]` : "";
  const tags = item.tags?.length ? ` (${item.tags.join(", ")})` : "";
  return `- **${item.id}**: ${item.summary}${conf}${tags}`;
}

function renderItemDetailed(item: MemoryItem): string {
  const lines: string[] = [];
  const conf = item.confidence !== "high" ? ` [${item.confidence}]` : "";
  const tags = item.tags?.length ? ` (${item.tags.join(", ")})` : "";
  lines.push(`### ${item.id}: ${item.summary}${conf}${tags}`);
  lines.push("");
  lines.push(`- Status: ${item.status}`);
  lines.push(`- Confidence: ${item.confidence}`);
  lines.push(`- Source turns: ${item.sourceTurns.map((s) => s.turnId).join(", ")}`);
  lines.push(`- Last touched: ${item.lastTouched}`);
  lines.push("");
  return lines.join("\n");
}

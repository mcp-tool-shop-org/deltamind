/**
 * Reconciler: applies typed deltas against ActiveContextState.
 *
 * Design: extractor output is separate from reconciled truth.
 * The extractor says "I think this turn contains a decision."
 * The reconciler says "it maps to existing decision D-12 and revises it."
 *
 * Invariants enforced:
 * 1. An item cannot be both active and superseded.
 * 2. Every persisted delta must have provenance (sourceTurns.length > 0).
 * 3. decision_revised must point to an existing decision.
 * 4. Temporal compaction cannot destroy source traceability.
 * 5. Budgeter cannot surface superseded items unless explicitly requested.
 * 6. Confidence can change, but source turns are append-only.
 * 7. Extractor output stays separate from reconciled truth.
 */

import type {
  ActiveContextState,
  ConfidenceTier,
  ItemKind,
  MemoryDelta,
  MemoryItem,
  ProvenanceEvent,
  SourceRef,
} from "./types.js";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ReconciliationError extends Error {
  constructor(
    message: string,
    public readonly delta: MemoryDelta,
    public readonly invariant: string,
  ) {
    super(`Invariant violation [${invariant}]: ${message}`);
    this.name = "ReconciliationError";
  }
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface ReconcileResult {
  /** Updated state (same reference, mutated in place for performance). */
  state: ActiveContextState;
  /** Provenance events produced by this reconciliation batch. */
  events: ProvenanceEvent[];
  /** Deltas that were rejected (with reasons). */
  rejected: Array<{ delta: MemoryDelta; reason: string }>;
}

// ---------------------------------------------------------------------------
// Reconciler
// ---------------------------------------------------------------------------

/**
 * Apply a batch of deltas to the state. Returns the mutated state plus
 * provenance events and any rejected deltas.
 *
 * Deltas are applied in order. Each delta either mutates state or gets
 * rejected with a reason. Reconciliation never throws — invariant violations
 * produce rejections, not crashes.
 */
export function reconcile(
  state: ActiveContextState,
  deltas: MemoryDelta[],
): ReconcileResult {
  const events: ProvenanceEvent[] = [];
  const rejected: ReconcileResult["rejected"] = [];

  for (const delta of deltas) {
    // Invariant 2: every delta must have provenance
    if (!delta.sourceTurns || delta.sourceTurns.length === 0) {
      rejected.push({ delta, reason: "Missing provenance: sourceTurns is empty" });
      continue;
    }

    const result = applyDelta(state, delta);
    if (result.ok) {
      state.seq++;
      state.deltaLog.push(delta);
      events.push({
        seq: state.seq,
        timestamp: delta.timestamp,
        delta,
        resultingStatus: result.item.status,
        itemId: result.item.id,
      });
    } else {
      rejected.push({ delta, reason: result.reason });
    }
  }

  return { state, events, rejected };
}

// ---------------------------------------------------------------------------
// Internal delta application
// ---------------------------------------------------------------------------

type ApplyOk = { ok: true; item: MemoryItem };
type ApplyFail = { ok: false; reason: string };
type ApplyResult = ApplyOk | ApplyFail;

function applyDelta(state: ActiveContextState, delta: MemoryDelta): ApplyResult {
  switch (delta.kind) {
    case "decision_made":
      return upsertItem(state, {
        id: delta.id,
        kind: "decision",
        summary: delta.summary,
        status: "active",
        confidence: delta.confidence,
        sourceTurns: delta.sourceTurns,
      });

    case "decision_revised": {
      // Invariant 3: must point to existing decision
      const existing = state.items.get(delta.targetId);
      if (!existing) {
        return { ok: false, reason: `decision_revised target "${delta.targetId}" not found` };
      }
      if (existing.kind !== "decision") {
        return { ok: false, reason: `decision_revised target "${delta.targetId}" is ${existing.kind}, not decision` };
      }
      // Update summary, append provenance (invariant 6: source turns append-only)
      existing.summary = delta.summary;
      if (delta.confidence) existing.confidence = delta.confidence;
      appendSourceTurns(existing, delta.sourceTurns);
      existing.lastTouched = delta.timestamp;
      return { ok: true, item: existing };
    }

    case "constraint_added":
      return upsertItem(state, {
        id: delta.id,
        kind: "constraint",
        summary: delta.summary,
        status: "active",
        confidence: delta.hard ? "certain" : "high",
        sourceTurns: delta.sourceTurns,
        tags: delta.hard ? ["hard"] : ["soft"],
      });

    case "task_opened":
      return upsertItem(state, {
        id: delta.id,
        kind: "task",
        summary: delta.summary,
        status: "active",
        confidence: "high",
        sourceTurns: delta.sourceTurns,
      });

    case "task_closed": {
      const existing = state.items.get(delta.targetId);
      if (!existing) {
        return { ok: false, reason: `task_closed target "${delta.targetId}" not found` };
      }
      if (existing.kind !== "task") {
        return { ok: false, reason: `task_closed target "${delta.targetId}" is ${existing.kind}, not task` };
      }
      existing.status = "resolved";
      existing.summary = `${existing.summary} → ${delta.resolution}`;
      appendSourceTurns(existing, delta.sourceTurns);
      existing.lastTouched = delta.timestamp;
      return { ok: true, item: existing };
    }

    case "fact_learned":
      return upsertItem(state, {
        id: delta.id,
        kind: "fact",
        summary: delta.summary,
        status: "active",
        confidence: delta.confidence,
        sourceTurns: delta.sourceTurns,
      });

    case "hypothesis_introduced":
      return upsertItem(state, {
        id: delta.id,
        kind: "hypothesis",
        summary: delta.summary,
        status: "tentative",
        confidence: delta.confidence,
        sourceTurns: delta.sourceTurns,
      });

    case "branch_created":
      return upsertItem(state, {
        id: delta.id,
        kind: "hypothesis",
        summary: delta.alternatives.join(" | "),
        status: "tentative",
        confidence: "medium",
        sourceTurns: delta.sourceTurns,
        tags: ["branch", ...delta.alternatives],
      });

    case "item_superseded": {
      const existing = state.items.get(delta.targetId);
      if (!existing) {
        return { ok: false, reason: `item_superseded target "${delta.targetId}" not found` };
      }
      // Invariant 1: cannot be both active and superseded
      existing.status = "superseded";
      existing.summary = `${existing.summary} [superseded: ${delta.reason}]`;
      appendSourceTurns(existing, delta.sourceTurns);
      existing.lastTouched = delta.timestamp;
      return { ok: true, item: existing };
    }

    case "goal_set":
      return upsertItem(state, {
        id: delta.id,
        kind: "goal",
        summary: delta.summary,
        status: "active",
        confidence: delta.confidence,
        sourceTurns: delta.sourceTurns,
      });

    default: {
      const _exhaustive: never = delta;
      return { ok: false, reason: `Unknown delta kind: ${(_exhaustive as MemoryDelta).kind}` };
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function upsertItem(
  state: ActiveContextState,
  opts: {
    id: string;
    kind: ItemKind;
    summary: string;
    status: MemoryItem["status"];
    confidence: ConfidenceTier;
    sourceTurns: SourceRef[];
    tags?: string[];
  },
): ApplyResult {
  const existing = state.items.get(opts.id);
  if (existing) {
    // Duplicate detection: update existing item
    existing.summary = opts.summary;
    existing.status = opts.status;
    existing.confidence = opts.confidence;
    appendSourceTurns(existing, opts.sourceTurns);
    existing.lastTouched = new Date().toISOString();
    if (opts.tags) existing.tags = [...new Set([...(existing.tags ?? []), ...opts.tags])];
    return { ok: true, item: existing };
  }

  const item: MemoryItem = {
    id: opts.id,
    kind: opts.kind,
    summary: opts.summary,
    status: opts.status,
    confidence: opts.confidence,
    scope: "session",
    sourceTurns: [...opts.sourceTurns],
    lastTouched: new Date().toISOString(),
    tags: opts.tags,
  };
  state.items.set(opts.id, item);
  return { ok: true, item };
}

/** Append source turns without duplicating existing entries. */
function appendSourceTurns(item: MemoryItem, newTurns: SourceRef[]): void {
  const existingIds = new Set(item.sourceTurns.map((s) => s.turnId));
  for (const turn of newTurns) {
    if (!existingIds.has(turn.turnId)) {
      item.sourceTurns.push(turn);
      existingIds.add(turn.turnId);
    }
  }
}

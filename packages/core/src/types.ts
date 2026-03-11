/**
 * DeltaMind core types.
 *
 * Design principle: typed deltas, not summaries. Deltas snap to state changes;
 * summaries smear. Every item carries provenance, confidence, and status.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** What kind of memory item this is. */
export type ItemKind =
  | "fact"
  | "preference"
  | "goal"
  | "decision"
  | "hypothesis"
  | "rejected_option"
  | "open_question"
  | "task"
  | "dependency"
  | "risk"
  | "constraint"
  | "artifact";

/** Lifecycle status of a memory item. Invariant: cannot be both active and superseded. */
export type ItemStatus = "tentative" | "active" | "superseded" | "resolved";

/** Confidence level. Numeric 0-1, but named tiers for ergonomics. */
export type ConfidenceTier = "low" | "medium" | "high" | "certain";

/** Where this item lives and how long it should persist. */
export type ItemScope = "session" | "project" | "durable";

// ---------------------------------------------------------------------------
// Source provenance
// ---------------------------------------------------------------------------

/** A reference back to the raw transcript. Append-only — never rewritten. */
export interface SourceRef {
  /** Opaque turn identifier (e.g. "turn-84", timestamp, or hash). */
  turnId: string;
  /** Optional character offset range within the turn. */
  offset?: { start: number; end: number };
}

// ---------------------------------------------------------------------------
// Memory items (the reconciled state)
// ---------------------------------------------------------------------------

/** A single item in the active context state. */
export interface MemoryItem {
  id: string;
  /** Stable content hash — same meaning produces same semanticId regardless of extractor. */
  semanticId?: string;
  kind: ItemKind;
  summary: string;
  status: ItemStatus;
  confidence: ConfidenceTier;
  scope: ItemScope;
  /** Source turns — append-only. Invariant: never rewritten, only appended. */
  sourceTurns: SourceRef[];
  /** ISO timestamp of last touch. */
  lastTouched: string;
  /** Optional free tags for retrieval. */
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Deltas (extractor output — separate from reconciled truth)
// ---------------------------------------------------------------------------

interface DeltaBase {
  /** ISO timestamp when the extractor produced this delta. */
  timestamp: string;
  /** Source turns that triggered this delta. */
  sourceTurns: SourceRef[];
}

export interface DecisionMadeDelta extends DeltaBase {
  kind: "decision_made";
  id: string;
  summary: string;
  confidence: ConfidenceTier;
}

export interface DecisionRevisedDelta extends DeltaBase {
  kind: "decision_revised";
  /** Must point to an existing decision. Invariant: reconciler rejects if target missing. */
  targetId: string;
  summary: string;
  confidence?: ConfidenceTier;
}

export interface ConstraintRevisedDelta extends DeltaBase {
  kind: "constraint_revised";
  /** Must point to an existing constraint. Invariant: reconciler rejects if target missing or wrong kind. */
  targetId: string;
  summary: string;
  /** Was the constraint relaxed (carve-out/exception) or tightened? */
  mode?: "relaxed" | "tightened" | "amended";
}

export interface ConstraintAddedDelta extends DeltaBase {
  kind: "constraint_added";
  id: string;
  summary: string;
  hard: boolean;
}

export interface TaskOpenedDelta extends DeltaBase {
  kind: "task_opened";
  id: string;
  summary: string;
}

export interface TaskClosedDelta extends DeltaBase {
  kind: "task_closed";
  targetId: string;
  resolution: string;
}

export interface FactLearnedDelta extends DeltaBase {
  kind: "fact_learned";
  id: string;
  summary: string;
  confidence: ConfidenceTier;
}

export interface HypothesisIntroducedDelta extends DeltaBase {
  kind: "hypothesis_introduced";
  id: string;
  summary: string;
  confidence: ConfidenceTier;
}

export interface BranchCreatedDelta extends DeltaBase {
  kind: "branch_created";
  id: string;
  alternatives: string[];
}

export interface ItemSupersededDelta extends DeltaBase {
  kind: "item_superseded";
  targetId: string;
  reason: string;
}

export interface GoalSetDelta extends DeltaBase {
  kind: "goal_set";
  id: string;
  summary: string;
  confidence: ConfidenceTier;
}

export type MemoryDelta =
  | DecisionMadeDelta
  | DecisionRevisedDelta
  | ConstraintRevisedDelta
  | ConstraintAddedDelta
  | TaskOpenedDelta
  | TaskClosedDelta
  | FactLearnedDelta
  | HypothesisIntroducedDelta
  | BranchCreatedDelta
  | ItemSupersededDelta
  | GoalSetDelta;

// ---------------------------------------------------------------------------
// Active context state (the reconciled working set)
// ---------------------------------------------------------------------------

/** The full reconciled state at a point in time. */
export interface ActiveContextState {
  /** All memory items, keyed by id. */
  items: Map<string, MemoryItem>;
  /** Ordered log of applied deltas (for provenance audit). */
  deltaLog: MemoryDelta[];
  /** Monotonic sequence number, incremented on each reconciliation. */
  seq: number;
}

// ---------------------------------------------------------------------------
// Provenance event (append-only event log on disk)
// ---------------------------------------------------------------------------

/** A single line in PROVENANCE.jsonl. */
export interface ProvenanceEvent {
  seq: number;
  timestamp: string;
  delta: MemoryDelta;
  /** State of the affected item AFTER reconciliation. */
  resultingStatus: ItemStatus;
  /** ID of the item affected. */
  itemId: string;
}

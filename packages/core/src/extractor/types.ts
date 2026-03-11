/**
 * Extractor types — Phase 2B.
 *
 * The extractor pipeline is: Pass 0 (event gate) → Pass 1 (delta extractor) → Pass 2 (reconciler).
 * These types define the interfaces between passes.
 */

import type { MemoryDelta, ActiveContextState } from "../types.js";

// ---------------------------------------------------------------------------
// Transcript turn (same as fixture type, but part of the runtime contract)
// ---------------------------------------------------------------------------

export interface Turn {
  turnId: string;
  role: "user" | "assistant" | "system";
  content: string;
}

// ---------------------------------------------------------------------------
// Pass 0: Event gate
// ---------------------------------------------------------------------------

/** Delta kinds the event gate can signal. */
export type EventSignal =
  | "goal"
  | "decision"
  | "constraint"
  | "task"
  | "revision"
  | "supersession"
  | "fact"
  | "hypothesis"
  | "branch"
  | "noop";

/** Result of Pass 0 for a single turn or window. */
export interface EventGateResult {
  turnId: string;
  signals: EventSignal[];
  /** True if at least one non-noop signal was detected. */
  gated: boolean;
}

// ---------------------------------------------------------------------------
// Pass 1: Delta extractor
// ---------------------------------------------------------------------------

/** Evidence that the extractor captured for debuggability. */
export interface ExtractionEvidence {
  /** Turn IDs that were analyzed. */
  turnIds: string[];
  /** Snippets from the turns that triggered this candidate. */
  snippets: string[];
}

/**
 * A candidate delta from the extractor. NOT reconciled truth.
 * The reconciler decides whether to accept or reject.
 */
export interface CandidateDelta {
  delta: MemoryDelta;
  evidence: ExtractionEvidence;
  /** How confident the extractor is (0-1). */
  extractorConfidence: number;
  /** Why the extractor produced this candidate. */
  extractorReason?: string;
  /** Stable content hash — same meaning → same semanticId regardless of extractor. */
  semanticId?: string;
}

/** Result of Pass 1 for a batch of turns. */
export interface ExtractionResult {
  candidates: CandidateDelta[];
  /** Turns that were gated but produced no candidates (for debugging). */
  skippedTurns: string[];
  /** Total tokens (characters) processed. */
  charsProcessed: number;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/** Full pipeline result: extraction + reconciliation. */
export interface PipelineResult {
  /** State after reconciliation. */
  state: ActiveContextState;
  /** All candidates the extractor produced. */
  candidates: CandidateDelta[];
  /** Candidates that the reconciler accepted. */
  accepted: CandidateDelta[];
  /** Candidates that the reconciler rejected (with reasons). */
  rejected: Array<{ candidate: CandidateDelta; reason: string }>;
  /** Gate results per turn. */
  gateResults: EventGateResult[];
  /** Scoreboard metrics. */
  scoreboard: ExtractorScoreboard;
}

// ---------------------------------------------------------------------------
// Scoreboard
// ---------------------------------------------------------------------------

/** Per-kind precision/recall slice. */
export interface KindMetrics {
  kind: string;
  /** Accepted of this kind / candidates of this kind. */
  precision: number;
  /** Matched expected of this kind / total expected of this kind. */
  recall: number;
  /** Number of candidates emitted for this kind. */
  emitted: number;
  /** Number of accepted for this kind. */
  accepted: number;
  /** Number of expected for this kind. */
  expected: number;
  /** Number of matched for this kind. */
  matched: number;
}

/** False-positive severity classification. */
export type FpSeverity = "low" | "medium" | "high";

/** A single false-positive entry for tracking. */
export interface FalsePositive {
  /** The candidate that was incorrectly emitted. */
  candidate: CandidateDelta;
  /** Why this is a false positive. */
  reason: string;
  /** Impact severity: low=noise, medium=misleading, high=canonization/wrong-target. */
  severity: FpSeverity;
}

/** How an extracted delta matched an expected delta. */
export type MatchClass = "exact" | "semantic" | "fuzzy" | "missed";

/** Match class distribution for evaluation. */
export interface MatchClassDistribution {
  exact: number;
  semantic: number;
  fuzzy: number;
  missed: number;
  total: number;
}

/** Metrics for evaluating extractor quality. */
export interface ExtractorScoreboard {
  /** How many emitted deltas are valid/useful? (accepted / total candidates) */
  precision: number;
  /** How many expected deltas were found? (matched / expected) */
  recall: number;
  /** Speculation → fact/decision incorrectly? */
  prematureCanonizationRate: number;
  /** Wrong target on revised/closed/superseded? */
  badTargetRate: number;
  /** Re-emits equivalent deltas from chatter? */
  duplicateEmissionRate: number;
  /** Reconciler rejections / total candidates. */
  reconcilerRejectionRate: number;
  /** Characters processed per accepted delta. */
  costPerAcceptedDelta: number;
  /** Per-delta-kind precision/recall breakdown. */
  byKind: KindMetrics[];
  /** Classified false positives. */
  falsePositives: FalsePositive[];
  /** Match class distribution (how expected deltas were matched). */
  matchClasses?: MatchClassDistribution;
}

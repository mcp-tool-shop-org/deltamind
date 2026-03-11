/**
 * Transcript harness fixture types.
 *
 * A fixture is a transcript + expected deltas + expected final state.
 * Gold labels are brutally minimal: expected deltas, expected items,
 * and expected query answers. No per-sentence annotation tax.
 */

import type { ItemKind, ItemStatus, MemoryDelta } from "../../src/types.js";

/** A single turn in a transcript. */
export interface TranscriptTurn {
  turnId: string;
  role: "user" | "assistant" | "system";
  content: string;
}

/** What we expect from the query suite after all deltas are applied. */
export interface ExpectedQueryAnswers {
  activeDecisionIds: string[];
  activeConstraintIds: string[];
  openTaskIds: string[];
  supersededIds: string[];
  unresolvedBranchIds: string[];
}

/** Expected state of a specific item after reconciliation. */
export interface ExpectedItem {
  id: string;
  kind: ItemKind;
  status: ItemStatus;
  /** Substring match on summary — not exact, because wording may vary. */
  summaryContains: string;
  /** Minimum number of source turns expected. */
  minSourceTurns: number;
}

/** Transcript difficulty class. */
export type TranscriptClass = "clean" | "messy" | "pathological";

/** A complete test fixture. */
export interface TranscriptFixture {
  name: string;
  class: TranscriptClass;
  description: string;
  turns: TranscriptTurn[];
  /** The deltas we expect the extractor to produce (in order). */
  expectedDeltas: MemoryDelta[];
  /** Expected item states after reconciliation. */
  expectedItems: ExpectedItem[];
  /** Expected query answers. */
  expectedQueries: ExpectedQueryAnswers;
}

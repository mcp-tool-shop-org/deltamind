/**
 * Extraction pipeline: Pass 0 (event gate) → Pass 1 (delta extractor) → Pass 2 (reconciler).
 *
 * Single entry point: feed turns, get state + metrics.
 */

import type { ActiveContextState, MemoryDelta } from "../types.js";
import { createState } from "../state.js";
import { reconcile } from "../reconciler.js";
import { gateBatch } from "./event-gate.js";
import { extract } from "./delta-extractor.js";
import { computeScoreboard } from "./scoreboard.js";
import type { Turn, CandidateDelta, PipelineResult } from "./types.js";

export interface PipelineOptions {
  /** Starting state. Defaults to empty. */
  initialState?: ActiveContextState;
  /** ID counter seed for the extractor. */
  nextId?: number;
  /** Expected deltas for scoreboard computation. If omitted, scoreboard uses defaults. */
  expectedDeltas?: MemoryDelta[];
}

/**
 * Run the full extraction pipeline on a batch of turns.
 *
 * Pass 0: gate all turns (cheap heuristics)
 * Pass 1: extract candidate deltas from gated turns
 * Pass 2: reconcile candidates into state
 * Score: compare against expected deltas (if provided)
 */
export function runPipeline(turns: Turn[], opts: PipelineOptions = {}): PipelineResult {
  const state = opts.initialState ?? createState();
  const nextId = opts.nextId ?? 1;

  // Pass 0: gate
  const gateResults = gateBatch(turns);

  // Pass 1: extract
  const extraction = extract(turns, gateResults, { state, nextId });

  // Pass 2: reconcile
  const deltas = extraction.candidates.map((c) => c.delta);
  const reconcileResult = reconcile(state, deltas);

  // Map reconciler rejections back to candidates
  const rejectedSet = new Set(reconcileResult.rejected.map((r) => r.delta));
  const accepted: CandidateDelta[] = [];
  const rejected: Array<{ candidate: CandidateDelta; reason: string }> = [];

  for (const candidate of extraction.candidates) {
    const rej = reconcileResult.rejected.find((r) => r.delta === candidate.delta);
    if (rej) {
      rejected.push({ candidate, reason: rej.reason });
    } else {
      accepted.push(candidate);
    }
  }

  // Scoreboard
  const scoreboard = computeScoreboard(
    extraction.candidates,
    accepted,
    rejected,
    opts.expectedDeltas ?? [],
    extraction.charsProcessed,
  );

  return {
    state: reconcileResult.state,
    candidates: extraction.candidates,
    accepted,
    rejected,
    gateResults,
    scoreboard,
  };
}

/**
 * LLM-enhanced extraction pipeline.
 *
 * Uses LLM for backbone deltas (goals, decisions, constraints, tasks).
 * Falls back to rule-based for hypotheses, branches, facts, supersession.
 * Applies normalizer post-extraction to catch duplicates.
 * Then reconciles against state.
 */

import type { ActiveContextState, MemoryDelta } from "../types.js";
import { createState } from "../state.js";
import { reconcile } from "../reconciler.js";
import { gateBatch } from "./event-gate.js";
import { extract as ruleExtract } from "./delta-extractor.js";
import { llmExtract } from "./llm-extractor.js";
import { normalize } from "./normalizer.js";
import { computeScoreboard } from "./scoreboard.js";
import type { Turn, CandidateDelta, PipelineResult, EventGateResult } from "./types.js";
import type { LlmProvider } from "./llm-provider.js";

export interface LlmPipelineOptions {
  provider: LlmProvider;
  initialState?: ActiveContextState;
  nextId?: number;
  expectedDeltas?: MemoryDelta[];
  /** If true, also run rule-based for non-backbone signals and merge. */
  hybridMode?: boolean;
}

/**
 * Run the LLM-enhanced pipeline.
 *
 * Pass 0: Gate all turns (same cheap heuristics)
 * Pass 1a: LLM extraction for backbone signals
 * Pass 1b: Rule-based extraction for non-backbone signals (if hybrid mode)
 * Pass 1.5: Normalize — deduplicate across both sources
 * Pass 2: Reconcile into state
 * Score: Compare against expected deltas
 */
export async function runLlmPipeline(
  turns: Turn[],
  opts: LlmPipelineOptions,
): Promise<PipelineResult> {
  const state = opts.initialState ?? createState();
  const nextId = opts.nextId ?? 1;
  const hybridMode = opts.hybridMode ?? true;

  // Pass 0: Gate
  const gateResults = gateBatch(turns);

  // Pass 1a: LLM extraction for backbone
  const llmResult = await llmExtract(turns, gateResults, {
    state,
    nextId,
    provider: opts.provider,
  });

  // Safety downgrade: drop revision candidates that target the wrong item kind.
  // Better to abstain than to emit a type-incompatible revision that poisons the ledger.
  let allCandidates = safetyDowngradeRevisions(llmResult.candidates, state);
  let totalChars = llmResult.charsProcessed;

  // Pass 1b: Rule-based for non-backbone (hypothesis, branch, fact, supersession)
  if (hybridMode) {
    const nonBackboneGates = filterNonBackboneGates(gateResults);
    const ruleResult = ruleExtract(turns, nonBackboneGates, { state, nextId: nextId + 100 });
    allCandidates.push(...ruleResult.candidates);
    totalChars += ruleResult.charsProcessed;
  }

  // Pass 1.5: Normalize — deduplicate
  const { candidates: normalized, removed } = normalize(allCandidates);

  // Pass 2: Reconcile
  const deltas = normalized.map((c) => c.delta);
  const reconcileResult = reconcile(state, deltas);

  // Map rejections back
  const accepted: CandidateDelta[] = [];
  const rejected: Array<{ candidate: CandidateDelta; reason: string }> = [];

  for (const candidate of normalized) {
    const rej = reconcileResult.rejected.find((r) => r.delta === candidate.delta);
    if (rej) {
      rejected.push({ candidate, reason: rej.reason });
    } else {
      accepted.push(candidate);
    }
  }

  // Scoreboard
  const scoreboard = computeScoreboard(
    normalized,
    accepted,
    rejected,
    opts.expectedDeltas ?? [],
    totalChars,
  );

  return {
    state: reconcileResult.state,
    candidates: normalized,
    accepted,
    rejected,
    gateResults,
    scoreboard,
  };
}

/**
 * Filter gate results to only include non-backbone signals.
 * This prevents the rule-based extractor from competing with the LLM
 * on backbone deltas.
 */
/**
 * Safety downgrade: drop revision candidates whose targetId points to
 * the wrong item kind. A decision_revised that targets a constraint (or
 * vice versa) would be rejected by the reconciler anyway, but catching
 * it here keeps the candidate list clean for the normalizer and scoreboard.
 */
function safetyDowngradeRevisions(
  candidates: CandidateDelta[],
  state: ActiveContextState,
): CandidateDelta[] {
  return candidates.filter((c) => {
    const d = c.delta;

    if (d.kind === "decision_revised") {
      const target = state.items.get(d.targetId);
      if (!target) return true; // let reconciler handle missing targets
      if (target.kind !== "decision") return false; // wrong kind → drop
    }

    if (d.kind === "constraint_revised") {
      const target = state.items.get(d.targetId);
      if (!target) return true;
      if (target.kind !== "constraint") return false;
    }

    return true;
  });
}

function filterNonBackboneGates(gateResults: EventGateResult[]): EventGateResult[] {
  const backboneSignals = new Set(["goal", "decision", "constraint", "task", "revision"]);

  return gateResults.map((gr) => {
    const nonBackbone = gr.signals.filter((s) => !backboneSignals.has(s));
    return {
      turnId: gr.turnId,
      signals: nonBackbone.length > 0 ? nonBackbone : ["noop"],
      gated: nonBackbone.length > 0,
    };
  });
}

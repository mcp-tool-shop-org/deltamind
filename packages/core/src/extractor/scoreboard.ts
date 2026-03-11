/**
 * Extractor scoreboard — measures extraction quality against gold labels.
 *
 * Key metric: cost per ACCEPTED delta, not cost per turn.
 * Phase 2B.3: per-delta-kind slices + false-positive severity tracking.
 */

import type { MemoryDelta } from "../types.js";
import type { CandidateDelta, ExtractorScoreboard, KindMetrics, FalsePositive, MatchClassDistribution, MatchClass } from "./types.js";
import { semanticId as computeSemanticId } from "./semantic-id.js";

/**
 * Compute scoreboard metrics by comparing extractor output against gold labels.
 */
export function computeScoreboard(
  candidates: CandidateDelta[],
  accepted: CandidateDelta[],
  rejected: Array<{ candidate: CandidateDelta; reason: string }>,
  expectedDeltas: MemoryDelta[],
  charsProcessed: number,
): ExtractorScoreboard {
  const totalCandidates = candidates.length;
  const totalAccepted = accepted.length;
  const totalExpected = expectedDeltas.length;

  // Precision: accepted / total candidates
  const precision = totalCandidates > 0 ? totalAccepted / totalCandidates : 1;

  // Recall: how many expected deltas were matched by accepted candidates
  const matched = countMatches(accepted.map((a) => a.delta), expectedDeltas);
  const recall = totalExpected > 0 ? matched / totalExpected : 1;

  // Premature canonization: hypothesis/speculation emitted as decision/fact
  const canonizationErrors = countCanonizationErrors(candidates, expectedDeltas);
  const prematureCanonizationRate = totalCandidates > 0
    ? canonizationErrors / totalCandidates
    : 0;

  // Bad target rate: revised/closed/superseded pointing to wrong target
  const badTargets = countBadTargets(candidates, expectedDeltas);
  const badTargetRate = totalCandidates > 0 ? badTargets / totalCandidates : 0;

  // Duplicate emission rate
  const duplicates = countDuplicateEmissions(candidates);
  const duplicateEmissionRate = totalCandidates > 0 ? duplicates / totalCandidates : 0;

  // Reconciler rejection rate
  const reconcilerRejectionRate = totalCandidates > 0 ? rejected.length / totalCandidates : 0;

  // Cost per accepted delta
  const costPerAcceptedDelta = totalAccepted > 0 ? charsProcessed / totalAccepted : Infinity;

  // Per-kind metrics
  const byKind = computeByKind(candidates, accepted, expectedDeltas);

  // False-positive tracking
  const falsePositives = classifyFalsePositives(candidates, accepted, expectedDeltas);

  // Match class distribution
  const matchClasses = computeMatchClasses(accepted, expectedDeltas);

  return {
    precision,
    recall,
    prematureCanonizationRate,
    badTargetRate,
    duplicateEmissionRate,
    reconcilerRejectionRate,
    costPerAcceptedDelta,
    byKind,
    falsePositives,
    matchClasses,
  };
}

// ---------------------------------------------------------------------------
// Per-kind metrics
// ---------------------------------------------------------------------------

function computeByKind(
  candidates: CandidateDelta[],
  accepted: CandidateDelta[],
  expected: MemoryDelta[],
): KindMetrics[] {
  // Collect all kinds seen across candidates and expected
  const allKinds = new Set<string>();
  for (const c of candidates) allKinds.add(c.delta.kind);
  for (const e of expected) allKinds.add(e.kind);

  const result: KindMetrics[] = [];

  for (const kind of allKinds) {
    const kindCandidates = candidates.filter((c) => c.delta.kind === kind);
    const kindAccepted = accepted.filter((a) => a.delta.kind === kind);
    const kindExpected = expected.filter((e) => e.kind === kind);

    const kindMatched = countMatches(
      kindAccepted.map((a) => a.delta),
      kindExpected,
    );

    result.push({
      kind,
      precision: kindCandidates.length > 0 ? kindAccepted.length / kindCandidates.length : 1,
      recall: kindExpected.length > 0 ? kindMatched / kindExpected.length : 1,
      emitted: kindCandidates.length,
      accepted: kindAccepted.length,
      expected: kindExpected.length,
      matched: kindMatched,
    });
  }

  // Sort: highest expected count first (most important kinds first)
  result.sort((a, b) => b.expected - a.expected);
  return result;
}

// ---------------------------------------------------------------------------
// False-positive classification
// ---------------------------------------------------------------------------

function classifyFalsePositives(
  candidates: CandidateDelta[],
  accepted: CandidateDelta[],
  expected: MemoryDelta[],
): FalsePositive[] {
  const fps: FalsePositive[] = [];
  const acceptedSet = new Set(accepted);

  for (const c of candidates) {
    // Only look at candidates that weren't accepted (reconciler rejected)
    // OR accepted but don't match any expected delta (spurious)
    const isAccepted = acceptedSet.has(c);

    if (!isAccepted) {
      // Rejected by reconciler — classify why
      fps.push({
        candidate: c,
        reason: "reconciler_rejected",
        severity: severityForRejection(c),
      });
      continue;
    }

    // Accepted but spurious? Check if it matches any expected delta
    const matchesExpected = expected.some((e) => deltaMatches(c.delta, e));
    if (!matchesExpected && expected.length > 0) {
      // Accepted but not in gold labels
      const severity = severityForSpurious(c, expected);
      fps.push({
        candidate: c,
        reason: "spurious_accepted",
        severity,
      });
    }
  }

  return fps;
}

function severityForRejection(c: CandidateDelta): "low" | "medium" | "high" {
  // Duplicate → low (noise, not harmful)
  // Low confidence → low
  if (c.extractorConfidence < 0.5) return "low";
  // Targeted deltas with wrong target → high
  if ("targetId" in c.delta) return "high";
  return "medium";
}

function severityForSpurious(c: CandidateDelta, expected: MemoryDelta[]): "low" | "medium" | "high" {
  // Canonization: emitted decision_made but expected was hypothesis_introduced
  if (c.delta.kind === "decision_made" || c.delta.kind === "fact_learned") {
    const summary = "summary" in c.delta ? (c.delta as { summary: string }).summary : "";
    const wasHypothesis = expected.some(
      (e) =>
        e.kind === "hypothesis_introduced" &&
        "summary" in e &&
        wordOverlap(summary.toLowerCase(), (e as { summary: string }).summary.toLowerCase()) > 0.3,
    );
    if (wasHypothesis) return "high"; // Canonization error
  }

  // Wrong target → high
  if ("targetId" in c.delta) {
    const targetId = (c.delta as { targetId: string }).targetId;
    const expectedTarget = expected.find(
      (e) => e.kind === c.delta.kind && "targetId" in e,
    );
    if (expectedTarget && (expectedTarget as { targetId: string }).targetId !== targetId) {
      return "high";
    }
  }

  // Extra decision/constraint that doesn't exist in gold → medium
  if (c.delta.kind === "decision_made" || c.delta.kind === "constraint_added") {
    return "medium";
  }

  return "low";
}

// ---------------------------------------------------------------------------
// Matching helpers
// ---------------------------------------------------------------------------

/**
 * Count how many expected deltas were matched by extracted deltas.
 * Match criteria: same kind + related content (not exact — summaries will differ).
 */
function countMatches(extracted: MemoryDelta[], expected: MemoryDelta[]): number {
  const used = new Set<number>();
  let matches = 0;

  for (const ext of extracted) {
    for (let i = 0; i < expected.length; i++) {
      if (used.has(i)) continue;
      if (deltaMatches(ext, expected[i])) {
        used.add(i);
        matches++;
        break;
      }
    }
  }

  return matches;
}

/** Check if two deltas match (same kind + similar target/content). */
function deltaMatches(extracted: MemoryDelta, expected: MemoryDelta): boolean {
  if (extracted.kind !== expected.kind) return false;

  // For targeted deltas, check target match
  if ("targetId" in extracted && "targetId" in expected) {
    return (extracted as { targetId: string }).targetId === (expected as { targetId: string }).targetId;
  }

  // For id-bearing deltas, we can't match on ID (extractor generates its own).
  // Match on summary similarity instead.
  if ("summary" in extracted && "summary" in expected) {
    const extSum = (extracted as { summary: string }).summary.toLowerCase();
    const expSum = (expected as { summary: string }).summary.toLowerCase();
    return wordOverlap(extSum, expSum) > 0.3;
  }

  // For branch_created, check alternatives overlap
  if (extracted.kind === "branch_created" && expected.kind === "branch_created") {
    const extAlts = new Set(extracted.alternatives.map((a) => a.toLowerCase()));
    const expAlts = new Set(expected.alternatives.map((a) => a.toLowerCase()));
    let overlap = 0;
    for (const a of extAlts) {
      for (const b of expAlts) {
        if (wordOverlap(a, b) > 0.3) overlap++;
      }
    }
    return overlap > 0;
  }

  return true; // Same kind, no further discriminator
}

/** Count candidates that upgraded speculation to fact/decision. */
function countCanonizationErrors(candidates: CandidateDelta[], expected: MemoryDelta[]): number {
  let errors = 0;
  for (const c of candidates) {
    // If extractor emitted decision_made or fact_learned...
    if (c.delta.kind === "decision_made" || c.delta.kind === "fact_learned") {
      // ...but the expected delta for similar content is a hypothesis
      const summary = "summary" in c.delta ? (c.delta as { summary: string }).summary : "";
      const expectedMatch = expected.find(
        (e) =>
          e.kind === "hypothesis_introduced" &&
          "summary" in e &&
          wordOverlap(summary.toLowerCase(), (e as { summary: string }).summary.toLowerCase()) > 0.3,
      );
      if (expectedMatch) errors++;
    }
  }
  return errors;
}

/** Count candidates with wrong targets. */
function countBadTargets(candidates: CandidateDelta[], expected: MemoryDelta[]): number {
  let bad = 0;
  for (const c of candidates) {
    if ("targetId" in c.delta) {
      const targetId = (c.delta as { targetId: string }).targetId;
      // Find matching expected delta by kind
      const match = expected.find((e) => e.kind === c.delta.kind && "targetId" in e);
      if (match && (match as { targetId: string }).targetId !== targetId) {
        bad++;
      }
    }
  }
  return bad;
}

/** Count semantically duplicate emissions. */
function countDuplicateEmissions(candidates: CandidateDelta[]): number {
  let dupes = 0;
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      if (deltaMatches(candidates[i].delta, candidates[j].delta)) {
        dupes++;
        break;
      }
    }
  }
  return dupes;
}

// ---------------------------------------------------------------------------
// Match class computation
// ---------------------------------------------------------------------------

const DELTA_KIND_TO_ITEM_KIND: Record<string, string> = {
  goal_set: "goal",
  decision_made: "decision",
  decision_revised: "decision",
  constraint_revised: "constraint",
  constraint_added: "constraint",
  task_opened: "task",
  task_closed: "task",
  fact_learned: "fact",
  hypothesis_introduced: "hypothesis",
  branch_created: "hypothesis",
  item_superseded: "supersession",
};

function getDeltaSummary(d: MemoryDelta): string {
  if ("summary" in d) return (d as { summary: string }).summary;
  if ("resolution" in d) return (d as { resolution: string }).resolution;
  if ("alternatives" in d) return (d as { alternatives: string[] }).alternatives.join(" ");
  return "";
}

function getDeltaSemanticId(d: MemoryDelta): string | undefined {
  const summary = getDeltaSummary(d);
  if (!summary) return undefined;
  const itemKind = DELTA_KIND_TO_ITEM_KIND[d.kind] ?? d.kind;
  return computeSemanticId(itemKind, summary);
}

/**
 * Classify how each expected delta was matched (or missed).
 *
 * Match classes:
 * - exact: same counter ID (only within single extractor)
 * - semantic: different IDs but same semanticId
 * - fuzzy: word overlap > 0.3 but no semantic match
 * - missed: no match found
 */
function computeMatchClasses(
  accepted: CandidateDelta[],
  expected: MemoryDelta[],
): MatchClassDistribution {
  const dist: MatchClassDistribution = { exact: 0, semantic: 0, fuzzy: 0, missed: 0, total: expected.length };
  const used = new Set<number>();

  for (const exp of expected) {
    const expSid = getDeltaSemanticId(exp);
    let matchClass: MatchClass = "missed";

    // Try exact ID match first
    for (let i = 0; i < accepted.length; i++) {
      if (used.has(i)) continue;
      const ext = accepted[i].delta;
      if (ext.kind !== exp.kind) continue;
      if ("id" in ext && "id" in exp && (ext as { id: string }).id === (exp as { id: string }).id) {
        matchClass = "exact";
        used.add(i);
        break;
      }
    }

    // Try semantic ID match
    if (matchClass === "missed" && expSid) {
      for (let i = 0; i < accepted.length; i++) {
        if (used.has(i)) continue;
        const ext = accepted[i].delta;
        if (ext.kind !== exp.kind) continue;
        const extSid = accepted[i].semanticId ?? getDeltaSemanticId(ext);
        if (extSid && extSid === expSid) {
          matchClass = "semantic";
          used.add(i);
          break;
        }
      }
    }

    // Try fuzzy match (word overlap)
    if (matchClass === "missed") {
      for (let i = 0; i < accepted.length; i++) {
        if (used.has(i)) continue;
        if (deltaMatches(accepted[i].delta, exp)) {
          matchClass = "fuzzy";
          used.add(i);
          break;
        }
      }
    }

    dist[matchClass]++;
  }

  return dist;
}

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap / Math.min(wordsA.size, wordsB.size);
}

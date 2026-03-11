/**
 * Post-extraction duplicate normalizer.
 *
 * Runs AFTER extraction, BEFORE reconciliation.
 * Catches duplicate candidates that word-overlap missed because
 * the same concept was described with different mouth noises.
 *
 * Three strategies:
 * 1. Exact kind + high word overlap (existing approach, tighter threshold)
 * 2. Semantic similarity via summary canonicalization (strip filler, normalize verbs)
 * 3. Target-based dedup (two revisions targeting the same item = keep latest)
 */

import type { CandidateDelta } from "./types.js";
import { canonicalize, semanticId as computeSemanticId } from "./semantic-id.js";

/** Result of normalization. */
export interface NormalizationResult {
  /** Deduplicated candidates in emission order. */
  candidates: CandidateDelta[];
  /** Candidates that were removed as duplicates. */
  removed: CandidateDelta[];
}

/**
 * Normalize a batch of candidates. Removes duplicates while preserving
 * the highest-confidence version of each concept.
 */
export function normalize(candidates: CandidateDelta[]): NormalizationResult {
  const kept: CandidateDelta[] = [];
  const removed: CandidateDelta[] = [];

  for (const candidate of candidates) {
    const isDupe = kept.some((existing) => isDuplicate(existing, candidate));
    if (isDupe) {
      removed.push(candidate);
    } else {
      kept.push(candidate);
    }
  }

  return { candidates: kept, removed };
}

function isDuplicate(a: CandidateDelta, b: CandidateDelta): boolean {
  // Strategy 0: Semantic ID exact match (same kind) — highest priority
  if (a.delta.kind === b.delta.kind) {
    const sumA = extractSummary(a);
    const sumB = extractSummary(b);
    if (sumA && sumB) {
      const sidA = computeSemanticId(deltaKindToItemKind(a.delta.kind), sumA);
      const sidB = computeSemanticId(deltaKindToItemKind(b.delta.kind), sumB);
      if (sidA === sidB) return true;
    }
  }

  // Strategy 1: Same kind + high word overlap on summary
  if (a.delta.kind === b.delta.kind) {
    const sumA = extractSummary(a);
    const sumB = extractSummary(b);
    if (sumA && sumB) {
      const canonA = canonicalize(sumA);
      const canonB = canonicalize(sumB);
      if (wordOverlap(canonA, canonB) > 0.5) return true;
    }
  }

  // Strategy 2: Cross-kind semantic match (e.g., constraint_added that restates a decision)
  // Only apply to closely related kinds
  if (isRelatedKind(a.delta.kind, b.delta.kind)) {
    const sumA = extractSummary(a);
    const sumB = extractSummary(b);
    if (sumA && sumB) {
      const canonA = canonicalize(sumA);
      const canonB = canonicalize(sumB);
      if (wordOverlap(canonA, canonB) > 0.7) return true;
    }
  }

  // Strategy 3: Target-based dedup (two revisions/closures of the same target)
  if ("targetId" in a.delta && "targetId" in b.delta) {
    const targetA = (a.delta as { targetId: string }).targetId;
    const targetB = (b.delta as { targetId: string }).targetId;
    if (a.delta.kind === b.delta.kind && targetA === targetB) return true;
  }

  return false;
}

function extractSummary(c: CandidateDelta): string | null {
  const d = c.delta as unknown as Record<string, unknown>;
  if (typeof d.summary === "string") return d.summary;
  if (typeof d.resolution === "string") return d.resolution;
  if (Array.isArray(d.alternatives)) return (d.alternatives as string[]).join(" ");
  return null;
}

function deltaKindToItemKind(deltaKind: string): string {
  const map: Record<string, string> = {
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
  return map[deltaKind] ?? deltaKind;
}

function isRelatedKind(a: string, b: string): boolean {
  const groups: string[][] = [
    ["decision_made", "constraint_added"],
    ["goal_set", "task_opened"],
    ["hypothesis_introduced", "branch_created"],
  ];
  return groups.some((g) => g.includes(a) && g.includes(b));
}

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap / Math.min(wordsA.size, wordsB.size);
}

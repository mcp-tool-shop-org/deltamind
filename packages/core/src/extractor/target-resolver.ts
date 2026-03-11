/**
 * Target resolver — explicit substep for revision/closure/supersession.
 *
 * Instead of hallucinating IDs, the LLM resolves against a shortlist
 * of plausible targets from current state. This is its own capability,
 * not a side effect of extraction.
 */

import type { ActiveContextState, ItemKind, MemoryItem } from "../types.js";
import { semanticId as computeSemanticId } from "./semantic-id.js";

/** A candidate target for resolution. */
export interface TargetCandidate {
  id: string;
  kind: ItemKind;
  summary: string;
  status: string;
  semanticId?: string;
}

/** Result of target resolution. */
export interface ResolvedTarget {
  targetId: string;
  confidence: number;
  reason: string;
}

/**
 * Build a shortlist of plausible targets for a given delta kind.
 *
 * For decision_revised: active decisions
 * For task_closed: active tasks
 * For item_superseded: active or tentative items
 *
 * Returns top N candidates by relevance to the content.
 */
export function buildTargetShortlist(
  state: ActiveContextState,
  deltaKind: "decision_revised" | "constraint_revised" | "task_closed" | "item_superseded",
  contentHint: string,
  maxCandidates: number = 5,
): TargetCandidate[] {
  const items = [...state.items.values()];
  let filtered: MemoryItem[];

  switch (deltaKind) {
    case "decision_revised":
      filtered = items.filter((i) => i.kind === "decision" && i.status === "active");
      break;
    case "constraint_revised":
      filtered = items.filter((i) => i.kind === "constraint" && i.status === "active");
      break;
    case "task_closed":
      filtered = items.filter((i) => i.kind === "task" && i.status === "active");
      break;
    case "item_superseded":
      filtered = items.filter((i) => i.status === "active" || i.status === "tentative");
      break;
  }

  // Score with semantic ID boost: if the content hint produces the same
  // semantic ID as an item, boost to 1.0 (exact semantic match).
  const hintSid = computeSemanticId(deltaKind === "decision_revised" ? "decision" : deltaKind === "constraint_revised" ? "constraint" : deltaKind === "task_closed" ? "task" : "fact", contentHint);

  const scored = filtered.map((item) => {
    // Semantic ID exact match → score 1.0
    if (item.semanticId && item.semanticId === hintSid) {
      return { item, score: 1.0 };
    }
    return {
      item,
      score: wordOverlap(contentHint.toLowerCase(), item.summary.toLowerCase()),
    };
  });

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, maxCandidates).map((s) => ({
    id: s.item.id,
    kind: s.item.kind,
    summary: s.item.summary,
    status: s.item.status,
    semanticId: s.item.semanticId,
  }));
}

/**
 * Resolve a target from a shortlist using simple lexical matching.
 * This is the fallback when no LLM is available.
 * The LLM extractor uses the shortlist in its prompt instead.
 */
export function resolveTargetLexical(
  shortlist: TargetCandidate[],
  contentHint: string,
): ResolvedTarget | null {
  if (shortlist.length === 0) return null;

  const hint = contentHint.toLowerCase();
  let best: TargetCandidate | null = null;
  let bestScore = 0;

  for (const candidate of shortlist) {
    const score = wordOverlap(hint, candidate.summary.toLowerCase());
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (!best || bestScore < 0.15) return null;

  return {
    targetId: best.id,
    confidence: Math.min(bestScore, 1),
    reason: `Lexical match (${(bestScore * 100).toFixed(0)}% overlap) with ${best.kind} "${best.summary}"`,
  };
}

/**
 * Format shortlist for inclusion in an LLM prompt.
 * The model picks the best match or says "none".
 */
export function formatShortlistForPrompt(shortlist: TargetCandidate[]): string {
  if (shortlist.length === 0) return "No candidates available.";
  return shortlist
    .map((c, i) => `  ${i + 1}. [${c.id}] (${c.kind}, ${c.status}) "${c.summary}"`)
    .join("\n");
}

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap / Math.min(wordsA.size, wordsB.size);
}

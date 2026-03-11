/**
 * Pass 1: Rule-based delta extractor (baseline).
 *
 * Implementation order from design:
 *   1. Goals, decisions, constraints, tasks — highest value, easiest to validate
 *   2. Revisions and supersession — where long-session intelligence gets real
 *   3. Branches and hypotheses — hardest, most nuance, most canonization risk
 *
 * This is the baseline extractor. A future LLM extractor drops in as a replacement.
 * The pipeline, scoreboard, and eval harness remain the same.
 *
 * Key design constraint: this runs on windows of gated turns, not every turn.
 * Pass 0 already filtered out likely no-ops.
 */

import type { ActiveContextState, MemoryDelta, SourceRef } from "../types.js";
import type { Turn, EventGateResult, CandidateDelta, ExtractionResult } from "./types.js";
import { semanticId } from "./semantic-id.js";

// ---------------------------------------------------------------------------
// Extractor interface (swappable)
// ---------------------------------------------------------------------------

export interface DeltaExtractorOptions {
  /** Current state, needed for revision/supersession target lookup. */
  state: ActiveContextState;
  /** ID counter seed — extractor increments from here. */
  nextId: number;
}

// ---------------------------------------------------------------------------
// Rule-based baseline extractor
// ---------------------------------------------------------------------------

/** Internal mutable context for extraction. */
interface ExtractCtx {
  state: ActiveContextState;
  nextId: number;
  candidates: CandidateDelta[];
  skipped: string[];
  chars: number;
}

/**
 * Extract candidate deltas from a batch of gated turns.
 * Only processes turns whose gate result has `gated: true`.
 */
export function extract(
  turns: Turn[],
  gateResults: EventGateResult[],
  opts: DeltaExtractorOptions,
): ExtractionResult {
  const gateMap = new Map(gateResults.map((g) => [g.turnId, g]));
  const turnMap = new Map(turns.map((t) => [t.turnId, t]));

  const ctx: ExtractCtx = {
    state: opts.state,
    nextId: opts.nextId,
    candidates: [],
    skipped: [],
    chars: 0,
  };

  for (const turn of turns) {
    const gr = gateMap.get(turn.turnId);
    if (!gr || !gr.gated) continue;

    ctx.chars += turn.content.length;
    const before = ctx.candidates.length;

    for (const signal of gr.signals) {
      switch (signal) {
        case "goal":
          extractGoal(ctx, turn);
          break;
        case "decision":
          extractDecision(ctx, turn, turns, turnMap);
          break;
        case "constraint":
          extractConstraint(ctx, turn);
          break;
        case "task":
          extractTask(ctx, turn);
          break;
        case "revision":
          extractRevision(ctx, turn, turns, turnMap);
          break;
        case "supersession":
          extractSupersession(ctx, turn);
          break;
        case "fact":
          extractFact(ctx, turn);
          break;
        case "hypothesis":
          extractHypothesis(ctx, turn);
          break;
        case "branch":
          extractBranch(ctx, turn);
          break;
        case "noop":
          break;
      }
    }

    if (ctx.candidates.length === before) {
      ctx.skipped.push(turn.turnId);
    }
  }

  return {
    candidates: ctx.candidates,
    skippedTurns: ctx.skipped,
    charsProcessed: ctx.chars,
  };
}

// ---------------------------------------------------------------------------
// Signal extractors — Tier 1: backbone (goals, decisions, constraints, tasks)
// ---------------------------------------------------------------------------

function extractGoal(ctx: ExtractCtx, turn: Turn): void {
  const patterns = [
    /(?:let'?s?\s+build|we(?:'re| are)\s+(?:building|creating|making))\s+(.+?)(?:\.|$)/i,
    /(?:goal|objective)\s+(?:is\s+)?(?:to\s+)?(.+?)(?:\.|$)/i,
    /(?:want\s+to|need\s+to)\s+(?:build|create|make|implement)\s+(.+?)(?:\.|$)/i,
  ];

  for (const p of patterns) {
    const m = turn.content.match(p);
    if (m) {
      const summary = cleanSummary(m[1]);
      if (isDuplicate(ctx, "goal", summary)) return;
      emit(ctx, {
        delta: makeDelta("goal_set", {
          id: genId(ctx, "g"),
          summary,
          confidence: "high" as const,
          sourceTurns: [ref(turn)],
        }),
        snippet: m[0],
        turn,
        confidence: 0.8,
        reason: "Goal pattern match",
      });
      return;
    }
  }
}

function extractDecision(ctx: ExtractCtx, turn: Turn, _turns: Turn[], _turnMap: Map<string, Turn>): void {
  // CRITICAL: hedged language must NOT produce decisions. Yield to hypothesis extractor.
  if (isHedged(turn.content)) return;

  const patterns = [
    /(?:(?:we(?:'ll| will)|I(?:'ll| will)|let'?s?)\s+(?:use|go\s+with|pick|choose|stick\s+with))\s+(.+?)(?:\.|$)/i,
    /(?:(?:use|using))\s+(\w+(?:\s+\w+)?)\s+(?:for|as)\s+(.+?)(?:\.|$)/i,
    /(?:decided\s+(?:to|on))\s+(.+?)(?:\.|$)/i,
    /(?:going\s+with)\s+(.+?)(?:\.|$)/i,
  ];

  for (const p of patterns) {
    const m = turn.content.match(p);
    if (m) {
      // For "use X for Y" pattern, combine capture groups
      const summary = m[2]
        ? cleanSummary(`Use ${m[1]} for ${m[2]}`)
        : cleanSummary(m[1].startsWith("use ") || m[1].startsWith("Use ") ? m[1] : `Use ${m[1]}`);
      if (isDuplicate(ctx, "decision", summary)) return;
      emit(ctx, {
        delta: makeDelta("decision_made", {
          id: genId(ctx, "d"),
          summary,
          confidence: "high" as const,
          sourceTurns: [ref(turn)],
        }),
        snippet: m[0],
        turn,
        confidence: 0.75,
        reason: "Decision pattern match",
      });
      return;
    }
  }
}

function extractConstraint(ctx: ExtractCtx, turn: Turn): void {
  const hardPatterns = [
    /(?:must(?:\s+not)?|cannot|can(?:'t|not))\s+(.+?)(?:\.|$)/i,
    /(?:no\s+(?:runtime\s+)?(?:dep(?:endenc(?:y|ies))?|external))\b(.*)$/im,
    /(?:non-?negotiable|hard\s+(?:rule|constraint|requirement))(?:\s*:\s*|\s+)(.+?)(?:\.|$)/i,
    /(?:zero[- ]dep(?:s|endenc(?:y|ies))?)\b(.*)$/im,
  ];

  const softPatterns = [
    /(?:important|critical)(?:\s*:\s*|\s+)(.+?)(?:\.|$)/i,
    /(?:prefer|should|ideally)\s+(.+?)(?:\.|$)/i,
  ];

  // Try hard constraints first
  for (const p of hardPatterns) {
    const m = turn.content.match(p);
    if (m) {
      const summary = cleanSummary(m[0]);
      if (isDuplicate(ctx, "constraint", summary)) return;
      emit(ctx, {
        delta: makeDelta("constraint_added", {
          id: genId(ctx, "c"),
          summary,
          hard: true,
          sourceTurns: [ref(turn)],
        }),
        snippet: m[0],
        turn,
        confidence: 0.85,
        reason: "Hard constraint pattern",
      });
      return;
    }
  }

  for (const p of softPatterns) {
    const m = turn.content.match(p);
    if (m) {
      const summary = cleanSummary(m[0]);
      if (isDuplicate(ctx, "constraint", summary)) return;
      emit(ctx, {
        delta: makeDelta("constraint_added", {
          id: genId(ctx, "c"),
          summary,
          hard: false,
          sourceTurns: [ref(turn)],
        }),
        snippet: m[0],
        turn,
        confidence: 0.6,
        reason: "Soft constraint pattern",
      });
      return;
    }
  }
}

function extractTask(ctx: ExtractCtx, turn: Turn): void {
  // Task opening
  const openPatterns = [
    /(?:let\s+me|I(?:'ll| will))\s+(write|create|implement|set\s+up|scaffold|add|fix|build)\s+(.+?)(?:\.|$)/i,
    /(?:next(?:\s+step)?(?:\s*:|\s+is))\s+(.+?)(?:\.|$)/i,
  ];

  // Task closing
  const closePatterns = [
    /(\w+(?:\s+\w+)*?)\s+(?:done|completed?|finished|shipped|merged)\b/i,
    /(?:tests?\s+(?:written\s+and\s+)?passing)\s*(?:—|[-–])\s*(.+?)(?:\.|$)/i,
    /(?:tests?\s+(?:written\s+and\s+)?passing)\b/i,
  ];

  // Check for task closing first (more specific)
  for (const p of closePatterns) {
    const m = turn.content.match(p);
    if (m) {
      // Try to find matching open task in state
      const closable = findClosableTask(ctx, turn.content);
      if (closable) {
        const resolution = cleanSummary(m[0]);
        emit(ctx, {
          delta: makeDelta("task_closed", {
            targetId: closable.id,
            resolution,
            sourceTurns: [ref(turn)],
          }),
          snippet: m[0],
          turn,
          confidence: 0.7,
          reason: `Closing task ${closable.id}: ${closable.summary}`,
        });
        // Don't return — same turn might also open a new task
      }
    }
  }

  // Check for task opening
  for (const p of openPatterns) {
    const m = turn.content.match(p);
    if (m) {
      const summary = m[2] ? cleanSummary(`${m[1]} ${m[2]}`) : cleanSummary(m[1]);
      if (isDuplicate(ctx, "task", summary)) return;
      emit(ctx, {
        delta: makeDelta("task_opened", {
          id: genId(ctx, "task"),
          summary,
          sourceTurns: [ref(turn)],
        }),
        snippet: m[0],
        turn,
        confidence: 0.7,
        reason: "Task open pattern",
      });
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Signal extractors — Tier 2: revisions and supersession
// ---------------------------------------------------------------------------

function extractRevision(ctx: ExtractCtx, turn: Turn, _turns: Turn[], _turnMap: Map<string, Turn>): void {
  const patterns = [
    /(?:actually|wait|instead|on\s+second\s+thought)[,.]?\s+(?:(?:let'?s?|we\s+should|I(?:'ll| will))\s+)?(?:use|switch\s+to|go\s+with|change\s+to)\s+(.+?)(?:\.|$)/i,
    /(?:no[,.]?\s*(?:let'?s?|we\s+should))\s+(.+?)(?:\.|$)/i,
    /(?:revise|revised|update|change)\s+(?:that|this|the\s+\w+)\s+to\s+(.+?)(?:\.|$)/i,
    /(?:allow|except|exception)\s+(.+?)(?:\s+as\s+(?:the\s+)?(?:sole\s+)?exception)?(?:\.|$)/i,
  ];

  for (const p of patterns) {
    const m = turn.content.match(p);
    if (m) {
      // Type-scoped target resolution: try decision first, then constraint
      const decisionTarget = findRevisionTarget(ctx, turn.content, "decision");
      const constraintTarget = findRevisionTarget(ctx, turn.content, "constraint");

      // Pick best match — prefer the target with higher overlap
      const summary = cleanSummary(m[1]);

      if (constraintTarget && (!decisionTarget || constraintTarget.score >= decisionTarget.score)) {
        // Constraint revision — detect mode from language
        const mode = detectConstraintRevisionMode(turn.content);
        emit(ctx, {
          delta: makeDelta("constraint_revised", {
            targetId: constraintTarget.id,
            summary: `${constraintTarget.summary} → ${mode}: ${summary}`,
            mode,
            sourceTurns: [ref(turn)],
          }),
          snippet: m[0],
          turn,
          confidence: 0.65,
          reason: `Constraint ${mode} targeting ${constraintTarget.id}`,
        });
        return;
      }

      if (decisionTarget) {
        emit(ctx, {
          delta: makeDelta("decision_revised", {
            targetId: decisionTarget.id,
            summary: `${decisionTarget.summary} → revised: ${summary}`,
            sourceTurns: [ref(turn)],
          }),
          snippet: m[0],
          turn,
          confidence: 0.65,
          reason: `Decision revision targeting ${decisionTarget.id}`,
        });
        return;
      }
    }
  }
}

/** Detect whether a constraint revision is a relaxation, tightening, or amendment. */
function detectConstraintRevisionMode(content: string): "relaxed" | "tightened" | "amended" {
  const lower = content.toLowerCase();
  if (/\b(?:allow|except|exception|relax|loosen|permit|carve[- ]?out)\b/.test(lower)) return "relaxed";
  if (/\b(?:strict|tighten|restrict|narrow|limit|forbid|ban)\b/.test(lower)) return "tightened";
  return "amended";
}

function extractSupersession(ctx: ExtractCtx, turn: Turn): void {
  const patterns = [
    /(?:replac(?:e|ing)|no\s+longer|drop(?:ping)?)\s+(.+?)(?:\.|$)/i,
    /(?:instead\s+of|rather\s+than)\s+(.+?)(?:,\s*(?:we(?:'ll| will)|let'?s?|I(?:'ll| will)))\s+(.+?)(?:\.|$)/i,
    /(?:forget\s+(?:about\s+)?(?:that|the\s+)?)(.+?)(?:\.|$)/i,
  ];

  for (const p of patterns) {
    const m = turn.content.match(p);
    if (m) {
      const target = findSupersessionTarget(ctx, m[1]);
      if (target) {
        emit(ctx, {
          delta: makeDelta("item_superseded", {
            targetId: target.id,
            reason: cleanSummary(m[0]),
            sourceTurns: [ref(turn)],
          }),
          snippet: m[0],
          turn,
          confidence: 0.6,
          reason: `Superseding ${target.id}: ${target.summary}`,
        });
        return;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Signal extractors — Tier 3: facts, hypotheses, branches
// ---------------------------------------------------------------------------

function extractFact(ctx: ExtractCtx, turn: Turn): void {
  const patterns = [
    /(?:turns?\s+out|found\s+(?:that|out)|discovered)\s+(?:that\s+)?(.+?)(?:\.|$)/i,
    /(?:apparently|it\s+(?:seems|appears))\s+(?:that\s+)?(.+?)(?:\.|$)/i,
  ];

  for (const p of patterns) {
    const m = turn.content.match(p);
    if (m) {
      const summary = cleanSummary(m[1]);
      if (isDuplicate(ctx, "fact", summary)) return;
      emit(ctx, {
        delta: makeDelta("fact_learned", {
          id: genId(ctx, "f"),
          summary,
          confidence: "medium" as const,
          sourceTurns: [ref(turn)],
        }),
        snippet: m[0],
        turn,
        confidence: 0.55,
        reason: "Fact pattern match",
      });
      return;
    }
  }
}

function extractHypothesis(ctx: ExtractCtx, turn: Turn): void {
  // CRITICAL: this is where premature canonization risk is highest.
  // Hedged language MUST stay as hypothesis, never promoted to decision.
  const patterns = [
    /(?:maybe|perhaps)\s+(?:we\s+(?:should|could|might)|I\s+(?:should|could|might))\s+(.+?)(?:\.|$)/i,
    /(?:what\s+if\s+we)\s+(.+?)(?:\?|$)/i,
    /(?:I\s+(?:think|suspect|wonder))\s+(?:that\s+)?(.+?)(?:\.|$)/i,
    /(?:worth\s+(?:exploring|trying|considering))\s*(?::\s*)?(.+?)(?:\.|$)/i,
    /(?:could\s+(?:also\s+)?try)\s+(.+?)(?:\.|$)/i,
  ];

  for (const p of patterns) {
    const m = turn.content.match(p);
    if (m) {
      const summary = cleanSummary(m[1]);
      if (isDuplicate(ctx, "hypothesis", summary)) return;
      emit(ctx, {
        delta: makeDelta("hypothesis_introduced", {
          id: genId(ctx, "h"),
          summary,
          confidence: "low" as const,
          sourceTurns: [ref(turn)],
        }),
        snippet: m[0],
        turn,
        confidence: 0.5,
        reason: "Hypothesis pattern — hedged language",
      });
      return;
    }
  }
}

function extractBranch(ctx: ExtractCtx, turn: Turn): void {
  const patterns = [
    /(?:option\s+A[:\s]+)(.+?)(?:option\s+B[:\s]+)(.+?)(?:\.|$)/is,
    /(?:either)\s+(.+?)\s+or\s+(.+?)(?:\.|$)/i,
    /(.+?)\s+vs\.?\s+(.+?)(?:\.|$)/i,
  ];

  for (const p of patterns) {
    const m = turn.content.match(p);
    if (m) {
      const a = cleanSummary(m[1]);
      const b = cleanSummary(m[2]);
      if (isDuplicate(ctx, "branch", `${a} | ${b}`)) return;
      emit(ctx, {
        delta: makeDelta("branch_created", {
          id: genId(ctx, "b"),
          alternatives: [a, b],
          sourceTurns: [ref(turn)],
        }),
        snippet: m[0],
        turn,
        confidence: 0.55,
        reason: "Branch pattern — two alternatives detected",
      });
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function genId(ctx: ExtractCtx, prefix: string): string {
  return `${prefix}-${ctx.nextId++}`;
}

function ref(turn: Turn): SourceRef {
  return { turnId: turn.turnId };
}

/**
 * Detect hedging language that signals uncertainty.
 * If a turn is hedged, decisions should NOT be extracted — yield to hypothesis.
 */
function isHedged(content: string): boolean {
  return /\b(?:maybe|perhaps|probably|not\s+sure|uncertain|I\s+think|might|could\s+be|I\s+wonder|let\s+me\s+think)\b/i.test(content);
}

function cleanSummary(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").replace(/[.!?,;]+$/, "");
}

function makeDelta(kind: string, fields: Record<string, unknown>): MemoryDelta {
  return {
    kind,
    timestamp: new Date().toISOString(),
    ...fields,
  } as MemoryDelta;
}

function emit(
  ctx: ExtractCtx,
  opts: { delta: MemoryDelta; snippet: string; turn: Turn; confidence: number; reason: string },
): void {
  // Compute semantic ID from delta kind + summary/alternatives
  const d = opts.delta as unknown as Record<string, unknown>;
  const itemKind = deltaKindToItemKind(opts.delta.kind);
  const summaryText = typeof d.summary === "string"
    ? d.summary
    : Array.isArray(d.alternatives)
      ? (d.alternatives as string[]).join(" ")
      : "";
  const sid = summaryText ? semanticId(itemKind, summaryText) : undefined;

  ctx.candidates.push({
    delta: opts.delta,
    evidence: {
      turnIds: [opts.turn.turnId],
      snippets: [opts.snippet],
    },
    extractorConfidence: opts.confidence,
    extractorReason: opts.reason,
    semanticId: sid,
  });
}

/** Check if we already emitted a semantically equivalent candidate. */
function isDuplicate(ctx: ExtractCtx, kind: string, summary: string): boolean {
  const summaryLower = summary.toLowerCase();
  return ctx.candidates.some((c) => {
    const dk = c.delta.kind;
    // Map delta kind to item kind for comparison
    const itemKind = deltaKindToItemKind(dk);
    if (itemKind !== kind) return false;
    const cs = "summary" in c.delta ? (c.delta as { summary: string }).summary.toLowerCase() : "";
    // Simple overlap check — if >60% of words overlap, treat as duplicate
    return wordOverlap(cs, summaryLower) > 0.6;
  });
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
    branch_created: "branch",
    item_superseded: "supersession",
  };
  return map[deltaKind] ?? deltaKind;
}

function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return overlap / Math.min(wordsA.size, wordsB.size);
}

/** Find an open task that seems related to this turn's content. */
function findClosableTask(ctx: ExtractCtx, content: string): { id: string; summary: string } | null {
  const lower = content.toLowerCase();
  const openTasks = [...ctx.state.items.values()].filter(
    (item) => item.kind === "task" && item.status === "active",
  );

  // Also check candidates for recently opened tasks
  const candidateTasks = ctx.candidates
    .filter((c) => c.delta.kind === "task_opened")
    .map((c) => ({ id: (c.delta as { id: string }).id, summary: (c.delta as { summary: string }).summary }));

  const allTasks = [
    ...openTasks.map((t) => ({ id: t.id, summary: t.summary })),
    ...candidateTasks,
  ];

  // Find best match by word overlap
  let best: { id: string; summary: string } | null = null;
  let bestScore = 0;
  for (const task of allTasks) {
    const score = wordOverlap(lower, task.summary.toLowerCase());
    if (score > bestScore) {
      bestScore = score;
      best = task;
    }
  }

  return bestScore > 0.2 ? best : null;
}

/** Find the best revision target of a specific kind. Type-scoped: only searches within that kind. */
function findRevisionTarget(ctx: ExtractCtx, content: string, targetKind: "decision" | "constraint"): { id: string; summary: string; score: number } | null {
  const lower = content.toLowerCase();

  // Map target kind to delta kind for candidate lookup
  const deltaKind = targetKind === "decision" ? "decision_made" : "constraint_added";

  const stateItems = [...ctx.state.items.values()].filter(
    (item) => item.kind === targetKind && item.status === "active",
  );

  const candidateItems = ctx.candidates
    .filter((c) => c.delta.kind === deltaKind)
    .map((c) => ({ id: (c.delta as { id: string }).id, summary: (c.delta as { summary: string }).summary }));

  const all = [
    ...stateItems.map((d) => ({ id: d.id, summary: d.summary })),
    ...candidateItems,
  ];

  let best: { id: string; summary: string; score: number } | null = null;
  let bestScore = 0;
  for (const d of all) {
    const score = wordOverlap(lower, d.summary.toLowerCase());
    if (score > bestScore) {
      bestScore = score;
      best = { ...d, score };
    }
  }

  return bestScore > 0.15 ? best : null;
}

/** Find an item that this supersession might target. */
function findSupersessionTarget(ctx: ExtractCtx, mention: string): { id: string; summary: string } | null {
  const lower = mention.toLowerCase();
  const active = [...ctx.state.items.values()].filter(
    (item) => item.status === "active" || item.status === "tentative",
  );

  let best: { id: string; summary: string } | null = null;
  let bestScore = 0;
  for (const item of active) {
    const score = wordOverlap(lower, item.summary.toLowerCase());
    if (score > bestScore) {
      bestScore = score;
      best = { id: item.id, summary: item.summary };
    }
  }

  return bestScore > 0.2 ? best : null;
}

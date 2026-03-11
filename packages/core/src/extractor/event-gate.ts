/**
 * Pass 0: Event gate.
 *
 * Cheap heuristic turn classifier. Runs every turn.
 * High recall, tolerates false positives. Job: avoid spending tokens on fluff.
 *
 * Signals which delta kinds a turn MIGHT contain. Pass 1 does the real work.
 */

import type { Turn, EventSignal, EventGateResult } from "./types.js";

// ---------------------------------------------------------------------------
// Signal patterns (keyword + regex)
// ---------------------------------------------------------------------------

interface SignalPattern {
  signal: EventSignal;
  /** At least one must match (case-insensitive). */
  patterns: RegExp[];
}

const SIGNAL_PATTERNS: SignalPattern[] = [
  {
    signal: "goal",
    patterns: [
      /\b(?:let'?s?\s+build|goal|objective|we(?:'re| are)\s+(?:building|creating|making)|project\s+is|aim\s+(?:is|to))\b/i,
      /\b(?:want\s+to\s+(?:build|create|make|implement)|need\s+to\s+(?:build|create|make))\b/i,
    ],
  },
  {
    signal: "decision",
    patterns: [
      /\b(?:(?:we(?:'ll| will)|I(?:'ll| will)|let'?s?)\s+(?:use|go\s+with|pick|choose|stick\s+with))\b/i,
      /\b(?:decided|decision|choosing|selected|going\s+with|opted?\s+for)\b/i,
      /\b(?:use\s+\w+\s+(?:for|as|instead))\b/i,
    ],
  },
  {
    signal: "constraint",
    patterns: [
      /\b(?:must(?:\s+not)?|cannot|can(?:'t|not)|no\s+\w+\s+(?:allowed|permitted))\b/i,
      /\b(?:constraint|requirement|restriction|hard\s+rule|non-?negotiable)\b/i,
      /\b(?:important(?:\s*:)?|critical(?:\s*:)?)\s/i,
      /\b(?:zero[- ]dep|no\s+(?:runtime\s+)?dep)/i,
    ],
  },
  {
    signal: "task",
    patterns: [
      /\b(?:(?:let\s+me|I(?:'ll| will))\s+(?:write|create|implement|set\s+up|scaffold|add|fix|build))\b/i,
      /\b(?:done|completed?|finished|passing|shipped|merged)\b/i,
      /\b(?:next(?:\s+step)?(?:\s*:|\s+is)?|todo|task)\b/i,
      /\b(?:tests?\s+(?:written|passing|done|complete))\b/i,
    ],
  },
  {
    signal: "revision",
    patterns: [
      /\b(?:actually|wait|instead|change\s+(?:that|this)|revise|revised|update|on\s+second\s+thought)\b/i,
      /\b(?:let'?s?\s+(?:switch|change|go\s+back|revert))\b/i,
      /\b(?:no(?:,|\s+)?\s*(?:let'?s?|we\s+should|I\s+think))\b/i,
      /\b(?:allow|except(?:ion)?|relax|loosen|amend|carve[- ]?out|tighten)\b/i,
    ],
  },
  {
    signal: "supersession",
    patterns: [
      /\b(?:replace|replacing|obsolete|no\s+longer|deprecated|supersede|drop(?:ping)?)\b/i,
      /\b(?:instead\s+of|rather\s+than|forget\s+(?:about\s+)?that)\b/i,
    ],
  },
  {
    signal: "fact",
    patterns: [
      /\b(?:turns?\s+out|found\s+(?:that|out)|discovered|learned|TIL)\b/i,
      /\b(?:apparently|it\s+(?:seems|appears|looks\s+like))\b/i,
      /\b(?:the\s+\w+\s+(?:is|are|supports?|requires?|uses?))\b/i,
    ],
  },
  {
    signal: "hypothesis",
    patterns: [
      /\b(?:maybe|perhaps|might|could|possibly|wondering|consider(?:ing)?)\b/i,
      /\b(?:what\s+if|I\s+think|I\s+suspect|I\s+wonder|we\s+could\s+try)\b/i,
      /\b(?:worth\s+(?:exploring|trying|considering))\b/i,
    ],
  },
  {
    signal: "branch",
    patterns: [
      /\b(?:option\s+[A-D]|alternative|either\s+\w+\s+or|choice\s+between)\b/i,
      /\b(?:two\s+(?:options|approaches|paths)|compare|vs\.?|versus)\b/i,
      /\b(?:on\s+one\s+hand|trade-?off)\b/i,
    ],
  },
];

// ---------------------------------------------------------------------------
// Gate function
// ---------------------------------------------------------------------------

/**
 * Classify a turn's signals. Returns which delta kinds this turn might contain.
 *
 * Cheap: just regex matching. No LLM calls. High recall by design.
 */
export function gate(turn: Turn): EventGateResult {
  const signals: EventSignal[] = [];

  for (const { signal, patterns } of SIGNAL_PATTERNS) {
    if (patterns.some((p) => p.test(turn.content))) {
      signals.push(signal);
    }
  }

  const gated = signals.length > 0;
  return {
    turnId: turn.turnId,
    signals: gated ? signals : ["noop"],
    gated,
  };
}

/**
 * Gate a batch of turns. Returns results for all turns.
 */
export function gateBatch(turns: Turn[]): EventGateResult[] {
  return turns.map(gate);
}

/**
 * LLM-backed delta extractor — Phase 2B.2.
 *
 * Backbone deltas only (goal_set, decision_made, decision_revised,
 * constraint_added, task_opened, task_closed).
 *
 * Hypotheses, branches, and item_superseded stay conservative (rule-based)
 * for now. Those are ambiguity magnets.
 *
 * Three sub-capabilities, not one blob:
 *   A. Semantic delta detection — did a meaningful state change happen?
 *   B. Target resolution — what existing item does a revision refer to?
 *   C. Duplicate suppression — is this genuinely new?
 *
 * The model gets:
 *   - A turn window (not the full transcript)
 *   - A small slice of nearby active state
 *   - A strict schema
 *   - Abstain permission
 *   - Explicit anti-canonization rules
 */

import type { ActiveContextState, MemoryDelta, SourceRef } from "../types.js";
import type { Turn, EventGateResult, CandidateDelta, ExtractionResult } from "./types.js";
import type { LlmProvider } from "./llm-provider.js";
import { buildTargetShortlist, formatShortlistForPrompt } from "./target-resolver.js";
import { semanticId as computeSemanticId } from "./semantic-id.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LlmExtractorOptions {
  state: ActiveContextState;
  nextId: number;
  provider: LlmProvider;
}

/** Raw candidate from LLM JSON output. */
interface RawLlmCandidate {
  kind: string;
  id?: string;
  summary?: string;
  confidence?: string;
  hard?: boolean;
  resolution?: string;
  targetId?: string;
  reason?: string;
  mode?: string;
  sourceTurnIds: string[];
}

// ---------------------------------------------------------------------------
// Backbone delta kinds the LLM handles
// ---------------------------------------------------------------------------

const BACKBONE_SIGNALS = new Set(["goal", "decision", "constraint", "task", "revision"]);

// ---------------------------------------------------------------------------
// Main extraction function
// ---------------------------------------------------------------------------

/**
 * Extract candidate deltas using an LLM for backbone signals.
 * Non-backbone signals (hypothesis, branch, supersession, fact) are skipped
 * — those stay with the rule-based extractor for now.
 */
export async function llmExtract(
  turns: Turn[],
  gateResults: EventGateResult[],
  opts: LlmExtractorOptions,
): Promise<ExtractionResult> {
  const gateMap = new Map(gateResults.map((g) => [g.turnId, g]));
  const candidates: CandidateDelta[] = [];
  const skipped: string[] = [];
  let chars = 0;
  let nextId = opts.nextId;

  // Process turns in windows — batch adjacent gated turns
  const windows = buildWindows(turns, gateMap);

  for (const window of windows) {
    const windowChars = window.reduce((sum, t) => sum + t.content.length, 0);
    chars += windowChars;

    // Collect backbone signals for this window
    const signals = new Set<string>();
    for (const turn of window) {
      const gr = gateMap.get(turn.turnId);
      if (gr) {
        for (const s of gr.signals) {
          if (BACKBONE_SIGNALS.has(s)) signals.add(s);
        }
      }
    }

    if (signals.size === 0) {
      skipped.push(...window.map((t) => t.turnId));
      continue;
    }

    // Build prompt
    const prompt = buildPrompt(window, signals, opts.state, nextId);

    try {
      const response = await opts.provider(prompt);
      const parsed = parseResponse(response, window, nextId);
      candidates.push(...parsed.candidates);
      nextId = parsed.nextId;

      if (parsed.candidates.length === 0) {
        skipped.push(...window.map((t) => t.turnId));
      }
    } catch {
      // LLM failure → skip window, don't crash pipeline
      skipped.push(...window.map((t) => t.turnId));
    }
  }

  return { candidates, skippedTurns: skipped, charsProcessed: chars };
}

// ---------------------------------------------------------------------------
// Window building — batch adjacent gated turns
// ---------------------------------------------------------------------------

function buildWindows(turns: Turn[], gateMap: Map<string, EventGateResult>): Turn[][] {
  const windows: Turn[][] = [];
  let current: Turn[] = [];

  for (const turn of turns) {
    const gr = gateMap.get(turn.turnId);
    if (gr?.gated) {
      current.push(turn);
    } else {
      if (current.length > 0) {
        windows.push(current);
        current = [];
      }
    }
  }
  if (current.length > 0) windows.push(current);

  return windows;
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

function buildPrompt(
  window: Turn[],
  signals: Set<string>,
  state: ActiveContextState,
  nextId: number,
): string {
  const turnText = window
    .map((t) => `[${t.turnId}] ${t.role}: ${t.content}`)
    .join("\n");

  const stateSlice = buildStateSlice(state);
  const signalList = [...signals].join(", ");

  // Build target shortlists for revision-like signals — type-scoped
  let targetSection = "";
  if (signals.has("revision")) {
    const contentHint = window.map((t) => t.content).join(" ");
    const decisionTargets = buildTargetShortlist(state, "decision_revised", contentHint, 5);
    if (decisionTargets.length > 0) {
      targetSection += `\nDecision revision targets (active decisions only):\n${formatShortlistForPrompt(decisionTargets)}`;
    }
    const constraintTargets = buildTargetShortlist(state, "constraint_revised", contentHint, 5);
    if (constraintTargets.length > 0) {
      targetSection += `\nConstraint revision targets (active constraints only):\n${formatShortlistForPrompt(constraintTargets)}`;
    }
    const taskTargets = buildTargetShortlist(state, "task_closed", contentHint, 5);
    if (taskTargets.length > 0) {
      targetSection += `\nTask closure targets (active tasks):\n${formatShortlistForPrompt(taskTargets)}`;
    }
  }

  return `You are a structured extraction engine for a conversation memory system.

TASK: Extract typed state-change deltas from the transcript turns below.

BACKBONE DELTA KINDS (only emit these):
- goal_set: A clear project goal was stated. Fields: id, summary, confidence.
- decision_made: A firm decision was made (NOT speculation). Fields: id, summary, confidence.
- decision_revised: An existing DECISION was changed. Fields: targetId (must be a decision ID), summary, confidence.
- constraint_added: A requirement or restriction was stated. Fields: id, summary, hard (boolean).
- constraint_revised: An existing CONSTRAINT was relaxed, tightened, or amended. Fields: targetId (must be a constraint ID), summary, mode ("relaxed"|"tightened"|"amended").
- task_opened: A concrete work item was started. Fields: id, summary.
- task_closed: A task was completed. Fields: targetId, resolution.

TYPE-SCOPING RULE (critical):
- decision_revised MUST target a decision ID. If the change is to a constraint, use constraint_revised instead.
- constraint_revised MUST target a constraint ID. If the change is to a decision, use decision_revised instead.
- When "exception" or "allow" language modifies a constraint, use constraint_revised with mode "relaxed".

RULES (non-negotiable):
1. For ambiguous phrasing: prefer ABSTAIN over guessing. Emit nothing if uncertain.
2. Hedged language ("maybe", "probably", "I think", "not sure", "might", "could") is NOT a decision. Do NOT emit decision_made for hedged language. ABSTAIN instead.
3. Only emit decision_made when there is clear, firm commitment language ("let's use", "we'll go with", "decided on", "going with").
4. Confidence levels: "certain" (explicit commitment), "high" (strong but implicit), "medium" (reasonable inference), "low" (weak signal).
5. For decision_revised, you MUST reference an existing targetId from the shortlist below. If no target matches, ABSTAIN.
6. For task_closed, you MUST reference an existing targetId from the shortlist below. If no target matches, ABSTAIN.
7. Do NOT extract the same state change twice. If two turns say the same thing differently, emit ONE delta.
8. Use IDs like: g-${nextId}, d-${nextId}, c-${nextId}, task-${nextId} (incrementing).
9. sourceTurnIds must reference actual turn IDs from the transcript.

CURRENT STATE (what already exists — do not re-emit):
${stateSlice || "(empty)"}
${targetSection}

DETECTED SIGNALS: ${signalList}

TRANSCRIPT:
${turnText}

Respond with ONLY a JSON array of candidate deltas. Each element:
{
  "kind": "goal_set" | "decision_made" | "decision_revised" | "constraint_added" | "constraint_revised" | "task_opened" | "task_closed",
  "id": "string (for new items)",
  "targetId": "string (for revisions/closures, from shortlist)",
  "summary": "string",
  "confidence": "low" | "medium" | "high" | "certain",
  "hard": true/false (for constraints),
  "resolution": "string (for task_closed)",
  "sourceTurnIds": ["t-1", "t-2"],
  "reason": "why you extracted this"
}

If no meaningful state changes occurred, respond with: []
Do NOT explain. Only JSON.`;
}

function buildStateSlice(state: ActiveContextState): string {
  const items = [...state.items.values()]
    .filter((i) => i.status === "active" || i.status === "tentative")
    .slice(0, 20); // Cap to avoid bloating the prompt

  if (items.length === 0) return "";

  return items
    .map((i) => `  [${i.id}] (${i.kind}, ${i.status}) "${i.summary}"`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

function parseResponse(
  response: string,
  window: Turn[],
  startId: number,
): { candidates: CandidateDelta[]; nextId: number } {
  const candidates: CandidateDelta[] = [];
  let nextId = startId;

  // Extract JSON array from response (handle markdown code blocks)
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return { candidates: [], nextId };

  let parsed: RawLlmCandidate[];
  try {
    parsed = JSON.parse(jsonMatch[0]) as RawLlmCandidate[];
  } catch {
    return { candidates: [], nextId };
  }

  if (!Array.isArray(parsed)) return { candidates: [], nextId };

  const windowTurnIds = new Set(window.map((t) => t.turnId));

  for (const raw of parsed) {
    const delta = rawToDelta(raw, nextId, windowTurnIds);
    if (!delta) continue;

    // Validate sourceTurns reference actual window turns
    const validSources = (raw.sourceTurnIds ?? []).filter((id) => windowTurnIds.has(id));
    if (validSources.length === 0) continue;

    // Compute semantic ID from delta content
    const summaryText = raw.summary ?? raw.resolution ?? "";
    const itemKind = deltaKindToItemKind(raw.kind);
    const sid = summaryText ? computeSemanticId(itemKind, summaryText) : undefined;

    candidates.push({
      delta: delta.delta,
      evidence: {
        turnIds: validSources,
        snippets: validSources.map((id) => {
          const turn = window.find((t) => t.turnId === id);
          return turn ? turn.content.slice(0, 100) : "";
        }),
      },
      extractorConfidence: confidenceToNumber(raw.confidence ?? "medium"),
      extractorReason: raw.reason ?? `LLM extracted ${raw.kind}`,
      semanticId: sid,
    });

    nextId = delta.nextId;
  }

  return { candidates, nextId };
}

function rawToDelta(
  raw: RawLlmCandidate,
  nextId: number,
  windowTurnIds: Set<string>,
): { delta: MemoryDelta; nextId: number } | null {
  const ts = new Date().toISOString();
  const sourceTurns: SourceRef[] = (raw.sourceTurnIds ?? [])
    .filter((id) => windowTurnIds.has(id))
    .map((id) => ({ turnId: id }));

  if (sourceTurns.length === 0) return null;

  switch (raw.kind) {
    case "goal_set":
      if (!raw.summary) return null;
      return {
        delta: {
          kind: "goal_set",
          id: raw.id ?? `g-${nextId}`,
          summary: raw.summary,
          confidence: toConfidence(raw.confidence),
          sourceTurns,
          timestamp: ts,
        },
        nextId: nextId + 1,
      };

    case "decision_made":
      if (!raw.summary) return null;
      return {
        delta: {
          kind: "decision_made",
          id: raw.id ?? `d-${nextId}`,
          summary: raw.summary,
          confidence: toConfidence(raw.confidence),
          sourceTurns,
          timestamp: ts,
        },
        nextId: nextId + 1,
      };

    case "decision_revised":
      if (!raw.targetId || !raw.summary) return null;
      return {
        delta: {
          kind: "decision_revised",
          targetId: raw.targetId,
          summary: raw.summary,
          confidence: toConfidence(raw.confidence),
          sourceTurns,
          timestamp: ts,
        },
        nextId,
      };

    case "constraint_added":
      if (!raw.summary) return null;
      return {
        delta: {
          kind: "constraint_added",
          id: raw.id ?? `c-${nextId}`,
          summary: raw.summary,
          hard: raw.hard ?? false,
          sourceTurns,
          timestamp: ts,
        },
        nextId: nextId + 1,
      };

    case "constraint_revised":
      if (!raw.targetId || !raw.summary) return null;
      return {
        delta: {
          kind: "constraint_revised",
          targetId: raw.targetId,
          summary: raw.summary,
          mode: toConstraintMode(raw.mode),
          sourceTurns,
          timestamp: ts,
        },
        nextId,
      };

    case "task_opened":
      if (!raw.summary) return null;
      return {
        delta: {
          kind: "task_opened",
          id: raw.id ?? `task-${nextId}`,
          summary: raw.summary,
          sourceTurns,
          timestamp: ts,
        },
        nextId: nextId + 1,
      };

    case "task_closed":
      if (!raw.targetId || !raw.resolution) return null;
      return {
        delta: {
          kind: "task_closed",
          targetId: raw.targetId,
          resolution: raw.resolution,
          sourceTurns,
          timestamp: ts,
        },
        nextId,
      };

    default:
      return null; // Non-backbone kind — skip
  }
}

function toConfidence(raw: string | undefined): "low" | "medium" | "high" | "certain" {
  switch (raw) {
    case "certain": return "certain";
    case "high": return "high";
    case "medium": return "medium";
    case "low": return "low";
    default: return "medium";
  }
}

function toConstraintMode(raw: string | undefined): "relaxed" | "tightened" | "amended" {
  switch (raw) {
    case "relaxed": return "relaxed";
    case "tightened": return "tightened";
    case "amended": return "amended";
    default: return "amended";
  }
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

function confidenceToNumber(tier: string): number {
  switch (tier) {
    case "certain": return 0.95;
    case "high": return 0.8;
    case "medium": return 0.6;
    case "low": return 0.4;
    default: return 0.5;
  }
}

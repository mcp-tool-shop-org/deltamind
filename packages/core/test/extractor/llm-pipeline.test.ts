import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runLlmPipeline } from "../../src/extractor/llm-pipeline.js";
import { createMockProvider } from "../../src/extractor/llm-provider.js";
import { normalize } from "../../src/extractor/normalizer.js";
import { buildTargetShortlist, resolveTargetLexical } from "../../src/extractor/target-resolver.js";
import { createState } from "../../src/state.js";
import { reconcile } from "../../src/reconciler.js";
import type { Turn, CandidateDelta } from "../../src/extractor/types.js";
import type { MemoryDelta } from "../../src/types.js";
import { cleanLinear } from "../fixtures/clean-linear.js";
import type { TranscriptFixture } from "../harness/fixture-types.js";

// ---------------------------------------------------------------------------
// Mock LLM responses — simulate what a real LLM would return
// ---------------------------------------------------------------------------

/**
 * Clean-linear mock: all turns are gated → they form ONE big window.
 * The mock returns a single comprehensive response with all backbone deltas.
 */
const CLEAN_LINEAR_RESPONSES = [
  // Single window: all 9 turns (all gated, all adjacent)
  JSON.stringify([
    {
      kind: "goal_set",
      id: "g-1",
      summary: "Build a CLI tool for linting markdown files",
      confidence: "high",
      sourceTurnIds: ["t-1"],
      reason: "User stated clear project goal",
    },
    {
      kind: "decision_made",
      id: "d-1",
      summary: "Use TypeScript for the project",
      confidence: "certain",
      sourceTurnIds: ["t-1"],
      reason: "Explicit language choice: 'written in TypeScript'",
    },
    {
      kind: "constraint_added",
      id: "c-1",
      summary: "No runtime dependencies (zero-dep)",
      hard: true,
      sourceTurnIds: ["t-3"],
      reason: "User stated hard requirement",
    },
    {
      kind: "decision_made",
      id: "d-2",
      summary: "Use commander for CLI argument parsing",
      confidence: "high",
      sourceTurnIds: ["t-5"],
      reason: "User explicitly chose commander",
    },
    {
      kind: "task_opened",
      id: "task-1",
      summary: "Write core linting logic",
      sourceTurnIds: ["t-7"],
      reason: "Assistant began scaffold work",
    },
    {
      kind: "task_closed",
      targetId: "task-1",
      resolution: "Core linter done, approved by user",
      sourceTurnIds: ["t-8"],
      reason: "User confirmed done",
    },
    {
      kind: "task_opened",
      id: "task-2",
      summary: "Write tests for core linter",
      sourceTurnIds: ["t-8"],
      reason: "User requested tests",
    },
    {
      kind: "task_closed",
      targetId: "task-2",
      resolution: "14 test cases passing",
      sourceTurnIds: ["t-9"],
      reason: "Tests complete",
    },
  ]),
];

/**
 * Pathological mock: all 14 turns form one big window (all gated).
 * LLM correctly abstains on hedged turns, extracts firm decisions.
 */
const PATHOLOGICAL_RESPONSES = [
  JSON.stringify([
    {
      kind: "constraint_added",
      id: "c-1",
      summary: "Cache must handle at least 10k entries",
      hard: true,
      sourceTurnIds: ["t-4"],
      reason: "Hard requirement stated, t-5 is duplicate — extracted once",
    },
    {
      kind: "decision_made",
      id: "d-1",
      summary: "Cache layer is optional, feature-flagged",
      confidence: "high",
      sourceTurnIds: ["t-9"],
      reason: "User firmly decided to keep cache but make it optional",
    },
    {
      kind: "decision_made",
      id: "d-2",
      summary: "Use SQLite for desktop app",
      confidence: "certain",
      sourceTurnIds: ["t-13"],
      reason: "User committed: 'SQLite makes way more sense'",
    },
  ]),
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LLM pipeline (mock provider)", () => {
  describe("clean-linear — mock LLM extraction", () => {
    it("produces backbone deltas from mock LLM", async () => {
      const provider = createMockProvider(CLEAN_LINEAR_RESPONSES);
      const turns: Turn[] = cleanLinear.turns.map((t) => ({
        turnId: t.turnId,
        role: t.role,
        content: t.content,
      }));

      const result = await runLlmPipeline(turns, {
        provider,
        expectedDeltas: cleanLinear.expectedDeltas,
      });

      console.log("\n[LLM mock] clean-linear");
      console.log(`  Candidates: ${result.candidates.length} | Accepted: ${result.accepted.length} | Rejected: ${result.rejected.length}`);
      console.log(`  Scoreboard:`);
      console.log(`    Precision:           ${(result.scoreboard.precision * 100).toFixed(1)}%`);
      console.log(`    Recall:              ${(result.scoreboard.recall * 100).toFixed(1)}%`);
      console.log(`    Canonization errors: ${(result.scoreboard.prematureCanonizationRate * 100).toFixed(1)}%`);
      console.log(`    Bad targets:         ${(result.scoreboard.badTargetRate * 100).toFixed(1)}%`);
      console.log(`    Duplicate emissions: ${(result.scoreboard.duplicateEmissionRate * 100).toFixed(1)}%`);
      console.log(`    Rejection rate:      ${(result.scoreboard.reconcilerRejectionRate * 100).toFixed(1)}%`);

      assert.ok(result.accepted.length > 0, "Should have accepted candidates");
      assert.ok(result.scoreboard.precision >= 0.8, "Precision should be high");
    });

    it("detects goal, decisions, constraint, and tasks", async () => {
      const provider = createMockProvider(CLEAN_LINEAR_RESPONSES);
      const turns: Turn[] = cleanLinear.turns.map((t) => ({ turnId: t.turnId, role: t.role, content: t.content }));
      const result = await runLlmPipeline(turns, { provider });

      const kinds = new Set(result.accepted.map((a) => a.delta.kind));
      assert.ok(kinds.has("goal_set"), "Should detect goal");
      assert.ok(kinds.has("decision_made"), "Should detect decisions");
      assert.ok(kinds.has("constraint_added"), "Should detect constraint");
      assert.ok(kinds.has("task_opened"), "Should detect task opening");
      assert.ok(kinds.has("task_closed"), "Should detect task closing");
    });

    it("recall improves over rule-based baseline", async () => {
      const provider = createMockProvider(CLEAN_LINEAR_RESPONSES);
      const turns: Turn[] = cleanLinear.turns.map((t) => ({ turnId: t.turnId, role: t.role, content: t.content }));
      const result = await runLlmPipeline(turns, {
        provider,
        expectedDeltas: cleanLinear.expectedDeltas,
      });

      // Rule-based baseline was 36.4% recall on clean-linear
      // Mock LLM should beat that significantly
      assert.ok(
        result.scoreboard.recall > 0.36,
        `Recall should beat baseline 36%, got ${(result.scoreboard.recall * 100).toFixed(1)}%`,
      );
    });
  });

  describe("pathological — mock LLM respects hedging", () => {
    it("abstains on hedged language", async () => {
      const provider = createMockProvider(PATHOLOGICAL_RESPONSES);
      const turns: Turn[] = [
        { turnId: "t-1", role: "user", content: "We should probably use Redis for caching. Maybe. I'm not sure yet." },
        { turnId: "t-2", role: "assistant", content: "Redis is a solid option. We could also consider in-memory caching." },
        { turnId: "t-4", role: "user", content: "The cache layer needs to handle at least 10k entries." },
        { turnId: "t-5", role: "user", content: "We need the cache layer to support minimum 10,000 items." },
        { turnId: "t-9", role: "user", content: "No no, keep it. But make it optional. Feature-flagged." },
        { turnId: "t-13", role: "user", content: "Let's go with PostgreSQL. Wait — actually this is a desktop app, so SQLite makes way more sense." },
      ];

      const result = await runLlmPipeline(turns, { provider });

      console.log("\n[LLM mock] pathological (hedging)");
      console.log(`  Candidates: ${result.candidates.length} | Accepted: ${result.accepted.length}`);
      console.log(`  Canonization: ${(result.scoreboard.prematureCanonizationRate * 100).toFixed(1)}%`);

      // No decision_made should come from hedged t-1
      for (const c of result.accepted) {
        if (c.delta.kind === "decision_made") {
          const turnIds = c.evidence.turnIds;
          assert.ok(
            !turnIds.includes("t-1"),
            `Decision should not originate from hedged turn t-1`,
          );
        }
      }
    });

    it("zero canonization on mock pathological", async () => {
      const provider = createMockProvider(PATHOLOGICAL_RESPONSES);
      const { pathological } = await import("../fixtures/pathological.js");
      const turns: Turn[] = pathological.turns.map((t: { turnId: string; role: "user" | "assistant" | "system"; content: string }) => ({
        turnId: t.turnId,
        role: t.role,
        content: t.content,
      }));

      const result = await runLlmPipeline(turns, {
        provider,
        expectedDeltas: pathological.expectedDeltas,
      });

      assert.equal(
        result.scoreboard.prematureCanonizationRate,
        0,
        "Pathological should have zero canonization with well-behaved LLM",
      );
    });
  });
});

describe("Target resolver", () => {
  it("builds shortlist from active decisions", () => {
    const state = createState();
    const ts = new Date().toISOString();
    reconcile(state, [
      { kind: "decision_made", id: "d-1", summary: "Use TypeScript", confidence: "certain", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
      { kind: "decision_made", id: "d-2", summary: "Use commander for CLI", confidence: "high", sourceTurns: [{ turnId: "t-2" }], timestamp: ts },
    ]);

    const shortlist = buildTargetShortlist(state, "decision_revised", "change TypeScript to Rust", 5);
    assert.ok(shortlist.length > 0, "Should find candidates");
    assert.equal(shortlist[0].id, "d-1", "TypeScript decision should rank first");
  });

  it("resolves lexically against shortlist", () => {
    const shortlist = [
      { id: "d-1", kind: "decision" as const, summary: "Use TypeScript", status: "active" },
      { id: "d-2", kind: "decision" as const, summary: "Use commander for CLI", status: "active" },
    ];

    const resolved = resolveTargetLexical(shortlist, "switch TypeScript to Rust");
    assert.ok(resolved, "Should resolve a target");
    assert.equal(resolved!.targetId, "d-1");
  });

  it("returns null when no match", () => {
    const shortlist = [
      { id: "d-1", kind: "decision" as const, summary: "Use TypeScript", status: "active" },
    ];

    const resolved = resolveTargetLexical(shortlist, "unrelated bananas oranges");
    assert.equal(resolved, null, "Should not match unrelated content");
  });
});

describe("Normalizer", () => {
  it("deduplicates same-kind same-summary candidates", () => {
    const ts = new Date().toISOString();
    const candidates: CandidateDelta[] = [
      {
        delta: { kind: "decision_made", id: "d-1", summary: "Use TypeScript", confidence: "high", sourceTurns: [{ turnId: "t-1" }], timestamp: ts } as MemoryDelta,
        evidence: { turnIds: ["t-1"], snippets: ["use TypeScript"] },
        extractorConfidence: 0.8,
      },
      {
        delta: { kind: "decision_made", id: "d-2", summary: "Using TypeScript for the project", confidence: "high", sourceTurns: [{ turnId: "t-3" }], timestamp: ts } as MemoryDelta,
        evidence: { turnIds: ["t-3"], snippets: ["TypeScript project"] },
        extractorConfidence: 0.7,
      },
    ];

    const result = normalize(candidates);
    assert.equal(result.candidates.length, 1, "Should deduplicate to one");
    assert.equal(result.removed.length, 1, "Should remove one duplicate");
  });

  it("keeps genuinely different candidates", () => {
    const ts = new Date().toISOString();
    const candidates: CandidateDelta[] = [
      {
        delta: { kind: "decision_made", id: "d-1", summary: "Use TypeScript", confidence: "high", sourceTurns: [{ turnId: "t-1" }], timestamp: ts } as MemoryDelta,
        evidence: { turnIds: ["t-1"], snippets: ["TypeScript"] },
        extractorConfidence: 0.8,
      },
      {
        delta: { kind: "constraint_added", id: "c-1", summary: "No runtime dependencies", hard: true, sourceTurns: [{ turnId: "t-3" }], timestamp: ts } as MemoryDelta,
        evidence: { turnIds: ["t-3"], snippets: ["no deps"] },
        extractorConfidence: 0.85,
      },
    ];

    const result = normalize(candidates);
    assert.equal(result.candidates.length, 2, "Should keep both");
    assert.equal(result.removed.length, 0, "Should remove none");
  });

  it("deduplicates target-based (two revisions of same target)", () => {
    const ts = new Date().toISOString();
    const candidates: CandidateDelta[] = [
      {
        delta: { kind: "decision_revised", targetId: "d-1", summary: "Switch to Rust", sourceTurns: [{ turnId: "t-5" }], timestamp: ts } as MemoryDelta,
        evidence: { turnIds: ["t-5"], snippets: ["switch"] },
        extractorConfidence: 0.7,
      },
      {
        delta: { kind: "decision_revised", targetId: "d-1", summary: "Changed to Rust instead", sourceTurns: [{ turnId: "t-6" }], timestamp: ts } as MemoryDelta,
        evidence: { turnIds: ["t-6"], snippets: ["changed"] },
        extractorConfidence: 0.65,
      },
    ];

    const result = normalize(candidates);
    assert.equal(result.candidates.length, 1, "Should keep only one revision per target");
    assert.equal(result.removed.length, 1, "Should remove the duplicate revision");
  });
});

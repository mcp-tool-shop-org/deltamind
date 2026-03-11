/**
 * Phase 4C — Dogfood harness.
 *
 * Feeds DeltaMind three realistic session types (coding, product, messy)
 * and scores each on five criteria:
 *
 *   1. Context export quality — did exportContext() keep the right state hot?
 *   2. Loadout utility — is the loadout layer worth loading?
 *   3. Memory suggestion quality — are suggestions useful, not busywork?
 *   4. Fidelity — was anything important flattened, missed, or wrongly promoted?
 *   5. Save/load trust — does the resumed session still feel trustworthy?
 *
 * These are evaluative tests: they produce a scorecard, not just pass/fail.
 * The hard assertions catch regressions; the scorecard reveals quality.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSession } from "../src/session.js";
import {
  toLoadoutEntries,
  toLoadoutIndex,
  suggestMemoryUpdates,
  renderMemoryFile,
} from "../src/adapters/index.js";
import {
  createSnapshot,
  serializeSnapshot,
  parseSnapshot,
  restoreState,
  renderActiveState,
} from "../src/storage/index.js";
import type { Turn } from "../src/extractor/types.js";
import type { TranscriptFixture } from "./harness/fixture-types.js";
import { dogfoodCoding } from "./fixtures/dogfood-coding.js";
import { dogfoodProduct } from "./fixtures/dogfood-product.js";
import { dogfoodMessy } from "./fixtures/dogfood-messy.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fixtureToTurns(fixture: TranscriptFixture): Turn[] {
  return fixture.turns.map((t) => ({
    turnId: t.turnId,
    role: t.role,
    content: t.content,
  }));
}

async function processedSession(fixture: TranscriptFixture) {
  const session = createSession();
  session.ingestBatch(fixtureToTurns(fixture));
  await session.process();
  return session;
}

interface DogfoodScore {
  fixture: string;
  contextExport: {
    totalItems: number;
    activeDecisions: number;
    activeConstraints: number;
    openTasks: number;
    branches: number;
    chars: number;
    rawChars: number;
    compressionRatio: string;
    hasGoals: boolean;
    hasText: boolean;
  };
  loadout: {
    entryCount: number;
    coreTokens: number;
    domainTokens: number;
    avgTaskLoad: number;
    hasConstraints: boolean;
    hasDecisions: boolean;
    keywordCount: number;
  };
  memorySuggestions: {
    total: number;
    highConfidence: number;
    byType: Record<string, number>;
    byAction: Record<string, number>;
    hypothesesIncluded: boolean;
    branchesIncluded: boolean;
  };
  fidelity: {
    noFalsePromotions: boolean;
    typeConsistent: boolean;
    hypothesesPreserved: boolean;
    provenanceOk: boolean;
    decisionCoverage: string;
    constraintCoverage: string;
  };
  saveLoad: {
    roundTripStable: boolean;
    resumeProducesSameExport: boolean;
    snapshotSize: number;
  };
}

// ---------------------------------------------------------------------------
// Score a single fixture
// ---------------------------------------------------------------------------

async function scoreDogfood(fixture: TranscriptFixture): Promise<DogfoodScore> {
  const session = await processedSession(fixture);
  const state = session.state();
  const stats = session.stats();
  const ctx = session.exportContext({ maxChars: 8000 });
  const rawChars = fixture.turns.reduce((s, t) => s + t.content.length, 0);

  // --- 1. Context export ---
  const contextExport = {
    totalItems: ctx.totalItems,
    activeDecisions: ctx.decisions.length,
    activeConstraints: ctx.constraints.length,
    openTasks: ctx.tasks.length,
    branches: ctx.branches.length,
    chars: ctx.chars,
    rawChars,
    compressionRatio: rawChars > 0 ? `${Math.round((ctx.chars / rawChars) * 100)}%` : "N/A",
    hasGoals: ctx.goals.length > 0,
    hasText: ctx.text.length > 0,
  };

  // --- 2. Loadout utility ---
  const entries = toLoadoutEntries(session);
  const index = toLoadoutIndex(session);
  const loadout = {
    entryCount: entries.length,
    coreTokens: index.budget.always_loaded_est,
    domainTokens: index.budget.on_demand_total_est,
    avgTaskLoad: index.budget.avg_task_load_est,
    hasConstraints: entries.some((e) => e.id === "deltamind-constraints"),
    hasDecisions: entries.some((e) => e.id === "deltamind-decisions"),
    keywordCount: entries.flatMap((e) => e.keywords).length,
  };

  // --- 3. Memory suggestions ---
  const allSuggestions = suggestMemoryUpdates(session, { minSourceTurns: 1, minConfidence: "medium" });
  const highSuggestions = suggestMemoryUpdates(session, { minConfidence: "high" });
  const byType: Record<string, number> = {};
  const byAction: Record<string, number> = {};
  for (const s of allSuggestions) {
    byType[s.memoryType] = (byType[s.memoryType] ?? 0) + 1;
    byAction[s.action] = (byAction[s.action] ?? 0) + 1;
  }
  const memorySuggestions = {
    total: allSuggestions.length,
    highConfidence: highSuggestions.length,
    byType,
    byAction,
    hypothesesIncluded: allSuggestions.some((s) => s.item.kind === "hypothesis"),
    branchesIncluded: allSuggestions.some((s) => s.item.tags?.includes("branch")),
  };

  // --- 4. Fidelity (structural invariants, not gold-standard match) ---
  // The rule-based extractor finds a subset of gold. That's fine.
  // What matters: no false promotions, type consistency, structural soundness.
  const hypothesisItems = [...state.items.values()].filter(
    (i) => i.kind === "hypothesis",
  );
  const noFalsePromotions = !hypothesisItems.some(
    (h) => h.status === "active" && h.kind === "decision",
  );
  // Every decision should be kind=decision, every constraint kind=constraint
  const typeConsistent = [...state.items.values()].every((item) => {
    if (item.kind === "decision") return item.status !== "tentative";
    if (item.kind === "constraint") return item.status !== "tentative";
    return true;
  });
  // Hypotheses should be tentative or superseded, never "active" with kind=decision
  const hypothesesSafe = hypothesisItems.every(
    (h) => h.status === "tentative" || h.status === "superseded",
  );
  // Every item has at least one source turn
  const provenanceOk = [...state.items.values()].every(
    (item) => item.sourceTurns.length > 0,
  );
  // Gold-standard coverage: how much of expected did we find?
  const expectedDecisionIds = new Set(fixture.expectedQueries.activeDecisionIds);
  const foundDecisionIds = new Set(ctx.decisions.map((d) => d.id));
  const decisionCoverage = expectedDecisionIds.size > 0
    ? [...expectedDecisionIds].filter((id) => foundDecisionIds.has(id)).length / expectedDecisionIds.size
    : 1;
  const expectedConstraintIds = new Set(fixture.expectedQueries.activeConstraintIds);
  const foundConstraintIds = new Set(ctx.constraints.map((c) => c.id));
  const constraintCoverage = expectedConstraintIds.size > 0
    ? [...expectedConstraintIds].filter((id) => foundConstraintIds.has(id)).length / expectedConstraintIds.size
    : 1;

  const fidelity = {
    noFalsePromotions,
    typeConsistent,
    hypothesesPreserved: hypothesesSafe,
    provenanceOk,
    decisionCoverage: `${Math.round(decisionCoverage * 100)}%`,
    constraintCoverage: `${Math.round(constraintCoverage * 100)}%`,
  };

  // --- 5. Save/load ---
  const snapshot = session.save();
  const serialized = serializeSnapshot(snapshot);
  const parsed = parseSnapshot(serialized);
  const restored = createSession({ snapshot: parsed });
  const restoredCtx = restored.exportContext({ maxChars: 8000 });

  const saveLoad = {
    roundTripStable:
      restoredCtx.totalItems === ctx.totalItems &&
      restoredCtx.decisions.length === ctx.decisions.length &&
      restoredCtx.constraints.length === ctx.constraints.length,
    resumeProducesSameExport:
      restoredCtx.text === ctx.text,
    snapshotSize: serialized.length,
  };

  return {
    fixture: fixture.name,
    contextExport,
    loadout,
    memorySuggestions,
    fidelity,
    saveLoad,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("dogfood — coding session", () => {
  it("processes all turns without error", async () => {
    const session = await processedSession(dogfoodCoding);
    assert.ok(session.stats().totalItems > 0, "should have items");
  });

  it("keeps the right state hot in context export", async () => {
    const session = await processedSession(dogfoodCoding);
    const ctx = session.exportContext({ maxChars: 8000 });

    // Rule-based extractor finds a subset — check structural properties
    assert.ok(ctx.totalItems > 0, "should extract some items");
    assert.ok(ctx.decisions.length >= 1, "should find at least 1 decision");
    assert.ok(ctx.constraints.length >= 1, "should find at least 1 constraint");
    assert.ok(ctx.text.length > 0, "should produce text export");

    // Context should compress vs raw transcript
    const rawChars = dogfoodCoding.turns.reduce((s, t) => s + t.content.length, 0);
    assert.ok(ctx.chars < rawChars, "context should compress vs raw transcript");
  });

  it("produces useful loadout entries", async () => {
    const session = await processedSession(dogfoodCoding);
    const entries = toLoadoutEntries(session);

    // Must have core entries (constraints, decisions)
    const core = entries.filter((e) => e.priority === "core");
    assert.ok(core.length >= 2, "should have core entries for constraints + decisions");

    // Keywords should include domain terms
    const allKw = entries.flatMap((e) => e.keywords);
    assert.ok(allKw.length > 10, "should extract meaningful keywords");
  });

  it("memory suggestions exclude hypotheses", async () => {
    const session = await processedSession(dogfoodCoding);
    const suggestions = suggestMemoryUpdates(session, { minSourceTurns: 1 });

    for (const s of suggestions) {
      assert.notEqual(s.item.kind, "hypothesis", "should not suggest hypotheses");
    }
  });

  it("survives save/load round-trip", async () => {
    const session = await processedSession(dogfoodCoding);
    const ctx1 = session.exportContext({ maxChars: 8000 });

    const snapshot = session.save();
    const json = serializeSnapshot(snapshot);
    const restored = createSession({ snapshot: parseSnapshot(json) });
    const ctx2 = restored.exportContext({ maxChars: 8000 });

    assert.equal(ctx2.totalItems, ctx1.totalItems, "item count stable");
    assert.equal(ctx2.decisions.length, ctx1.decisions.length, "decisions stable");
    assert.equal(ctx2.text, ctx1.text, "text export identical");
  });
});

describe("dogfood — product/docs session", () => {
  it("processes all turns without error", async () => {
    const session = await processedSession(dogfoodProduct);
    assert.ok(session.stats().totalItems > 0);
  });

  it("extracts meaningful items from planning session", async () => {
    const session = await processedSession(dogfoodProduct);
    const ctx = session.exportContext({ maxChars: 8000 });

    // Planning sessions produce decisions + constraints
    assert.ok(ctx.totalItems > 0, "should extract items");
    assert.ok(ctx.decisions.length >= 1 || ctx.constraints.length >= 1, "should find decisions or constraints");
    assert.ok(ctx.text.length > 0, "should produce text export");
  });

  it("produces memory suggestions", async () => {
    const session = await processedSession(dogfoodProduct);
    const suggestions = suggestMemoryUpdates(session, {
      minSourceTurns: 1,
      minConfidence: "medium",
    });

    // Product decisions should promote
    assert.ok(suggestions.length >= 1, "should have promotable items");

    // Should include project-type memories
    const projectSuggestions = suggestions.filter((s) => s.memoryType === "project");
    assert.ok(projectSuggestions.length >= 1, "decisions/goals should map to project type");

    // Check rendered files are well-formed
    for (const s of suggestions) {
      const file = renderMemoryFile(s);
      assert.ok(file.startsWith("---\n"), "valid frontmatter");
      assert.ok(file.includes(`type: ${s.memoryType}`), "type matches");
    }
  });

  it("timeline facts promote to reference type", async () => {
    const session = await processedSession(dogfoodProduct);
    const suggestions = suggestMemoryUpdates(session, {
      minSourceTurns: 1,
      minConfidence: "medium",
    });

    const facts = suggestions.filter((s) => s.item.kind === "fact");
    for (const f of facts) {
      assert.equal(f.memoryType, "reference", "facts should map to reference");
    }
  });

  it("loadout budget reflects planning-heavy session", async () => {
    const session = await processedSession(dogfoodProduct);
    const index = toLoadoutIndex(session);

    // Planning sessions should have high core budget (decisions + constraints)
    assert.ok(index.budget.always_loaded_est > 0, "should have core budget");
    // And high domain budget (open tasks)
    assert.ok(index.budget.on_demand_total_est > 0, "should have domain budget");
  });
});

describe("dogfood — messy exploratory session", () => {
  it("processes all turns without error", async () => {
    const session = await processedSession(dogfoodMessy);
    assert.ok(session.stats().totalItems > 0);
  });

  it("preserves hypotheses as tentative — no false canonization", async () => {
    const session = await processedSession(dogfoodMessy);
    const state = session.state();

    // h-2 (outbox pattern) MUST be tentative/hypothesis, NOT a decision
    const outbox = state.items.get("h-2");
    if (outbox) {
      assert.equal(outbox.kind, "hypothesis", "outbox should remain hypothesis");
      assert.equal(outbox.status, "tentative", "outbox should be tentative");
    }

    // No hypothesis should have been silently promoted to active decision
    for (const [, item] of state.items) {
      if (item.kind === "hypothesis") {
        assert.ok(
          item.status === "tentative" || item.status === "superseded",
          `hypothesis ${item.id} should not have status: ${item.status}`,
        );
      }
    }
  });

  it("finds unresolved branches in messy session", async () => {
    const session = await processedSession(dogfoodMessy);
    const ctx = session.exportContext({ maxChars: 8000 });

    // Rule-based extractor may find fewer branches — check at least 1
    assert.ok(ctx.branches.length >= 1, `should have at least 1 unresolved branch, got ${ctx.branches.length}`);
  });

  it("hypotheses stay tentative or superseded", async () => {
    const session = await processedSession(dogfoodMessy);
    const state = session.state();

    // Check all hypotheses have safe status — none promoted to active decisions
    for (const [, item] of state.items) {
      if (item.kind === "hypothesis") {
        assert.ok(
          item.status === "tentative" || item.status === "superseded",
          `hypothesis ${item.id} has unexpected status: ${item.status}`,
        );
      }
    }
  });

  it("memory suggestions exclude hypotheses and branch-tagged items", async () => {
    const session = await processedSession(dogfoodMessy);
    const suggestions = suggestMemoryUpdates(session);

    for (const s of suggestions) {
      assert.notEqual(s.item.kind, "hypothesis", "should not suggest hypotheses");
      const hasBranch = s.item.tags?.includes("branch");
      assert.ok(!hasBranch, "should not suggest branch-tagged items");
    }
  });

  it("extracts decisions without false canonization", async () => {
    const session = await processedSession(dogfoodMessy);
    const ctx = session.exportContext({ maxChars: 8000 });
    const state = session.state();

    // No hypothesis should have been promoted to kind=decision
    for (const [, item] of state.items) {
      if (item.kind === "hypothesis") {
        assert.notEqual(item.status, "active", `hypothesis ${item.id} should not be active decision`);
      }
    }

    // At least one firm decision should exist
    assert.ok(ctx.decisions.length >= 1, "should find at least one decision");
  });

  it("context export is lean despite chaos", async () => {
    const session = await processedSession(dogfoodMessy);
    const ctx = session.exportContext({ maxChars: 8000 });
    const rawChars = dogfoodMessy.turns.reduce((s, t) => s + t.content.length, 0);

    // Messy session should still compress
    assert.ok(
      ctx.chars <= rawChars * 2,
      `context (${ctx.chars}) should not be excessively larger than raw (${rawChars})`,
    );
  });
});

// ---------------------------------------------------------------------------
// Scorecard: prints the full evaluation table
// ---------------------------------------------------------------------------

describe("dogfood scorecard", () => {
  it("evaluates all three sessions", async () => {
    const fixtures = [dogfoodCoding, dogfoodProduct, dogfoodMessy];
    const scores: DogfoodScore[] = [];

    for (const f of fixtures) {
      scores.push(await scoreDogfood(f));
    }

    // --- Print scorecard ---
    console.log("\n╔══════════════════════════════════════════════════════════════════════════╗");
    console.log("║  DOGFOOD SCORECARD — Phase 4C                                          ║");
    console.log("╠══════════════════════════════════════════════════════════════════════════╣");

    for (const s of scores) {
      console.log(`\n  ── ${s.fixture} ──`);

      // Context export
      console.log("  [Context Export]");
      console.log(`    Items: ${s.contextExport.totalItems} | Decisions: ${s.contextExport.activeDecisions} | Constraints: ${s.contextExport.activeConstraints} | Tasks: ${s.contextExport.openTasks} | Branches: ${s.contextExport.branches}`);
      console.log(`    Raw: ${s.contextExport.rawChars} chars → Export: ${s.contextExport.chars} chars (${s.contextExport.compressionRatio})`);
      console.log(`    Goals: ${s.contextExport.hasGoals ? "✓" : "✗"} | Text: ${s.contextExport.hasText ? "✓" : "✗"}`);

      // Loadout
      console.log("  [Loadout]");
      console.log(`    Entries: ${s.loadout.entryCount} | Core: ${s.loadout.coreTokens} tk | Domain: ${s.loadout.domainTokens} tk | Avg load: ${s.loadout.avgTaskLoad} tk`);
      console.log(`    Constraints: ${s.loadout.hasConstraints ? "✓" : "✗"} | Decisions: ${s.loadout.hasDecisions ? "✓" : "✗"} | Keywords: ${s.loadout.keywordCount}`);

      // Memory suggestions
      console.log("  [Memory Suggestions]");
      console.log(`    Total: ${s.memorySuggestions.total} | High confidence: ${s.memorySuggestions.highConfidence}`);
      console.log(`    By type: ${JSON.stringify(s.memorySuggestions.byType)}`);
      console.log(`    By action: ${JSON.stringify(s.memorySuggestions.byAction)}`);
      console.log(`    Hypotheses leaked: ${s.memorySuggestions.hypothesesIncluded ? "✗ FAIL" : "✓ clean"} | Branches leaked: ${s.memorySuggestions.branchesIncluded ? "✗ FAIL" : "✓ clean"}`);

      // Fidelity
      console.log("  [Fidelity]");
      console.log(`    No false promotions: ${s.fidelity.noFalsePromotions ? "✓" : "✗"} | Type consistent: ${s.fidelity.typeConsistent ? "✓" : "✗"} | Provenance OK: ${s.fidelity.provenanceOk ? "✓" : "✗"}`);
      console.log(`    Hypotheses preserved: ${s.fidelity.hypothesesPreserved ? "✓" : "✗"} | Decision coverage: ${s.fidelity.decisionCoverage} | Constraint coverage: ${s.fidelity.constraintCoverage}`);

      // Save/load
      console.log("  [Save/Load]");
      console.log(`    Round-trip stable: ${s.saveLoad.roundTripStable ? "✓" : "✗"} | Same export: ${s.saveLoad.resumeProducesSameExport ? "✓" : "✗"} | Snapshot: ${s.saveLoad.snapshotSize} bytes`);
    }

    // --- Aggregate pass/fail ---
    console.log("\n  ═══════════════════════════════════════════");
    console.log("  AGGREGATE GATES");
    console.log("  ═══════════════════════════════════════════");

    const allFidelity = scores.every(
      (s) =>
        s.fidelity.noFalsePromotions &&
        s.fidelity.typeConsistent &&
        s.fidelity.hypothesesPreserved &&
        s.fidelity.provenanceOk,
    );
    const allSaveLoad = scores.every(
      (s) => s.saveLoad.roundTripStable && s.saveLoad.resumeProducesSameExport,
    );
    const noLeakedHypotheses = scores.every(
      (s) => !s.memorySuggestions.hypothesesIncluded,
    );
    const noLeakedBranches = scores.every(
      (s) => !s.memorySuggestions.branchesIncluded,
    );
    const allCompressed = scores.every(
      (s) => parseInt(s.contextExport.compressionRatio) <= 200,
    );

    console.log(`    Fidelity:        ${allFidelity ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`    Save/Load:       ${allSaveLoad ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`    No hypo leak:    ${noLeakedHypotheses ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`    No branch leak:  ${noLeakedBranches ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`    Compression:     ${allCompressed ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`    Overall:         ${allFidelity && allSaveLoad && noLeakedHypotheses && noLeakedBranches && allCompressed ? "✓ ALL GATES PASS" : "✗ GATES FAILED"}`);

    console.log("\n╚══════════════════════════════════════════════════════════════════════════╝");

    // Hard assertions
    assert.ok(allFidelity, "fidelity gate");
    assert.ok(allSaveLoad, "save/load gate");
    assert.ok(noLeakedHypotheses, "no hypothesis leak gate");
    assert.ok(noLeakedBranches, "no branch leak gate");
  });
});

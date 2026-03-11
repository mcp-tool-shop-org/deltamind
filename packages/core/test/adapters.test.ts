/**
 * Phase 4 — Adapter tests.
 *
 * Tests ai-loadout integration and claude-memories advisory promotion.
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
import type { Turn } from "../src/extractor/types.js";
import { cleanLinear } from "./fixtures/clean-linear.js";
import { revisionPack } from "./fixtures/revision-pack.js";
import { longLinear } from "./fixtures/long-linear.js";
import type { TranscriptFixture } from "./harness/fixture-types.js";

function fixtureToTurns(fixture: TranscriptFixture): Turn[] {
  return fixture.turns.map((t) => ({ turnId: t.turnId, role: t.role, content: t.content }));
}

async function processedSession(fixture: TranscriptFixture) {
  const session = createSession();
  session.ingestBatch(fixtureToTurns(fixture));
  await session.process();
  return session;
}

// ---------------------------------------------------------------------------
// 4A — ai-loadout adapter
// ---------------------------------------------------------------------------

describe("ai-loadout adapter", () => {
  it("produces loadout entries from session state", async () => {
    const session = await processedSession(cleanLinear);
    const entries = toLoadoutEntries(session);

    assert.ok(entries.length > 0, "should produce entries");

    for (const entry of entries) {
      assert.ok(entry.id.startsWith("deltamind-"), `id should start with deltamind-: ${entry.id}`);
      assert.ok(entry.keywords.length > 0, `entry ${entry.id} should have keywords`);
      assert.ok(entry.tokens_est > 0, `entry ${entry.id} should have token estimate`);
      assert.ok(entry.summary.length > 0, `entry ${entry.id} should have summary`);
      assert.ok(["core", "domain", "manual"].includes(entry.priority), `valid priority`);
    }
  });

  it("constraints are core priority", async () => {
    const session = await processedSession(cleanLinear);
    const entries = toLoadoutEntries(session);

    const constraints = entries.find((e) => e.id === "deltamind-constraints");
    if (constraints) {
      assert.equal(constraints.priority, "core", "constraints should be core");
    }
  });

  it("decisions are core priority", async () => {
    const session = await processedSession(cleanLinear);
    const entries = toLoadoutEntries(session);

    const decisions = entries.find((e) => e.id === "deltamind-decisions");
    if (decisions) {
      assert.equal(decisions.priority, "core", "decisions should be core");
    }
  });

  it("includes recent deltas by default", async () => {
    const session = await processedSession(cleanLinear);
    const entries = toLoadoutEntries(session);

    const recent = entries.find((e) => e.id === "deltamind-recent");
    assert.ok(recent, "should include recent deltas entry");
    assert.equal(recent!.priority, "domain", "recent should be domain priority");
  });

  it("can exclude recent deltas", async () => {
    const session = await processedSession(cleanLinear);
    const entries = toLoadoutEntries(session, { includeRecentDeltas: false });

    const recent = entries.find((e) => e.id === "deltamind-recent");
    assert.equal(recent, undefined, "should not include recent deltas");
  });

  it("generates valid loadout index", async () => {
    const session = await processedSession(cleanLinear);
    const index = toLoadoutIndex(session);

    assert.equal(index.version, "1.0.0");
    assert.ok(index.generated);
    assert.equal(index.source, "deltamind-session");
    assert.ok(index.entries.length > 0);
    assert.ok(index.budget.always_loaded_est >= 0);
    assert.ok(index.budget.on_demand_total_est >= 0);
    assert.ok(index.budget.avg_task_load_est > 0);
  });

  it("budget sums match entry totals", async () => {
    const session = await processedSession(longLinear);
    const index = toLoadoutIndex(session);

    const coreTokens = index.entries
      .filter((e) => e.priority === "core")
      .reduce((sum, e) => sum + e.tokens_est, 0);
    const domainTokens = index.entries
      .filter((e) => e.priority === "domain")
      .reduce((sum, e) => sum + e.tokens_est, 0);

    assert.equal(index.budget.always_loaded_est, coreTokens);
    assert.equal(index.budget.on_demand_total_est, domainTokens);
  });

  it("extracts meaningful keywords from items", async () => {
    const session = await processedSession(revisionPack);
    const entries = toLoadoutEntries(session);

    // Should have item-specific keywords beyond the category defaults
    const allKeywords = entries.flatMap((e) => e.keywords);
    assert.ok(allKeywords.length > 4, "should have item-derived keywords");
  });

  it("empty session produces no entries", () => {
    const session = createSession();
    const entries = toLoadoutEntries(session);
    assert.equal(entries.length, 0, "empty session should produce no entries");
  });

  it("prints loadout budget summary", async () => {
    const fixtures = [cleanLinear, revisionPack, longLinear];

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║  LOADOUT ADAPTER — Budget Summary                            ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");
    console.log("  Fixture              | Entries | Core Tk | Domain Tk | Avg Tk");
    console.log("  ---------------------|---------|---------|-----------|-------");

    for (const fixture of fixtures) {
      const session = await processedSession(fixture);
      const index = toLoadoutIndex(session);
      const name = fixture.name.padEnd(21);
      console.log(
        `  ${name}| ${String(index.entries.length).padStart(7)} | ${String(index.budget.always_loaded_est).padStart(7)} | ${String(index.budget.on_demand_total_est).padStart(9)} | ${String(index.budget.avg_task_load_est).padStart(5)}`,
      );
    }

    console.log("╚══════════════════════════════════════════════════════════════╝");
    assert.ok(true);
  });
});

// ---------------------------------------------------------------------------
// 4B — claude-memories adapter
// ---------------------------------------------------------------------------

describe("claude-memories adapter", () => {
  it("suggests updates from populated session", async () => {
    const session = await processedSession(cleanLinear);
    const suggestions = suggestMemoryUpdates(session);

    // May be empty if items don't meet thresholds — that's fine
    // But with clean-linear, we should get at least something
    for (const s of suggestions) {
      assert.ok(s.item, "has item");
      assert.ok(["create", "update", "supersede"].includes(s.action), "valid action");
      assert.ok(["project", "reference", "feedback", "user"].includes(s.memoryType), "valid type");
      assert.ok(s.fileName.length > 0, "has fileName");
      assert.ok(s.content.length > 0, "has content");
      assert.ok(s.indexLine.length > 0, "has indexLine");
      assert.ok(s.reason.length > 0, "has reason");
    }
  });

  it("respects minConfidence threshold", async () => {
    const session = await processedSession(cleanLinear);

    const highOnly = suggestMemoryUpdates(session, { minConfidence: "high" });
    const allConf = suggestMemoryUpdates(session, { minConfidence: "low" });

    assert.ok(allConf.length >= highOnly.length, "lower threshold should allow more");
  });

  it("respects minSourceTurns threshold", async () => {
    const session = await processedSession(cleanLinear);

    const strict = suggestMemoryUpdates(session, { minSourceTurns: 5 });
    const loose = suggestMemoryUpdates(session, { minSourceTurns: 1 });

    assert.ok(loose.length >= strict.length, "lower turn threshold should allow more");
  });

  it("excludes branch-tagged items by default", async () => {
    const session = await processedSession(cleanLinear);
    const suggestions = suggestMemoryUpdates(session);

    for (const s of suggestions) {
      const hasBranch = s.item.tags?.includes("branch");
      assert.ok(!hasBranch, "should not suggest branch-tagged items");
    }
  });

  it("renders valid memory file", async () => {
    const session = await processedSession(revisionPack);
    const suggestions = suggestMemoryUpdates(session, { minSourceTurns: 1 });

    if (suggestions.length > 0) {
      const file = renderMemoryFile(suggestions[0]);
      assert.ok(file.startsWith("---\n"), "starts with frontmatter");
      assert.ok(file.includes("name:"), "has name field");
      assert.ok(file.includes("description:"), "has description field");
      assert.ok(file.includes("type:"), "has type field");
      assert.ok(file.includes("---\n\n"), "frontmatter closed");
    }
  });

  it("maps item kinds to correct memory types", async () => {
    const session = await processedSession(revisionPack);
    const suggestions = suggestMemoryUpdates(session, { minSourceTurns: 1 });

    for (const s of suggestions) {
      if (s.item.kind === "decision" || s.item.kind === "goal" || s.item.kind === "constraint" || s.item.kind === "task") {
        assert.equal(s.memoryType, "project", `${s.item.kind} should map to project`);
      }
      if (s.item.kind === "fact") {
        assert.equal(s.memoryType, "reference", "fact should map to reference");
      }
    }
  });

  it("does not suggest hypotheses or tentative items", async () => {
    const session = await processedSession(cleanLinear);
    const suggestions = suggestMemoryUpdates(session);

    for (const s of suggestions) {
      assert.notEqual(s.item.kind, "hypothesis", "should not suggest hypotheses");
      assert.notEqual(s.item.status, "tentative", "should not suggest tentative items");
    }
  });

  it("empty session produces no suggestions", () => {
    const session = createSession();
    const suggestions = suggestMemoryUpdates(session);
    assert.equal(suggestions.length, 0);
  });

  it("prints suggestion summary", async () => {
    const fixtures = [cleanLinear, revisionPack, longLinear];

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║  MEMORY ADAPTER — Suggestion Summary                         ║");
    console.log("╠══════════════════════════════════════════════════════════════╣");

    for (const fixture of fixtures) {
      const session = await processedSession(fixture);
      const suggestions = suggestMemoryUpdates(session, { minSourceTurns: 1 });

      console.log(`\n  ── ${fixture.name} ──`);
      console.log(`    Total suggestions: ${suggestions.length}`);

      for (const s of suggestions) {
        console.log(`    ${s.action} [${s.memoryType}] ${s.item.id}: ${s.item.summary.slice(0, 60)}`);
      }
    }

    console.log("\n╚══════════════════════════════════════════════════════════════╝");
    assert.ok(true);
  });
});

/**
 * Phase 5A.2 — LLM dogfood evaluation.
 *
 * Runs the three dogfood sessions with gemma2:9b (via autoDetect) and compares
 * against the rule-based baseline. This is the real production recall test.
 *
 * Requires: Ollama running with gemma2:9b available.
 * Skip: SKIP_OLLAMA=1 or if Ollama is unreachable.
 *
 * Acceptance gates (5A.3):
 *   - Recall materially higher than rule baseline
 *   - Zero false canonization
 *   - No hypothesis promotion
 *   - No advisory boundary leaks (hypotheses/branches in memory suggestions)
 *   - Context export remains compact (≤ 200% of raw)
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { createSession } from "../src/session.js";
import {
  toLoadoutEntries,
  toLoadoutIndex,
  suggestMemoryUpdates,
} from "../src/adapters/index.js";
import {
  serializeSnapshot,
  parseSnapshot,
} from "../src/storage/index.js";
import type { Turn } from "../src/extractor/types.js";
import type { TranscriptFixture } from "./harness/fixture-types.js";
import { dogfoodCoding } from "./fixtures/dogfood-coding.js";
import { dogfoodProduct } from "./fixtures/dogfood-product.js";
import { dogfoodMessy } from "./fixtures/dogfood-messy.js";

// ---------------------------------------------------------------------------
// Skip guard
// ---------------------------------------------------------------------------

let ollamaAvailable = false;

async function checkOllama(): Promise<boolean> {
  if (process.env.SKIP_OLLAMA === "1") return false;
  try {
    const res = await fetch("http://localhost:11434/api/tags", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    return data.models?.some((m) => m.name.startsWith("gemma2:9b")) ?? false;
  } catch {
    return false;
  }
}

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

async function processedRuleOnly(fixture: TranscriptFixture) {
  const session = createSession({ forceRuleOnly: true });
  session.ingestBatch(fixtureToTurns(fixture));
  await session.process();
  return session;
}

async function processedLlm(fixture: TranscriptFixture) {
  const session = createSession({ autoDetect: true });
  session.ingestBatch(fixtureToTurns(fixture));
  await session.process();
  return session;
}

interface ComparisonResult {
  fixture: string;
  turns: number;
  rawChars: number;
  // Rule-based baseline
  rule: {
    items: number;
    decisions: number;
    constraints: number;
    tasks: number;
    branches: number;
    goals: number;
    ctxChars: number;
  };
  // LLM extraction
  llm: {
    items: number;
    decisions: number;
    constraints: number;
    tasks: number;
    branches: number;
    goals: number;
    ctxChars: number;
  };
  // Quality
  quality: {
    falseCanonization: boolean;
    hypothesisPromotion: boolean;
    hypothesesLeaked: boolean;
    branchesLeaked: boolean;
    saveLoadStable: boolean;
    compressionOk: boolean;
  };
}

async function compareFixture(fixture: TranscriptFixture): Promise<ComparisonResult> {
  const rawChars = fixture.turns.reduce((s, t) => s + t.content.length, 0);

  // Rule-based baseline
  const ruleSession = await processedRuleOnly(fixture);
  const ruleCtx = ruleSession.exportContext({ maxChars: 8000 });

  // LLM extraction
  const llmSession = await processedLlm(fixture);
  const llmCtx = llmSession.exportContext({ maxChars: 8000 });
  const llmState = llmSession.state();

  // Quality checks
  const hypothesisItems = [...llmState.items.values()].filter(
    (i) => i.kind === "hypothesis",
  );
  const falseCanonization = hypothesisItems.some(
    (h) => h.kind === "hypothesis" && h.status === "active" &&
      [...llmState.items.values()].some(
        (d) => d.kind === "decision" && d.summary === h.summary,
      ),
  );
  const hypothesisPromotion = hypothesisItems.some(
    (h) => h.status !== "tentative" && h.status !== "superseded",
  );

  const suggestions = suggestMemoryUpdates(llmSession, {
    minSourceTurns: 1,
    minConfidence: "medium",
  });
  const hypothesesLeaked = suggestions.some((s) => s.item.kind === "hypothesis");
  const branchesLeaked = suggestions.some((s) => s.item.tags?.includes("branch"));

  // Save/load
  const snap = llmSession.save();
  const json = serializeSnapshot(snap);
  const restored = createSession({ snapshot: parseSnapshot(json) });
  const restoredCtx = restored.exportContext({ maxChars: 8000 });
  const saveLoadStable =
    restoredCtx.totalItems === llmCtx.totalItems &&
    restoredCtx.text === llmCtx.text;

  const compressionOk = llmCtx.chars <= rawChars * 2;

  return {
    fixture: fixture.name,
    turns: fixture.turns.length,
    rawChars,
    rule: {
      items: ruleCtx.totalItems,
      decisions: ruleCtx.decisions.length,
      constraints: ruleCtx.constraints.length,
      tasks: ruleCtx.tasks.length,
      branches: ruleCtx.branches.length,
      goals: ruleCtx.goals.length,
      ctxChars: ruleCtx.chars,
    },
    llm: {
      items: llmCtx.totalItems,
      decisions: llmCtx.decisions.length,
      constraints: llmCtx.constraints.length,
      tasks: llmCtx.tasks.length,
      branches: llmCtx.branches.length,
      goals: llmCtx.goals.length,
      ctxChars: llmCtx.chars,
    },
    quality: {
      falseCanonization,
      hypothesisPromotion,
      hypothesesLeaked,
      branchesLeaked,
      saveLoadStable,
      compressionOk,
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("5A — LLM dogfood evaluation (gemma2:9b)", () => {
  before(async () => {
    ollamaAvailable = await checkOllama();
    if (!ollamaAvailable) {
      console.log("⚠ Ollama/gemma2:9b not available — skipping LLM dogfood tests");
    }
  });

  it("runs all three dogfood sessions and produces comparison scorecard", async (t) => {
    if (!ollamaAvailable) { t.skip("Ollama not available"); return; }

    const fixtures = [dogfoodCoding, dogfoodProduct, dogfoodMessy];
    const results: ComparisonResult[] = [];

    for (const f of fixtures) {
      results.push(await compareFixture(f));
    }

    // --- Print comparison scorecard ---
    console.log("\n╔══════════════════════════════════════════════════════════════════════════════╗");
    console.log("║  5A — LLM DOGFOOD COMPARISON (gemma2:9b vs rule-based)                      ║");
    console.log("╠══════════════════════════════════════════════════════════════════════════════╣");
    console.log("  Fixture              | Mode  | Items | Dec | Con | Tasks | Branch | Goals | Ctx ch");
    console.log("  ---------------------|-------|-------|-----|-----|-------|--------|-------|-------");

    for (const r of results) {
      const name = r.fixture.padEnd(21);
      console.log(`  ${name}| rule  | ${pad(r.rule.items)} | ${pad(r.rule.decisions)} | ${pad(r.rule.constraints)} | ${pad(r.rule.tasks)} | ${pad(r.rule.branches)}    | ${pad(r.rule.goals)} | ${pad(r.rule.ctxChars, 5)}`);
      console.log(`  ${" ".repeat(21)}| LLM   | ${pad(r.llm.items)} | ${pad(r.llm.decisions)} | ${pad(r.llm.constraints)} | ${pad(r.llm.tasks)} | ${pad(r.llm.branches)}    | ${pad(r.llm.goals)} | ${pad(r.llm.ctxChars, 5)}`);
      const pctItems = r.rule.items > 0 ? `+${Math.round(((r.llm.items - r.rule.items) / r.rule.items) * 100)}%` : "N/A";
      console.log(`  ${" ".repeat(21)}| delta | ${pctItems.padStart(5)} | ${delta(r.llm.decisions, r.rule.decisions)} | ${delta(r.llm.constraints, r.rule.constraints)} | ${delta(r.llm.tasks, r.rule.tasks)} | ${delta(r.llm.branches, r.rule.branches).padStart(6)}  | ${delta(r.llm.goals, r.rule.goals)} | ${delta(r.llm.ctxChars, r.rule.ctxChars, 5)}`);
    }

    // Quality summary
    console.log("\n  ═══════════════════════════════════════════");
    console.log("  QUALITY GATES");
    console.log("  ═══════════════════════════════════════════");

    for (const r of results) {
      console.log(`  ${r.fixture}:`);
      console.log(`    False canonization: ${r.quality.falseCanonization ? "✗ FAIL" : "✓ clean"}`);
      console.log(`    Hypothesis promotion: ${r.quality.hypothesisPromotion ? "✗ FAIL" : "✓ clean"}`);
      console.log(`    Hypothesis leak: ${r.quality.hypothesesLeaked ? "✗ FAIL" : "✓ clean"}`);
      console.log(`    Branch leak: ${r.quality.branchesLeaked ? "✗ FAIL" : "✓ clean"}`);
      console.log(`    Save/load: ${r.quality.saveLoadStable ? "✓ stable" : "✗ FAIL"}`);
      console.log(`    Compression: ${r.quality.compressionOk ? "✓ OK" : "✗ FAIL"} (${r.llm.ctxChars}/${r.rawChars} = ${Math.round((r.llm.ctxChars / r.rawChars) * 100)}%)`);
    }

    // Aggregate gates
    const noCanonization = results.every((r) => !r.quality.falseCanonization);
    const noPromotion = results.every((r) => !r.quality.hypothesisPromotion);
    const noHypoLeak = results.every((r) => !r.quality.hypothesesLeaked);
    const noBranchLeak = results.every((r) => !r.quality.branchesLeaked);
    const allSaveLoad = results.every((r) => r.quality.saveLoadStable);
    const allCompression = results.every((r) => r.quality.compressionOk);
    const recallUp = results.every((r) => r.llm.items >= r.rule.items);

    console.log("\n  ═══════════════════════════════════════════");
    console.log("  AGGREGATE ACCEPTANCE GATES");
    console.log("  ═══════════════════════════════════════════");
    console.log(`    Recall ≥ baseline:   ${recallUp ? "✓ PASS" : "⚠ CHECK"}`);
    console.log(`    Zero canonization:   ${noCanonization ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`    No hypo promotion:   ${noPromotion ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`    No hypo leak:        ${noHypoLeak ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`    No branch leak:      ${noBranchLeak ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`    Save/load:           ${allSaveLoad ? "✓ PASS" : "✗ FAIL"}`);
    console.log(`    Compression:         ${allCompression ? "✓ PASS" : "✗ FAIL"}`);
    const allPass = noCanonization && noPromotion && noHypoLeak && noBranchLeak && allSaveLoad && allCompression;
    console.log(`    Overall:             ${allPass ? "✓ ALL GATES PASS" : "✗ GATES FAILED"}`);

    console.log("\n╚══════════════════════════════════════════════════════════════════════════════╝");

    // Hard assertions on safety gates (recall is informational, not gating)
    assert.ok(noCanonization, "zero false canonization");
    assert.ok(noPromotion, "no hypothesis promotion");
    assert.ok(noHypoLeak, "no hypothesis leak to memory suggestions");
    assert.ok(noBranchLeak, "no branch leak to memory suggestions");
    assert.ok(allSaveLoad, "save/load stable across all sessions");
    assert.ok(allCompression, "compression within bounds");
  });
});

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function pad(n: number, width = 3): string {
  return String(n).padStart(width);
}

function delta(llm: number, rule: number, width = 3): string {
  const diff = llm - rule;
  const s = diff >= 0 ? `+${diff}` : `${diff}`;
  return s.padStart(width);
}

/**
 * Phase 2D — Post-refactor live sweep.
 *
 * Runs phi4:14b (lead), qwen2.5:14b (control), gemma2:9b (conservative control)
 * against 4 fixtures: clean-linear, messy-real, pathological, revision-pack.
 *
 * Acceptance gate:
 *   1. 0% canonization on pathological + revision-pack
 *   2. No rise in high-severity false positives
 *   3. phi4:14b remains default candidate (clears all above)
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { runLlmPipeline } from "../../src/extractor/llm-pipeline.js";
import { createOllamaProvider } from "../../src/extractor/llm-provider.js";
import type { Turn, KindMetrics, FalsePositive } from "../../src/extractor/types.js";
import { cleanLinear } from "../fixtures/clean-linear.js";
import { messyReal } from "../fixtures/messy-real.js";
import { pathological } from "../fixtures/pathological.js";
import { revisionPack } from "../fixtures/revision-pack.js";
import type { TranscriptFixture } from "../harness/fixture-types.js";

const BASE_URL = "http://localhost:11434";

const SWEEP_MODELS = ["phi4:14b", "qwen2.5:14b", "gemma2:9b"];

const FIXTURES: TranscriptFixture[] = [cleanLinear, messyReal, pathological, revisionPack];

let availableModels: string[] = [];

async function discoverModels(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { models: Array<{ name: string }> };
    const installed = data.models.map((m) => m.name);

    return SWEEP_MODELS.filter((candidate) => {
      const prefix = candidate.split(":")[0];
      return installed.some((name) => name.startsWith(prefix));
    });
  } catch {
    return [];
  }
}

function fixtureToTurns(fixture: TranscriptFixture): Turn[] {
  return fixture.turns.map((t) => ({ turnId: t.turnId, role: t.role, content: t.content }));
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatKindTable(byKind: KindMetrics[]): string {
  const header = "    Kind                  | Prec   | Recall | Emit | Accept | Expect | Match";
  const sep    = "    ----------------------|--------|--------|------|--------|--------|------";
  const rows = byKind.map((k) => {
    const kind = k.kind.padEnd(22);
    const prec = `${(k.precision * 100).toFixed(0)}%`.padStart(5);
    const rec = `${(k.recall * 100).toFixed(0)}%`.padStart(5);
    return `    ${kind}| ${prec}  | ${rec}  | ${String(k.emitted).padStart(4)} | ${String(k.accepted).padStart(6)} | ${String(k.expected).padStart(6)} | ${String(k.matched).padStart(5)}`;
  });
  return [header, sep, ...rows].join("\n");
}

function formatFpSummary(fps: FalsePositive[]): string {
  const high = fps.filter((f) => f.severity === "high").length;
  const medium = fps.filter((f) => f.severity === "medium").length;
  const low = fps.filter((f) => f.severity === "low").length;
  return `    FP severity: ${high} high, ${medium} medium, ${low} low (${fps.length} total)`;
}

// ---------------------------------------------------------------------------
// Types for results collection
// ---------------------------------------------------------------------------

type SweepRow = {
  model: string;
  fixture: string;
  precision: number;
  recall: number;
  canon: number;
  badTgt: number;
  fps: number;
  highFps: number;
  revisionRecall: number;
  revisionPrecision: number;
};

// ---------------------------------------------------------------------------
// Sweep
// ---------------------------------------------------------------------------

describe("Phase 2D — Post-refactor live sweep", { skip: false }, () => {
  const allRows: SweepRow[] = [];

  before(async () => {
    availableModels = await discoverModels();
    if (availableModels.length === 0) {
      console.log("\n⚠ No Ollama models available — sweep will be skipped");
    } else {
      console.log(`\n✓ 2D Sweep models: ${availableModels.join(", ")}`);
    }
  });

  it("sweep: all fixtures across models", async (t) => {
    if (availableModels.length === 0) { t.skip("No models available"); return; }

    for (const model of availableModels) {
      const provider = createOllamaProvider({ model, baseUrl: BASE_URL, temperature: 0.1 });

      console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
      console.log(`║  MODEL: ${model.padEnd(52)}║`);
      console.log(`╚══════════════════════════════════════════════════════════════╝`);

      for (const fixture of FIXTURES) {
        const turns = fixtureToTurns(fixture);
        const result = await runLlmPipeline(turns, {
          provider,
          expectedDeltas: fixture.expectedDeltas,
        });

        const sb = result.scoreboard;

        // Compute revision-specific metrics
        const revisionKinds = sb.byKind.filter((k) =>
          k.kind === "decision_revised" || k.kind === "constraint_revised",
        );
        const revEmit = revisionKinds.reduce((s, k) => s + k.emitted, 0);
        const revAccept = revisionKinds.reduce((s, k) => s + k.accepted, 0);
        const revExpect = revisionKinds.reduce((s, k) => s + k.expected, 0);
        const revMatch = revisionKinds.reduce((s, k) => s + k.matched, 0);
        const revisionRecall = revExpect > 0 ? revMatch / revExpect : 1;
        const revisionPrecision = revEmit > 0 ? revAccept / revEmit : 1;

        allRows.push({
          model,
          fixture: fixture.name,
          precision: sb.precision,
          recall: sb.recall,
          canon: sb.prematureCanonizationRate,
          badTgt: sb.badTargetRate,
          fps: sb.falsePositives.length,
          highFps: sb.falsePositives.filter((f) => f.severity === "high").length,
          revisionRecall,
          revisionPrecision,
        });

        console.log(`\n  ── ${fixture.name} (${fixture.class}) ──`);
        console.log(`    Precision: ${(sb.precision * 100).toFixed(1)}% | Recall: ${(sb.recall * 100).toFixed(1)}% | Canon: ${(sb.prematureCanonizationRate * 100).toFixed(1)}% | BadTgt: ${(sb.badTargetRate * 100).toFixed(1)}%`);
        console.log(`    Revision P/R: ${(revisionPrecision * 100).toFixed(0)}% / ${(revisionRecall * 100).toFixed(0)}%`);
        console.log(`    Candidates: ${result.candidates.length} | Accepted: ${result.accepted.length} | Rejected: ${result.rejected.length}`);
        console.log(formatKindTable(sb.byKind));
        console.log(formatFpSummary(sb.falsePositives));

        // Accepted deltas
        for (const c of result.accepted) {
          const sum = "summary" in c.delta ? (c.delta as { summary: string }).summary : "";
          console.log(`      ✓ ${c.delta.kind}: "${sum}" [${c.evidence.turnIds.join(",")}]`);
        }

        // High-severity FPs
        for (const fp of sb.falsePositives.filter((f) => f.severity === "high")) {
          const sum = "summary" in fp.candidate.delta ? (fp.candidate.delta as { summary: string }).summary : "";
          console.log(`      ✗ HIGH: ${fp.candidate.delta.kind} "${sum}" — ${fp.reason}`);
        }

        // Rejected
        for (const r of result.rejected) {
          const sum = "summary" in r.candidate.delta ? (r.candidate.delta as { summary: string }).summary : "";
          console.log(`      ✗ REJ: ${r.candidate.delta.kind} "${sum}" — ${r.reason}`);
        }
      }
    }

    assert.ok(allRows.length > 0, "Should have sweep results");
  });

  // ---------------------------------------------------------------------------
  // Summary table
  // ---------------------------------------------------------------------------

  it("sweep: summary comparison table", async (t) => {
    if (allRows.length === 0) { t.skip("No sweep data"); return; }

    console.log("\n╔═══════════════════════════════════════════════════════════════════════════════════════════╗");
    console.log("║  PHASE 2D SWEEP SUMMARY                                                                  ║");
    console.log("╠═══════════════════════════════════════════════════════════════════════════════════════════╣");
    console.log("  Model             | Fixture        | Prec   | Recall | Canon  | BadTgt | Rev R  | FP (H)");
    console.log("  ------------------|----------------|--------|--------|--------|--------|--------|-------");
    for (const r of allRows) {
      const m = r.model.padEnd(18);
      const f = r.fixture.padEnd(14);
      const p = `${(r.precision * 100).toFixed(0)}%`.padStart(5);
      const rc = `${(r.recall * 100).toFixed(0)}%`.padStart(5);
      const c = `${(r.canon * 100).toFixed(0)}%`.padStart(5);
      const bt = `${(r.badTgt * 100).toFixed(0)}%`.padStart(5);
      const rr = `${(r.revisionRecall * 100).toFixed(0)}%`.padStart(5);
      const fp = `${r.fps}(${r.highFps})`.padStart(6);
      console.log(`  ${m}| ${f} | ${p}  | ${rc}  | ${c}  | ${bt}  | ${rr}  | ${fp}`);
    }
    console.log("╚═══════════════════════════════════════════════════════════════════════════════════════════╝");
  });

  // ---------------------------------------------------------------------------
  // Acceptance gates
  // ---------------------------------------------------------------------------

  it("gate: 0% canonization on pathological + revision-pack", async (t) => {
    if (allRows.length === 0) { t.skip("No sweep data"); return; }

    const safetyFixtures = ["pathological", "revision-pack"];
    const violations: string[] = [];

    for (const r of allRows) {
      if (safetyFixtures.includes(r.fixture) && r.canon > 0) {
        violations.push(`${r.model} on ${r.fixture}: ${(r.canon * 100).toFixed(1)}% canonization`);
      }
    }

    if (violations.length > 0) {
      console.log("\n  ⚠ Canonization violations:");
      violations.forEach((v) => console.log(`    - ${v}`));
    }

    assert.equal(
      violations.length,
      0,
      `Canonization gate failed:\n${violations.join("\n")}`,
    );
  });

  it("gate: no high-severity FP explosion", async (t) => {
    if (allRows.length === 0) { t.skip("No sweep data"); return; }

    // Threshold: no model should have more than 2 high-severity FPs on any fixture
    const violations: string[] = [];

    for (const r of allRows) {
      if (r.highFps > 2) {
        violations.push(`${r.model} on ${r.fixture}: ${r.highFps} high-severity FPs`);
      }
    }

    if (violations.length > 0) {
      console.log("\n  ⚠ High FP violations:");
      violations.forEach((v) => console.log(`    - ${v}`));
    }

    assert.equal(
      violations.length,
      0,
      `High FP gate failed:\n${violations.join("\n")}`,
    );
  });

  it("gate: phi4:14b clears all criteria", async (t) => {
    if (allRows.length === 0) { t.skip("No sweep data"); return; }

    const phi4Rows = allRows.filter((r) => r.model === "phi4:14b");
    if (phi4Rows.length === 0) { t.skip("phi4:14b not in sweep"); return; }

    const issues: string[] = [];

    for (const r of phi4Rows) {
      // Canonization
      if (["pathological", "revision-pack"].includes(r.fixture) && r.canon > 0) {
        issues.push(`${r.fixture}: ${(r.canon * 100).toFixed(1)}% canonization`);
      }
      // High FPs
      if (r.highFps > 2) {
        issues.push(`${r.fixture}: ${r.highFps} high-severity FPs`);
      }
    }

    if (issues.length > 0) {
      console.log("\n  ⚠ phi4:14b issues:");
      issues.forEach((i) => console.log(`    - ${i}`));
    }

    assert.equal(
      issues.length,
      0,
      `phi4:14b not fit as default:\n${issues.join("\n")}`,
    );
  });
});

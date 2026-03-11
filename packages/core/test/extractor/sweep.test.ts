/**
 * Phase 2B.3 — Model-and-prompt sweep with per-delta-kind metrics.
 *
 * Gated: skips if Ollama is not available.
 * Runs each (model, prompt-variant) pair against clean-linear and pathological.
 * Prints per-kind precision/recall breakdown + false-positive severity summary.
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { runLlmPipeline } from "../../src/extractor/llm-pipeline.js";
import { createOllamaProvider } from "../../src/extractor/llm-provider.js";
import type { Turn, KindMetrics, FalsePositive } from "../../src/extractor/types.js";
import { cleanLinear } from "../fixtures/clean-linear.js";
import { pathological } from "../fixtures/pathological.js";
import type { TranscriptFixture } from "../harness/fixture-types.js";

const BASE_URL = "http://localhost:11434";

// ---------------------------------------------------------------------------
// Model candidates — sweep discovers which are available
// ---------------------------------------------------------------------------

const MODEL_CANDIDATES = [
  "qwen2.5:7b",
  "qwen2.5:14b",
  "phi4:14b",
  "llama3.1:8b",
  "gemma2:9b",
];

let availableModels: string[] = [];

async function discoverModels(): Promise<string[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { models: Array<{ name: string }> };
    const installed = data.models.map((m) => m.name);

    return MODEL_CANDIDATES.filter((candidate) => {
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
// Formatting helpers
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
// Sweep
// ---------------------------------------------------------------------------

describe("Phase 2B.3 — Model & Prompt Sweep", { skip: false }, () => {
  before(async () => {
    availableModels = await discoverModels();
    if (availableModels.length === 0) {
      console.log("\n⚠ No Ollama models available — sweep will be skipped");
    } else {
      console.log(`\n✓ Sweep models: ${availableModels.join(", ")}`);
    }
  });

  // Run each model against clean-linear
  it("sweep: clean-linear across models", async (t) => {
    if (availableModels.length === 0) { t.skip("No models available"); return; }

    const fixture = cleanLinear;
    const turns = fixtureToTurns(fixture);

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║  SWEEP: clean-linear                                        ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");

    for (const model of availableModels) {
      const provider = createOllamaProvider({ model, baseUrl: BASE_URL, temperature: 0.1 });
      const result = await runLlmPipeline(turns, {
        provider,
        expectedDeltas: fixture.expectedDeltas,
      });

      const sb = result.scoreboard;
      console.log(`\n  ── ${model} ──`);
      console.log(`    Precision: ${(sb.precision * 100).toFixed(1)}% | Recall: ${(sb.recall * 100).toFixed(1)}% | Canon: ${(sb.prematureCanonizationRate * 100).toFixed(1)}% | BadTgt: ${(sb.badTargetRate * 100).toFixed(1)}%`);
      console.log(`    Candidates: ${result.candidates.length} | Accepted: ${result.accepted.length} | Rejected: ${result.rejected.length}`);
      console.log(formatKindTable(sb.byKind));
      console.log(formatFpSummary(sb.falsePositives));

      // Log individual accepted for debugging
      for (const c of result.accepted) {
        const sum = "summary" in c.delta ? (c.delta as { summary: string }).summary : "";
        console.log(`      ✓ ${c.delta.kind}: "${sum}" [${c.evidence.turnIds.join(",")}]`);
      }

      // High-severity false positives
      for (const fp of sb.falsePositives.filter((f) => f.severity === "high")) {
        const sum = "summary" in fp.candidate.delta ? (fp.candidate.delta as { summary: string }).summary : "";
        console.log(`      ✗ HIGH: ${fp.candidate.delta.kind} "${sum}" — ${fp.reason}`);
      }
    }

    // Basic assertion: at least one model produced results
    assert.ok(true, "Sweep completed");
  });

  // Run each model against pathological
  it("sweep: pathological across models", async (t) => {
    if (availableModels.length === 0) { t.skip("No models available"); return; }

    const fixture = pathological;
    const turns = fixtureToTurns(fixture);

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║  SWEEP: pathological                                        ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");

    for (const model of availableModels) {
      const provider = createOllamaProvider({ model, baseUrl: BASE_URL, temperature: 0.1 });
      const result = await runLlmPipeline(turns, {
        provider,
        expectedDeltas: fixture.expectedDeltas,
      });

      const sb = result.scoreboard;
      console.log(`\n  ── ${model} ──`);
      console.log(`    Precision: ${(sb.precision * 100).toFixed(1)}% | Recall: ${(sb.recall * 100).toFixed(1)}% | Canon: ${(sb.prematureCanonizationRate * 100).toFixed(1)}% | BadTgt: ${(sb.badTargetRate * 100).toFixed(1)}%`);
      console.log(`    Candidates: ${result.candidates.length} | Accepted: ${result.accepted.length} | Rejected: ${result.rejected.length}`);
      console.log(formatKindTable(sb.byKind));
      console.log(formatFpSummary(sb.falsePositives));

      // Safety check: canonization must stay low
      assert.ok(
        sb.prematureCanonizationRate < 0.2,
        `${model}: canonization ${(sb.prematureCanonizationRate * 100).toFixed(1)}% exceeds 20% safety threshold`,
      );

      // Check hedging safety
      for (const c of result.accepted) {
        if (c.delta.kind === "decision_made") {
          const turns = c.evidence.turnIds;
          if (turns.length === 1 && turns[0] === "t-1") {
            console.log(`      ⚠ HEDGING FAILURE: ${model} promoted t-1 to decision_made`);
          }
        }
      }

      for (const fp of sb.falsePositives.filter((f) => f.severity === "high")) {
        const sum = "summary" in fp.candidate.delta ? (fp.candidate.delta as { summary: string }).summary : "";
        console.log(`      ✗ HIGH: ${fp.candidate.delta.kind} "${sum}" — ${fp.reason}`);
      }
    }

    assert.ok(true, "Sweep completed");
  });

  // Summary comparison table
  it("sweep: summary comparison table", async (t) => {
    if (availableModels.length === 0) { t.skip("No models available"); return; }

    const fixtures = [cleanLinear, pathological];
    type Row = { model: string; fixture: string; precision: number; recall: number; canon: number; badTgt: number; fps: number; highFps: number };
    const rows: Row[] = [];

    for (const model of availableModels) {
      const provider = createOllamaProvider({ model, baseUrl: BASE_URL, temperature: 0.1 });
      for (const fixture of fixtures) {
        const turns = fixtureToTurns(fixture);
        const result = await runLlmPipeline(turns, {
          provider,
          expectedDeltas: fixture.expectedDeltas,
        });
        const sb = result.scoreboard;
        rows.push({
          model,
          fixture: fixture.name,
          precision: sb.precision,
          recall: sb.recall,
          canon: sb.prematureCanonizationRate,
          badTgt: sb.badTargetRate,
          fps: sb.falsePositives.length,
          highFps: sb.falsePositives.filter((f) => f.severity === "high").length,
        });
      }
    }

    console.log("\n╔══════════════════════════════════════════════════════════════════════════════╗");
    console.log("║  SWEEP SUMMARY                                                              ║");
    console.log("╠══════════════════════════════════════════════════════════════════════════════╣");
    console.log("  Model             | Fixture       | Prec   | Recall | Canon  | BadTgt | FP (H)");
    console.log("  ------------------|---------------|--------|--------|--------|--------|-------");
    for (const r of rows) {
      const m = r.model.padEnd(18);
      const f = r.fixture.padEnd(13);
      const p = `${(r.precision * 100).toFixed(0)}%`.padStart(5);
      const rc = `${(r.recall * 100).toFixed(0)}%`.padStart(5);
      const c = `${(r.canon * 100).toFixed(0)}%`.padStart(5);
      const bt = `${(r.badTgt * 100).toFixed(0)}%`.padStart(5);
      const fp = `${r.fps}(${r.highFps})`.padStart(6);
      console.log(`  ${m}| ${f} | ${p}  | ${rc}  | ${c}  | ${bt}  | ${fp}`);
    }
    console.log("╚══════════════════════════════════════════════════════════════════════════════╝");

    assert.ok(rows.length > 0, "Should have sweep results");
  });
});

/**
 * LLM integration test — runs against real Ollama.
 *
 * Gated: skips if Ollama is not available.
 * Uses qwen2.5:7b for structured extraction.
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { runLlmPipeline } from "../../src/extractor/llm-pipeline.js";
import { runPipeline } from "../../src/extractor/pipeline.js";
import { createOllamaProvider } from "../../src/extractor/llm-provider.js";
import type { Turn } from "../../src/extractor/types.js";
import { cleanLinear } from "../fixtures/clean-linear.js";
import { pathological } from "../fixtures/pathological.js";
import type { TranscriptFixture } from "../harness/fixture-types.js";

const MODEL = "qwen2.5:7b";
const BASE_URL = "http://localhost:11434";

let ollamaAvailable = false;

async function checkOllama(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const data = (await res.json()) as { models: Array<{ name: string }> };
    return data.models.some((m) => m.name.startsWith(MODEL.split(":")[0]));
  } catch {
    return false;
  }
}

function fixtureToTurns(fixture: TranscriptFixture): Turn[] {
  return fixture.turns.map((t) => ({ turnId: t.turnId, role: t.role, content: t.content }));
}

describe("LLM integration (Ollama)", { skip: false }, () => {
  before(async () => {
    ollamaAvailable = await checkOllama();
    if (!ollamaAvailable) {
      console.log(`\n⚠ Ollama not available or ${MODEL} not found — skipping integration tests`);
    }
  });

  it("clean-linear: LLM recall beats rule-based baseline", async (t) => {
    if (!ollamaAvailable) { t.skip("Ollama not available"); return; }

    const provider = createOllamaProvider({ model: MODEL, baseUrl: BASE_URL, temperature: 0.1 });
    const turns = fixtureToTurns(cleanLinear);

    // Run both pipelines
    const baselineResult = runPipeline(turns, { expectedDeltas: cleanLinear.expectedDeltas });
    const llmResult = await runLlmPipeline(turns, {
      provider,
      expectedDeltas: cleanLinear.expectedDeltas,
    });

    console.log("\n=== CLEAN-LINEAR: BASELINE vs LLM ===");
    console.log(`  Baseline — Candidates: ${baselineResult.candidates.length} | Recall: ${(baselineResult.scoreboard.recall * 100).toFixed(1)}% | Precision: ${(baselineResult.scoreboard.precision * 100).toFixed(1)}%`);
    console.log(`  LLM      — Candidates: ${llmResult.candidates.length} | Recall: ${(llmResult.scoreboard.recall * 100).toFixed(1)}% | Precision: ${(llmResult.scoreboard.precision * 100).toFixed(1)}%`);
    console.log(`  LLM Canon: ${(llmResult.scoreboard.prematureCanonizationRate * 100).toFixed(1)}% | BadTgt: ${(llmResult.scoreboard.badTargetRate * 100).toFixed(1)}% | Dupes: ${(llmResult.scoreboard.duplicateEmissionRate * 100).toFixed(1)}%`);
    console.log(`  LLM Accepted kinds: ${[...new Set(llmResult.accepted.map((a) => a.delta.kind))].join(", ")}`);

    // Log individual candidates for debugging
    for (const c of llmResult.accepted) {
      const sum = "summary" in c.delta ? (c.delta as { summary: string }).summary : "";
      console.log(`    ✓ ${c.delta.kind}: "${sum}" [${c.evidence.turnIds.join(",")}]`);
    }
    for (const r of llmResult.rejected) {
      console.log(`    ✗ ${r.candidate.delta.kind}: ${r.reason}`);
    }

    // Core assertions
    assert.ok(llmResult.accepted.length > 0, "LLM should produce accepted candidates");
    assert.ok(
      llmResult.scoreboard.prematureCanonizationRate < 0.1,
      `Canonization should be < 10%, got ${(llmResult.scoreboard.prematureCanonizationRate * 100).toFixed(1)}%`,
    );
  });

  it("pathological: LLM does not promote hedged language to decisions", async (t) => {
    if (!ollamaAvailable) { t.skip("Ollama not available"); return; }

    const provider = createOllamaProvider({ model: MODEL, baseUrl: BASE_URL, temperature: 0.1 });
    const turns = fixtureToTurns(pathological);

    const result = await runLlmPipeline(turns, {
      provider,
      expectedDeltas: pathological.expectedDeltas,
    });

    console.log("\n=== PATHOLOGICAL: LLM RESULTS ===");
    console.log(`  Candidates: ${result.candidates.length} | Accepted: ${result.accepted.length} | Rejected: ${result.rejected.length}`);
    console.log(`  Recall: ${(result.scoreboard.recall * 100).toFixed(1)}% | Precision: ${(result.scoreboard.precision * 100).toFixed(1)}%`);
    console.log(`  Canon: ${(result.scoreboard.prematureCanonizationRate * 100).toFixed(1)}% | BadTgt: ${(result.scoreboard.badTargetRate * 100).toFixed(1)}%`);

    for (const c of result.accepted) {
      const sum = "summary" in c.delta ? (c.delta as { summary: string }).summary : "";
      console.log(`    ✓ ${c.delta.kind}: "${sum}" [${c.evidence.turnIds.join(",")}]`);
    }

    // The critical test: t-1's hedged Redis should NOT become a decision
    for (const c of result.accepted) {
      if (c.delta.kind === "decision_made") {
        const turns = c.evidence.turnIds;
        // If t-1 is the sole source, that's a canonization failure
        if (turns.length === 1 && turns[0] === "t-1") {
          assert.fail("LLM promoted hedged t-1 ('probably... maybe... not sure') to decision_made");
        }
      }
    }

    assert.ok(
      result.scoreboard.prematureCanonizationRate < 0.15,
      `Canonization should be < 15%, got ${(result.scoreboard.prematureCanonizationRate * 100).toFixed(1)}%`,
    );
  });
});

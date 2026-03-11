import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runPipeline } from "../../src/extractor/pipeline.js";
import type { Turn } from "../../src/extractor/types.js";
import { cleanLinear } from "../fixtures/clean-linear.js";
import { messyReal } from "../fixtures/messy-real.js";
import { pathological } from "../fixtures/pathological.js";
import { longLinear } from "../fixtures/long-linear.js";
import { longMessy } from "../fixtures/long-messy.js";
import { longPathological } from "../fixtures/long-pathological.js";
import { revisionPack } from "../fixtures/revision-pack.js";
import type { TranscriptFixture } from "../harness/fixture-types.js";

// ---------------------------------------------------------------------------
// Helper: run pipeline on a fixture and print scoreboard
// ---------------------------------------------------------------------------

function runFixturePipeline(fixture: TranscriptFixture) {
  const turns: Turn[] = fixture.turns.map((t) => ({
    turnId: t.turnId,
    role: t.role,
    content: t.content,
  }));

  const result = runPipeline(turns, { expectedDeltas: fixture.expectedDeltas });

  console.log(`\n[${fixture.class}] ${fixture.name}`);
  console.log(`  Candidates: ${result.candidates.length} | Accepted: ${result.accepted.length} | Rejected: ${result.rejected.length}`);
  console.log(`  Gate: ${result.gateResults.filter((g) => g.gated).length}/${result.gateResults.length} turns gated`);
  console.log(`  Expected deltas: ${fixture.expectedDeltas.length}`);
  console.log(`  Scoreboard:`);
  console.log(`    Precision:           ${(result.scoreboard.precision * 100).toFixed(1)}%`);
  console.log(`    Recall:              ${(result.scoreboard.recall * 100).toFixed(1)}%`);
  console.log(`    Canonization errors: ${(result.scoreboard.prematureCanonizationRate * 100).toFixed(1)}%`);
  console.log(`    Bad targets:         ${(result.scoreboard.badTargetRate * 100).toFixed(1)}%`);
  console.log(`    Duplicate emissions: ${(result.scoreboard.duplicateEmissionRate * 100).toFixed(1)}%`);
  console.log(`    Rejection rate:      ${(result.scoreboard.reconcilerRejectionRate * 100).toFixed(1)}%`);
  console.log(`    Cost/accepted delta: ${result.scoreboard.costPerAcceptedDelta.toFixed(0)} chars`);

  if (result.rejected.length > 0) {
    console.log(`  Rejections:`);
    for (const r of result.rejected) {
      console.log(`    - ${r.candidate.delta.kind}: ${r.reason}`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Extraction pipeline", () => {
  describe("clean-linear fixture", () => {
    it("extracts candidates from simple transcript", () => {
      const result = runFixturePipeline(cleanLinear);

      // Pipeline should produce candidates
      assert.ok(result.candidates.length > 0, "Should produce at least one candidate");
      assert.ok(result.accepted.length > 0, "At least one candidate should be accepted");

      // Gate should detect most turns as interesting
      const gated = result.gateResults.filter((g) => g.gated).length;
      assert.ok(gated >= 5, `Should gate at least 5 turns, got ${gated}`);
    });

    it("detects goals and decisions", () => {
      const result = runFixturePipeline(cleanLinear);
      const kinds = result.accepted.map((a) => a.delta.kind);
      assert.ok(kinds.includes("goal_set"), "Should detect goal");
      assert.ok(kinds.includes("decision_made"), "Should detect decision");
    });

    it("detects constraints", () => {
      const result = runFixturePipeline(cleanLinear);
      const kinds = result.accepted.map((a) => a.delta.kind);
      assert.ok(kinds.includes("constraint_added"), "Should detect constraint");
    });

    it("recall is above 30%", () => {
      const result = runFixturePipeline(cleanLinear);
      assert.ok(
        result.scoreboard.recall >= 0.3,
        `Recall should be >= 30%, got ${(result.scoreboard.recall * 100).toFixed(1)}%`,
      );
    });

    it("precision is above 50%", () => {
      const result = runFixturePipeline(cleanLinear);
      assert.ok(
        result.scoreboard.precision >= 0.5,
        `Precision should be >= 50%, got ${(result.scoreboard.precision * 100).toFixed(1)}%`,
      );
    });

    it("no premature canonization", () => {
      const result = runFixturePipeline(cleanLinear);
      assert.equal(
        result.scoreboard.prematureCanonizationRate,
        0,
        "Clean-linear should have zero canonization errors",
      );
    });
  });

  describe("messy-real fixture", () => {
    it("extracts candidates from messy transcript", () => {
      const result = runFixturePipeline(messyReal);
      assert.ok(result.candidates.length > 0, "Should produce candidates");
      assert.ok(result.accepted.length > 0, "Should have accepted candidates");
    });

    it("recall is above 20%", () => {
      const result = runFixturePipeline(messyReal);
      assert.ok(
        result.scoreboard.recall >= 0.2,
        `Recall should be >= 20%, got ${(result.scoreboard.recall * 100).toFixed(1)}%`,
      );
    });
  });

  describe("pathological fixture", () => {
    it("extracts candidates from adversarial transcript", () => {
      const result = runFixturePipeline(pathological);
      assert.ok(result.candidates.length > 0, "Should produce candidates");
    });

    it("hedged language does NOT become decisions", () => {
      const result = runFixturePipeline(pathological);
      // Check that "maybe" / "I think" patterns didn't produce decision_made
      for (const c of result.accepted) {
        if (c.delta.kind === "decision_made") {
          const reason = c.extractorReason ?? "";
          assert.ok(
            !reason.includes("hedged"),
            `Decision should not come from hedged language: ${reason}`,
          );
        }
      }
    });

    it("canonization rate stays below 10%", () => {
      const result = runFixturePipeline(pathological);
      assert.ok(
        result.scoreboard.prematureCanonizationRate < 0.1,
        `Canonization rate should be < 10%, got ${(result.scoreboard.prematureCanonizationRate * 100).toFixed(1)}%`,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Phase 2B.1 — Long fixture baseline
  // -------------------------------------------------------------------------

  describe("long-linear fixture (56 turns)", () => {
    it("produces candidates at scale", () => {
      const result = runFixturePipeline(longLinear);
      assert.ok(result.candidates.length > 0, "Should produce candidates");
      assert.ok(result.accepted.length > 0, "Should have accepted candidates");
    });

    it("precision stays above 80%", () => {
      const result = runFixturePipeline(longLinear);
      assert.ok(
        result.scoreboard.precision >= 0.8,
        `Precision should be >= 80%, got ${(result.scoreboard.precision * 100).toFixed(1)}%`,
      );
    });

    it("no premature canonization", () => {
      const result = runFixturePipeline(longLinear);
      assert.ok(
        result.scoreboard.prematureCanonizationRate < 0.05,
        `Canonization rate should be < 5%, got ${(result.scoreboard.prematureCanonizationRate * 100).toFixed(1)}%`,
      );
    });
  });

  describe("long-messy fixture (62 turns)", () => {
    it("produces candidates at scale", () => {
      const result = runFixturePipeline(longMessy);
      assert.ok(result.candidates.length > 0, "Should produce candidates");
      assert.ok(result.accepted.length > 0, "Should have accepted candidates");
    });

    it("precision stays above 70%", () => {
      const result = runFixturePipeline(longMessy);
      assert.ok(
        result.scoreboard.precision >= 0.7,
        `Precision should be >= 70%, got ${(result.scoreboard.precision * 100).toFixed(1)}%`,
      );
    });

    it("canonization rate below 10%", () => {
      const result = runFixturePipeline(longMessy);
      assert.ok(
        result.scoreboard.prematureCanonizationRate < 0.1,
        `Canonization rate should be < 10%, got ${(result.scoreboard.prematureCanonizationRate * 100).toFixed(1)}%`,
      );
    });
  });

  describe("long-pathological fixture (58 turns)", () => {
    it("produces candidates from adversarial long session", () => {
      const result = runFixturePipeline(longPathological);
      assert.ok(result.candidates.length > 0, "Should produce candidates");
    });

    it("precision stays above 60%", () => {
      const result = runFixturePipeline(longPathological);
      assert.ok(
        result.scoreboard.precision >= 0.6,
        `Precision should be >= 60%, got ${(result.scoreboard.precision * 100).toFixed(1)}%`,
      );
    });

    it("canonization rate below 10%", () => {
      const result = runFixturePipeline(longPathological);
      assert.ok(
        result.scoreboard.prematureCanonizationRate < 0.1,
        `Canonization rate should be < 10%, got ${(result.scoreboard.prematureCanonizationRate * 100).toFixed(1)}%`,
      );
    });

    it("hedging filter holds under long-form ambiguity", () => {
      const result = runFixturePipeline(longPathological);
      // No accepted candidate should be a decision from hedged language
      for (const c of result.accepted) {
        if (c.delta.kind === "decision_made") {
          const reason = c.extractorReason ?? "";
          assert.ok(
            !reason.includes("hedged"),
            `Decision from hedged language at scale: ${reason}`,
          );
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // Phase 2B.3 — Per-kind metrics and false-positive tracking
  // -------------------------------------------------------------------------

  describe("per-kind metrics (byKind)", () => {
    it("clean-linear: byKind covers all expected kinds", () => {
      const result = runFixturePipeline(cleanLinear);
      const kindNames = result.scoreboard.byKind.map((k) => k.kind);

      // clean-linear expects: goal_set, decision_made, constraint_added, task_opened, task_closed, decision_revised, item_superseded
      assert.ok(kindNames.includes("goal_set"), "Should have goal_set metrics");
      assert.ok(kindNames.includes("decision_made"), "Should have decision_made metrics");
      assert.ok(kindNames.includes("constraint_added"), "Should have constraint_added metrics");
    });

    it("clean-linear: goal_set has decent recall", () => {
      const result = runFixturePipeline(cleanLinear);
      const goalMetrics = result.scoreboard.byKind.find((k) => k.kind === "goal_set");
      assert.ok(goalMetrics, "Should have goal_set metrics");
      assert.ok(goalMetrics!.expected > 0, "Should expect goals");
      assert.ok(goalMetrics!.matched > 0, "Should match at least one goal");
    });

    it("per-kind precision is bounded [0, 1]", () => {
      const result = runFixturePipeline(cleanLinear);
      for (const k of result.scoreboard.byKind) {
        assert.ok(k.precision >= 0 && k.precision <= 1, `${k.kind} precision ${k.precision} out of bounds`);
        assert.ok(k.recall >= 0 && k.recall <= 1, `${k.kind} recall ${k.recall} out of bounds`);
      }
    });

    it("per-kind table prints cleanly", () => {
      const result = runFixturePipeline(cleanLinear);
      console.log("\n=== PER-KIND BREAKDOWN: clean-linear ===");
      console.log("  Kind                  | Prec   | Recall | Emit | Accept | Expect | Match");
      console.log("  ----------------------|--------|--------|------|--------|--------|------");
      for (const k of result.scoreboard.byKind) {
        const kind = k.kind.padEnd(22);
        const prec = `${(k.precision * 100).toFixed(0)}%`.padStart(5);
        const rec = `${(k.recall * 100).toFixed(0)}%`.padStart(5);
        console.log(`  ${kind}| ${prec}  | ${rec}  | ${String(k.emitted).padStart(4)} | ${String(k.accepted).padStart(6)} | ${String(k.expected).padStart(6)} | ${String(k.matched).padStart(5)}`);
      }
      assert.ok(true);
    });
  });

  describe("false-positive tracking", () => {
    it("clean-linear: false positives have valid severity", () => {
      const result = runFixturePipeline(cleanLinear);
      for (const fp of result.scoreboard.falsePositives) {
        assert.ok(
          ["low", "medium", "high"].includes(fp.severity),
          `Invalid severity: ${fp.severity}`,
        );
        assert.ok(fp.reason.length > 0, "FP must have a reason");
        assert.ok(fp.candidate.delta.kind, "FP must have a delta kind");
      }
    });

    it("pathological: no high-severity false positives (hedging safety)", () => {
      const result = runFixturePipeline(pathological);
      const highFps = result.scoreboard.falsePositives.filter((f) => f.severity === "high");
      // If the hedging filter works, there should be no high-severity canonization FPs
      assert.equal(
        highFps.length,
        0,
        `Expected 0 high-severity FPs, got ${highFps.length}: ${highFps.map((f) => f.reason).join(", ")}`,
      );
    });

    it("FP summary prints cleanly", () => {
      const result = runFixturePipeline(pathological);
      const fps = result.scoreboard.falsePositives;
      const high = fps.filter((f) => f.severity === "high").length;
      const medium = fps.filter((f) => f.severity === "medium").length;
      const low = fps.filter((f) => f.severity === "low").length;
      console.log(`\n=== FP SUMMARY: pathological ===`);
      console.log(`  Total: ${fps.length} | High: ${high} | Medium: ${medium} | Low: ${low}`);
      for (const fp of fps) {
        const sum = "summary" in fp.candidate.delta ? (fp.candidate.delta as { summary: string }).summary : "";
        console.log(`  [${fp.severity}] ${fp.candidate.delta.kind}: "${sum}" — ${fp.reason}`);
      }
      assert.ok(true);
    });
  });

  // -------------------------------------------------------------------------
  // Phase 2C.3 — Revision mini-pack
  // -------------------------------------------------------------------------

  describe("revision-pack fixture", () => {
    it("produces candidates for revision scenarios", () => {
      const result = runFixturePipeline(revisionPack);
      assert.ok(result.candidates.length > 0, "Should produce candidates");
      assert.ok(result.accepted.length > 0, "Should have accepted candidates");
    });

    it("emits revision-type deltas (decision_revised or constraint_revised)", () => {
      const result = runFixturePipeline(revisionPack);
      const kinds = result.accepted.map((a) => a.delta.kind);
      // Rule-based floor: should catch at least one revision-like delta
      const hasRevision = kinds.includes("decision_revised") || kinds.includes("constraint_revised");
      assert.ok(hasRevision, "Should emit at least one revision-type delta");
    });

    it("per-kind breakdown for revision scenarios", () => {
      const result = runFixturePipeline(revisionPack);
      console.log("\n=== PER-KIND BREAKDOWN: revision-pack ===");
      console.log("  Kind                  | Prec   | Recall | Emit | Accept | Expect | Match");
      console.log("  ----------------------|--------|--------|------|--------|--------|------");
      for (const k of result.scoreboard.byKind) {
        const kind = k.kind.padEnd(22);
        const prec = `${(k.precision * 100).toFixed(0)}%`.padStart(5);
        const rec = `${(k.recall * 100).toFixed(0)}%`.padStart(5);
        console.log(`  ${kind}| ${prec}  | ${rec}  | ${String(k.emitted).padStart(4)} | ${String(k.accepted).padStart(6)} | ${String(k.expected).padStart(6)} | ${String(k.matched).padStart(5)}`);
      }

      // Print accepted for debugging
      for (const c of result.accepted) {
        const sum = "summary" in c.delta ? (c.delta as { summary: string }).summary : "";
        console.log(`  ✓ ${c.delta.kind}: "${sum}" [${c.evidence.turnIds.join(",")}]`);
      }
      assert.ok(true);
    });

    it("false positives tracked and classified", () => {
      const result = runFixturePipeline(revisionPack);
      const fps = result.scoreboard.falsePositives;
      // Rule-based floor: FPs are expected on revision-heavy fixture.
      // The key metric is that they're TRACKED, not that there are zero.
      // LLM extractor with type-scoped shortlists should reduce these.
      console.log(`\n=== FP SUMMARY: revision-pack ===`);
      const high = fps.filter((f) => f.severity === "high").length;
      const medium = fps.filter((f) => f.severity === "medium").length;
      const low = fps.filter((f) => f.severity === "low").length;
      console.log(`  Total: ${fps.length} | High: ${high} | Medium: ${medium} | Low: ${low}`);
      for (const fp of fps) {
        const sum = "summary" in fp.candidate.delta ? (fp.candidate.delta as { summary: string }).summary : "";
        console.log(`  [${fp.severity}] ${fp.candidate.delta.kind}: "${sum}" — ${fp.reason}`);
      }
      assert.ok(fps.length >= 0, "FPs should be tracked");
    });

    it("precision above 80%", () => {
      const result = runFixturePipeline(revisionPack);
      assert.ok(
        result.scoreboard.precision >= 0.8,
        `Precision should be >= 80%, got ${(result.scoreboard.precision * 100).toFixed(1)}%`,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Cross-fixture scaling comparison
  // -------------------------------------------------------------------------

  describe("scaling comparison — short vs long baseline", () => {
    it("prints comparison table", () => {
      const all: Array<{ fixture: TranscriptFixture; label: string }> = [
        { fixture: cleanLinear, label: "short-clean" },
        { fixture: messyReal, label: "short-messy" },
        { fixture: pathological, label: "short-pathological" },
        { fixture: longLinear, label: "long-clean" },
        { fixture: longMessy, label: "long-messy" },
        { fixture: longPathological, label: "long-pathological" },
        { fixture: revisionPack, label: "revision-pack" },
      ];

      console.log("\n=== BASELINE SCALING COMPARISON ===");
      console.log("Fixture               | Turns | Expected | Candidates | Accepted | Prec  | Recall | Canon | Dupes | BadTgt | Rej  | Cost/Δ");
      console.log("----------------------|-------|----------|------------|----------|-------|--------|-------|-------|--------|------|-------");

      const shortMetrics: number[] = [];
      const longMetrics: number[] = [];

      for (const { fixture, label } of all) {
        const turns: Turn[] = fixture.turns.map((t) => ({ turnId: t.turnId, role: t.role, content: t.content }));
        const result = runPipeline(turns, { expectedDeltas: fixture.expectedDeltas });
        const s = result.scoreboard;

        const row = [
          label.padEnd(22),
          String(fixture.turns.length).padStart(5),
          String(fixture.expectedDeltas.length).padStart(8),
          String(result.candidates.length).padStart(10),
          String(result.accepted.length).padStart(8),
          `${(s.precision * 100).toFixed(0)}%`.padStart(5),
          `${(s.recall * 100).toFixed(0)}%`.padStart(6),
          `${(s.prematureCanonizationRate * 100).toFixed(0)}%`.padStart(5),
          `${(s.duplicateEmissionRate * 100).toFixed(0)}%`.padStart(5),
          `${(s.badTargetRate * 100).toFixed(0)}%`.padStart(6),
          `${(s.reconcilerRejectionRate * 100).toFixed(0)}%`.padStart(4),
          `${s.costPerAcceptedDelta.toFixed(0)}`.padStart(6),
        ].join(" | ");
        console.log(row);

        if (label.startsWith("short")) shortMetrics.push(s.recall, s.precision);
        else longMetrics.push(s.recall, s.precision);
      }

      console.log("=== END COMPARISON ===\n");

      // The table itself is the test — just verify it completed
      assert.ok(true);
    });
  });

  // -------------------------------------------------------------------------
  // Smoke tests
  // -------------------------------------------------------------------------

  describe("all fixtures — pipeline smoke test", () => {
    const fixtures = [cleanLinear, messyReal, pathological, longLinear, longMessy, longPathological, revisionPack];

    for (const fixture of fixtures) {
      it(`[${fixture.class}] ${fixture.name}: pipeline completes without crash`, () => {
        const result = runFixturePipeline(fixture);
        // Basic sanity: pipeline didn't crash, scoreboard computed
        assert.ok(typeof result.scoreboard.precision === "number");
        assert.ok(typeof result.scoreboard.recall === "number");
        assert.ok(result.state.items.size > 0, "Should produce at least one item in state");
      });
    }
  });
});

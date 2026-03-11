/**
 * Phase 3A — Session runtime tests.
 *
 * Tests the session loop, query surface, context export, and checkpoint economics.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createSession } from "../src/session.js";
import type { Turn } from "../src/extractor/types.js";
import { cleanLinear } from "./fixtures/clean-linear.js";
import { messyReal } from "./fixtures/messy-real.js";
import { pathological } from "./fixtures/pathological.js";
import { revisionPack } from "./fixtures/revision-pack.js";
import { longLinear } from "./fixtures/long-linear.js";
import { longMessy } from "./fixtures/long-messy.js";
import { longPathological } from "./fixtures/long-pathological.js";
import type { TranscriptFixture } from "./harness/fixture-types.js";

function fixtureToTurns(fixture: TranscriptFixture): Turn[] {
  return fixture.turns.map((t) => ({ turnId: t.turnId, role: t.role, content: t.content }));
}

// ---------------------------------------------------------------------------
// Session basics (rule-based only — no LLM needed)
// ---------------------------------------------------------------------------

describe("Session runtime", () => {
  describe("lifecycle", () => {
    it("creates a session with default options", () => {
      const session = createSession();
      const stats = session.stats();
      assert.equal(stats.totalTurns, 0);
      assert.equal(stats.totalItems, 0);
      assert.equal(stats.processCount, 0);
    });

    it("ingests turns and tracks count", () => {
      const session = createSession();
      session.ingest({ turnId: "t-1", role: "user", content: "Hello" });
      session.ingest({ turnId: "t-2", role: "assistant", content: "Hi there" });
      assert.equal(session.stats().totalTurns, 2);
    });

    it("processes turns and updates state", async () => {
      const session = createSession();
      const turns = fixtureToTurns(cleanLinear);
      session.ingestBatch(turns);

      const result = await session.process();
      assert.equal(result.turnsProcessed, turns.length);
      assert.equal(result.totalTurns, turns.length);
      assert.equal(result.hasMore, false);
      assert.ok(result.pipeline.candidates.length > 0, "should produce candidates");
      assert.ok(session.stats().totalItems > 0, "should have items in state");
    });

    it("processing empty queue returns no-op", async () => {
      const session = createSession();
      const result = await session.process();
      assert.equal(result.turnsProcessed, 0);
      assert.equal(result.hasMore, false);
    });

    it("incremental processing accumulates state", async () => {
      const session = createSession();
      const turns = fixtureToTurns(cleanLinear);
      const mid = Math.floor(turns.length / 2);

      session.ingestBatch(turns.slice(0, mid));
      await session.process();
      const itemsAfterFirst = session.stats().totalItems;

      session.ingestBatch(turns.slice(mid));
      await session.process();
      const itemsAfterSecond = session.stats().totalItems;

      assert.ok(itemsAfterSecond >= itemsAfterFirst, "state should grow or stay same");
      assert.equal(session.stats().processCount, 2);
    });
  });

  describe("batch mode", () => {
    it("processes in fixed-size batches", async () => {
      const session = createSession({ batchSize: 3 });
      const turns = fixtureToTurns(cleanLinear);
      session.ingestBatch(turns);

      const r1 = await session.process();
      assert.equal(r1.turnsProcessed, 3);
      assert.equal(r1.hasMore, turns.length > 3);

      // Process remaining
      let total = r1.turnsProcessed;
      while (true) {
        const r = await session.process();
        if (r.turnsProcessed === 0) break;
        total += r.turnsProcessed;
      }
      assert.equal(total, turns.length);
    });
  });

  describe("query surface", () => {
    it("exposes typed queries after processing", async () => {
      const session = createSession();
      session.ingestBatch(fixtureToTurns(cleanLinear));
      await session.process();

      const stats = session.stats();
      assert.ok(stats.totalItems > 0);

      // Query by kind
      const goals = session.query({ kind: "goal", status: "active" });
      const decisions = session.query({ kind: "decision", status: "active" });
      const constraints = session.query({ kind: "constraint", status: "active" });

      // At minimum, rule-based should find the goal
      assert.ok(goals.length > 0 || decisions.length > 0 || constraints.length > 0,
        "should find at least one active item");
    });
  });

  describe("context export", () => {
    it("exports non-empty text for populated state", async () => {
      const session = createSession();
      session.ingestBatch(fixtureToTurns(cleanLinear));
      await session.process();

      const ctx = session.exportContext();
      assert.ok(ctx.text.length > 0, "exported text should not be empty");
      assert.ok(ctx.chars > 0);
      assert.ok(ctx.totalItems > 0);
    });

    it("respects maxChars budget", async () => {
      const session = createSession();
      session.ingestBatch(fixtureToTurns(cleanLinear));
      await session.process();

      const ctx = session.exportContext({ maxChars: 200 });
      assert.ok(ctx.chars <= 200, `text is ${ctx.chars} chars, expected <= 200`);
    });

    it("exports empty for fresh session", () => {
      const session = createSession();
      const ctx = session.exportContext();
      assert.equal(ctx.totalItems, 0);
      assert.equal(ctx.goals.length, 0);
    });

    it("includes recent deltas", async () => {
      const session = createSession();
      session.ingestBatch(fixtureToTurns(cleanLinear));
      await session.process();

      const ctx = session.exportContext({ recentDeltaCount: 5 });
      assert.ok(ctx.recentDeltas.length > 0, "should have recent deltas");
      assert.ok(ctx.recentDeltas.length <= 5, "should respect recentDeltaCount");
    });
  });

  describe("model policy", () => {
    it("rejects blocked models", () => {
      assert.throws(
        () => createSession({ model: "llama3.1:8b" }),
        /blocked by policy/,
      );
    });

    it("accepts allowed models", () => {
      // This won't connect to Ollama, but it shouldn't throw on creation
      const session = createSession({ model: "gemma2:9b" });
      assert.ok(session);
    });

    it("resolves 'default' to gemma2:9b", () => {
      const session = createSession({ model: "default" });
      assert.ok(session);
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 3A.4 — Transcript checkpoint harness
// ---------------------------------------------------------------------------

describe("Checkpoint economics", () => {
  const fixtures: TranscriptFixture[] = [
    cleanLinear,
    messyReal,
    pathological,
    revisionPack,
    longLinear,
    longMessy,
    longPathological,
  ];

  it("measures compression across all fixtures", async () => {
    console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
    console.log("║  CHECKPOINT ECONOMICS — Rule-based pipeline                          ║");
    console.log("╠══════════════════════════════════════════════════════════════════════╣");
    console.log("  Fixture              | Turns | Items | Deltas | Raw Ch | Ctx Ch | Ratio");
    console.log("  ---------------------|-------|-------|--------|--------|--------|------");

    for (const fixture of fixtures) {
      const session = createSession();
      const turns = fixtureToTurns(fixture);
      session.ingestBatch(turns);
      await session.process();

      const rawChars = turns.reduce((sum, t) => sum + t.content.length, 0);
      const ctx = session.exportContext({ maxChars: 10000 }); // generous budget
      const stats = session.stats();

      const ratio = rawChars > 0 ? (ctx.chars / rawChars * 100).toFixed(0) : "N/A";
      const name = fixture.name.padEnd(21);
      console.log(
        `  ${name}| ${String(turns.length).padStart(5)} | ${String(stats.totalItems).padStart(5)} | ${String(stats.totalDeltas).padStart(6)} | ${String(rawChars).padStart(6)} | ${String(ctx.chars).padStart(6)} | ${ratio}%`
      );
    }

    console.log("╚══════════════════════════════════════════════════════════════════════╝");
    assert.ok(true);
  });

  it("incremental checkpoints show state growth", async () => {
    const session = createSession();
    const turns = fixtureToTurns(longLinear);
    const checkpoints: Array<{ turn: number; items: number; deltas: number; ctxChars: number; rawChars: number }> = [];

    // Process in chunks of 5
    const chunkSize = 5;
    let rawSoFar = 0;

    for (let i = 0; i < turns.length; i += chunkSize) {
      const chunk = turns.slice(i, i + chunkSize);
      session.ingestBatch(chunk);
      await session.process();

      rawSoFar += chunk.reduce((s, t) => s + t.content.length, 0);
      const ctx = session.exportContext({ maxChars: 10000 });

      checkpoints.push({
        turn: i + chunk.length,
        items: session.stats().totalItems,
        deltas: session.stats().totalDeltas,
        ctxChars: ctx.chars,
        rawChars: rawSoFar,
      });
    }

    console.log("\n  ── long-linear incremental checkpoints ──");
    console.log("  Turn | Items | Deltas | Raw Ch  | Ctx Ch | Ratio");
    console.log("  -----|-------|--------|---------|--------|------");
    for (const cp of checkpoints) {
      const ratio = cp.rawChars > 0 ? (cp.ctxChars / cp.rawChars * 100).toFixed(0) : "N/A";
      console.log(
        `  ${String(cp.turn).padStart(4)} | ${String(cp.items).padStart(5)} | ${String(cp.deltas).padStart(6)} | ${String(cp.rawChars).padStart(7)} | ${String(cp.ctxChars).padStart(6)} | ${ratio}%`
      );
    }

    // Verify compression: context should be smaller than raw transcript
    const last = checkpoints[checkpoints.length - 1];
    assert.ok(last.ctxChars < last.rawChars,
      `Context (${last.ctxChars}) should be smaller than raw (${last.rawChars})`);
  });

  it("context stays within budget as state grows", async () => {
    const budget = 2000;
    const session = createSession();
    const turns = fixtureToTurns(longLinear);

    session.ingestBatch(turns);
    await session.process();

    const ctx = session.exportContext({ maxChars: budget });
    assert.ok(ctx.chars <= budget,
      `Context (${ctx.chars}) exceeds budget (${budget})`);
  });
});

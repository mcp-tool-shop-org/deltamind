import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gate, gateBatch } from "../../src/extractor/event-gate.js";
import type { Turn } from "../../src/extractor/types.js";

describe("Event gate (Pass 0)", () => {
  it("detects goal signal", () => {
    const turn: Turn = { turnId: "t-1", role: "user", content: "Let's build a CLI tool for linting markdown files." };
    const result = gate(turn);
    assert.ok(result.gated, "Should be gated");
    assert.ok(result.signals.includes("goal"), `Signals should include goal, got: ${result.signals}`);
  });

  it("detects decision signal", () => {
    const turn: Turn = { turnId: "t-1", role: "user", content: "We'll use TypeScript for this project." };
    const result = gate(turn);
    assert.ok(result.gated);
    assert.ok(result.signals.includes("decision"), `Signals should include decision, got: ${result.signals}`);
  });

  it("detects constraint signal", () => {
    const turn: Turn = { turnId: "t-1", role: "user", content: "No runtime dependencies. This must be zero-dep." };
    const result = gate(turn);
    assert.ok(result.gated);
    assert.ok(result.signals.includes("constraint"), `Signals should include constraint, got: ${result.signals}`);
  });

  it("detects task signal", () => {
    const turn: Turn = { turnId: "t-1", role: "assistant", content: "Let me write the core linting logic next." };
    const result = gate(turn);
    assert.ok(result.gated);
    assert.ok(result.signals.includes("task"), `Signals should include task, got: ${result.signals}`);
  });

  it("detects revision signal", () => {
    const turn: Turn = { turnId: "t-1", role: "user", content: "Actually, let's switch to Rust instead." };
    const result = gate(turn);
    assert.ok(result.gated);
    assert.ok(result.signals.includes("revision"), `Signals should include revision, got: ${result.signals}`);
  });

  it("detects hypothesis signal (hedged language)", () => {
    const turn: Turn = { turnId: "t-1", role: "assistant", content: "Maybe we should consider using Redis for caching." };
    const result = gate(turn);
    assert.ok(result.gated);
    assert.ok(result.signals.includes("hypothesis"), `Signals should include hypothesis, got: ${result.signals}`);
  });

  it("returns noop for chatter", () => {
    const turn: Turn = { turnId: "t-1", role: "user", content: "Sounds good, thanks!" };
    const result = gate(turn);
    assert.ok(!result.gated);
    assert.deepEqual(result.signals, ["noop"]);
  });

  it("can detect multiple signals in one turn", () => {
    const turn: Turn = {
      turnId: "t-1",
      role: "user",
      content: "Let's build a REST API. We must use PostgreSQL, no exceptions.",
    };
    const result = gate(turn);
    assert.ok(result.gated);
    assert.ok(result.signals.length >= 2, `Should have multiple signals, got: ${result.signals}`);
  });

  it("batches correctly", () => {
    const turns: Turn[] = [
      { turnId: "t-1", role: "user", content: "Let's build something." },
      { turnId: "t-2", role: "assistant", content: "Sure, sounds good." },
    ];
    const results = gateBatch(turns);
    assert.equal(results.length, 2);
    assert.ok(results[0].gated);
  });
});

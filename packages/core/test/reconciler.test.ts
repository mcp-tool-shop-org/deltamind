import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createState, reconcile, activeDecisions, activeConstraints, openTasks, supersededItems } from "../src/index.js";
import type { MemoryDelta } from "../src/index.js";

const src = (turnId: string) => [{ turnId }];
const ts = () => new Date().toISOString();

describe("Reconciler invariants", () => {
  it("invariant 1: item cannot be both active and superseded", () => {
    const state = createState();
    const { state: s1 } = reconcile(state, [
      { kind: "decision_made", id: "d-1", summary: "use mdBook", confidence: "high", sourceTurns: src("t-1"), timestamp: ts() },
    ]);
    assert.equal(s1.items.get("d-1")?.status, "active");

    const { state: s2 } = reconcile(s1, [
      { kind: "item_superseded", targetId: "d-1", reason: "switched to Starlight", sourceTurns: src("t-5"), timestamp: ts() },
    ]);
    assert.equal(s2.items.get("d-1")?.status, "superseded");
    assert.notEqual(s2.items.get("d-1")?.status, "active");
  });

  it("invariant 2: rejects delta with empty sourceTurns", () => {
    const state = createState();
    const result = reconcile(state, [
      { kind: "fact_learned", id: "f-1", summary: "sky is blue", confidence: "certain", sourceTurns: [], timestamp: ts() },
    ]);
    assert.equal(result.rejected.length, 1);
    assert.match(result.rejected[0].reason, /provenance/i);
    assert.equal(state.items.size, 0);
  });

  it("invariant 3: decision_revised rejects if target missing", () => {
    const state = createState();
    const result = reconcile(state, [
      { kind: "decision_revised", targetId: "d-999", summary: "changed plan", sourceTurns: src("t-1"), timestamp: ts() },
    ]);
    assert.equal(result.rejected.length, 1);
    assert.match(result.rejected[0].reason, /not found/i);
  });

  it("invariant 3: decision_revised rejects if target is not a decision", () => {
    const state = createState();
    reconcile(state, [
      { kind: "task_opened", id: "t-1", summary: "write tests", sourceTurns: src("turn-1"), timestamp: ts() },
    ]);
    const result = reconcile(state, [
      { kind: "decision_revised", targetId: "t-1", summary: "changed", sourceTurns: src("turn-2"), timestamp: ts() },
    ]);
    assert.equal(result.rejected.length, 1);
    assert.match(result.rejected[0].reason, /not decision/i);
  });

  it("invariant 6: source turns are append-only", () => {
    const state = createState();
    reconcile(state, [
      { kind: "decision_made", id: "d-1", summary: "v1", confidence: "medium", sourceTurns: src("t-1"), timestamp: ts() },
    ]);

    reconcile(state, [
      { kind: "decision_revised", targetId: "d-1", summary: "v2", sourceTurns: src("t-5"), timestamp: ts() },
    ]);

    const item = state.items.get("d-1")!;
    assert.equal(item.sourceTurns.length, 2);
    assert.equal(item.sourceTurns[0].turnId, "t-1");
    assert.equal(item.sourceTurns[1].turnId, "t-5");
  });

  it("invariant 6: duplicate source turns are not appended", () => {
    const state = createState();
    reconcile(state, [
      { kind: "decision_made", id: "d-1", summary: "v1", confidence: "medium", sourceTurns: src("t-1"), timestamp: ts() },
    ]);
    reconcile(state, [
      { kind: "decision_revised", targetId: "d-1", summary: "v2", sourceTurns: src("t-1"), timestamp: ts() },
    ]);

    const item = state.items.get("d-1")!;
    assert.equal(item.sourceTurns.length, 1);
  });
});

describe("Reconciler operations", () => {
  it("applies decision_made", () => {
    const state = createState();
    const result = reconcile(state, [
      { kind: "decision_made", id: "d-1", summary: "use TypeScript", confidence: "certain", sourceTurns: src("t-1"), timestamp: ts() },
    ]);
    assert.equal(result.rejected.length, 0);
    assert.equal(result.events.length, 1);
    assert.equal(state.items.size, 1);

    const decisions = activeDecisions(state);
    assert.equal(decisions.length, 1);
    assert.equal(decisions[0].summary, "use TypeScript");
  });

  it("applies constraint_added (hard)", () => {
    const state = createState();
    reconcile(state, [
      { kind: "constraint_added", id: "c-1", summary: "no telemetry", hard: true, sourceTurns: src("t-2"), timestamp: ts() },
    ]);

    const constraints = activeConstraints(state);
    assert.equal(constraints.length, 1);
    assert.equal(constraints[0].confidence, "certain");
    assert.ok(constraints[0].tags?.includes("hard"));
  });

  it("applies task_opened and task_closed", () => {
    const state = createState();
    reconcile(state, [
      { kind: "task_opened", id: "task-1", summary: "write tests", sourceTurns: src("t-3"), timestamp: ts() },
    ]);
    assert.equal(openTasks(state).length, 1);

    reconcile(state, [
      { kind: "task_closed", targetId: "task-1", resolution: "done, 12 tests passing", sourceTurns: src("t-10"), timestamp: ts() },
    ]);
    assert.equal(openTasks(state).length, 0);
    assert.equal(state.items.get("task-1")?.status, "resolved");
  });

  it("task_closed rejects if target missing", () => {
    const state = createState();
    const result = reconcile(state, [
      { kind: "task_closed", targetId: "nope", resolution: "done", sourceTurns: src("t-1"), timestamp: ts() },
    ]);
    assert.equal(result.rejected.length, 1);
  });

  it("applies fact_learned", () => {
    const state = createState();
    reconcile(state, [
      { kind: "fact_learned", id: "f-1", summary: "RTX 5080 has 16GB VRAM", confidence: "certain", sourceTurns: src("t-4"), timestamp: ts() },
    ]);
    assert.equal(state.items.get("f-1")?.kind, "fact");
    assert.equal(state.items.get("f-1")?.status, "active");
  });

  it("applies hypothesis_introduced as tentative", () => {
    const state = createState();
    reconcile(state, [
      { kind: "hypothesis_introduced", id: "h-1", summary: "mdBook might work", confidence: "low", sourceTurns: src("t-6"), timestamp: ts() },
    ]);
    assert.equal(state.items.get("h-1")?.status, "tentative");
  });

  it("applies branch_created", () => {
    const state = createState();
    reconcile(state, [
      { kind: "branch_created", id: "b-1", alternatives: ["option A", "option B"], sourceTurns: src("t-7"), timestamp: ts() },
    ]);
    const item = state.items.get("b-1")!;
    assert.equal(item.status, "tentative");
    assert.ok(item.tags?.includes("branch"));
    assert.ok(item.tags?.includes("option A"));
  });

  it("applies item_superseded", () => {
    const state = createState();
    reconcile(state, [
      { kind: "decision_made", id: "d-1", summary: "use REST", confidence: "high", sourceTurns: src("t-1"), timestamp: ts() },
    ]);
    reconcile(state, [
      { kind: "item_superseded", targetId: "d-1", reason: "switched to GraphQL", sourceTurns: src("t-8"), timestamp: ts() },
    ]);
    assert.equal(supersededItems(state).length, 1);
    assert.match(state.items.get("d-1")!.summary, /superseded/);
  });

  it("applies goal_set", () => {
    const state = createState();
    reconcile(state, [
      { kind: "goal_set", id: "g-1", summary: "publish v2.0.0", confidence: "high", sourceTurns: src("t-9"), timestamp: ts() },
    ]);
    assert.equal(state.items.get("g-1")?.kind, "goal");
    assert.equal(state.items.get("g-1")?.status, "active");
  });

  it("handles duplicate item IDs by updating", () => {
    const state = createState();
    reconcile(state, [
      { kind: "fact_learned", id: "f-1", summary: "v1", confidence: "medium", sourceTurns: src("t-1"), timestamp: ts() },
    ]);
    reconcile(state, [
      { kind: "fact_learned", id: "f-1", summary: "v2 corrected", confidence: "high", sourceTurns: src("t-5"), timestamp: ts() },
    ]);
    assert.equal(state.items.size, 1);
    assert.equal(state.items.get("f-1")?.summary, "v2 corrected");
    assert.equal(state.items.get("f-1")?.confidence, "high");
    assert.equal(state.items.get("f-1")?.sourceTurns.length, 2);
  });

  it("processes a batch with mixed valid and invalid deltas", () => {
    const state = createState();
    const result = reconcile(state, [
      { kind: "fact_learned", id: "f-1", summary: "valid", confidence: "high", sourceTurns: src("t-1"), timestamp: ts() },
      { kind: "decision_revised", targetId: "d-999", summary: "orphan", sourceTurns: src("t-2"), timestamp: ts() },
      { kind: "goal_set", id: "g-1", summary: "also valid", confidence: "medium", sourceTurns: src("t-3"), timestamp: ts() },
    ]);
    assert.equal(result.events.length, 2);
    assert.equal(result.rejected.length, 1);
    assert.equal(state.items.size, 2);
  });

  it("seq increments on each successful delta", () => {
    const state = createState();
    assert.equal(state.seq, 0);
    reconcile(state, [
      { kind: "fact_learned", id: "f-1", summary: "a", confidence: "high", sourceTurns: src("t-1"), timestamp: ts() },
      { kind: "fact_learned", id: "f-2", summary: "b", confidence: "high", sourceTurns: src("t-2"), timestamp: ts() },
    ]);
    assert.equal(state.seq, 2);
  });
});

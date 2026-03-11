/**
 * Clean linear session: simple goal progression, a few decisions,
 * a closed task, one revision. No backtracking.
 */

import type { TranscriptFixture } from "../harness/fixture-types.js";

const ts = "2026-03-11T10:00:00.000Z";

export const cleanLinear: TranscriptFixture = {
  name: "clean-linear",
  class: "clean",
  description: "Simple project setup: set goal, add constraint, make decisions, open and close a task, revise one decision.",
  turns: [
    { turnId: "t-1", role: "user", content: "Let's build a CLI tool for linting markdown files. It should be written in TypeScript." },
    { turnId: "t-2", role: "assistant", content: "Got it. I'll set up a TypeScript CLI for markdown linting. Let me scaffold the project." },
    { turnId: "t-3", role: "user", content: "Important: no runtime dependencies. This must be zero-dep." },
    { turnId: "t-4", role: "assistant", content: "Understood — zero runtime dependencies is a hard constraint. I'll use only Node built-ins." },
    { turnId: "t-5", role: "user", content: "Use commander for the CLI argument parsing actually." },
    { turnId: "t-6", role: "assistant", content: "Noted — we'll use commander for arg parsing. That revises the zero-dep constraint to allow commander as the sole exception." },
    { turnId: "t-7", role: "assistant", content: "I've created the initial scaffold. Let me write the core linting logic next." },
    { turnId: "t-8", role: "user", content: "The core linter is done, looks good. Now write tests for it." },
    { turnId: "t-9", role: "assistant", content: "Tests written and passing — 14 test cases covering all lint rules." },
  ],
  expectedDeltas: [
    // t-1: goal + decision
    { kind: "goal_set", id: "g-1", summary: "Build a CLI tool for linting markdown files", confidence: "high", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
    { kind: "decision_made", id: "d-1", summary: "Use TypeScript", confidence: "certain", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
    // t-3: hard constraint
    { kind: "constraint_added", id: "c-1", summary: "No runtime dependencies (zero-dep)", hard: true, sourceTurns: [{ turnId: "t-3" }], timestamp: ts },
    // t-5/t-6: new decision + constraint relaxation (not supersession — it's an amendment)
    { kind: "decision_made", id: "d-2", summary: "Use commander for CLI argument parsing", confidence: "high", sourceTurns: [{ turnId: "t-5" }], timestamp: ts },
    { kind: "constraint_revised", targetId: "c-1", summary: "Zero-dep constraint relaxed to allow commander as sole exception", mode: "relaxed", sourceTurns: [{ turnId: "t-6" }], timestamp: ts },
    // t-7: task opened
    { kind: "task_opened", id: "task-1", summary: "Write core linting logic", sourceTurns: [{ turnId: "t-7" }], timestamp: ts },
    // t-8: task closed, new task opened
    { kind: "task_closed", targetId: "task-1", resolution: "Core linter done, approved by user", sourceTurns: [{ turnId: "t-8" }], timestamp: ts },
    { kind: "task_opened", id: "task-2", summary: "Write tests for core linter", sourceTurns: [{ turnId: "t-8" }], timestamp: ts },
    // t-9: task closed
    { kind: "task_closed", targetId: "task-2", resolution: "14 test cases passing", sourceTurns: [{ turnId: "t-9" }], timestamp: ts },
  ],
  expectedItems: [
    { id: "g-1", kind: "goal", status: "active", summaryContains: "CLI", minSourceTurns: 1 },
    { id: "d-1", kind: "decision", status: "active", summaryContains: "TypeScript", minSourceTurns: 1 },
    { id: "d-2", kind: "decision", status: "active", summaryContains: "commander", minSourceTurns: 1 },
    { id: "c-1", kind: "constraint", status: "active", summaryContains: "dep", minSourceTurns: 1 },
    { id: "task-1", kind: "task", status: "resolved", summaryContains: "linting", minSourceTurns: 2 },
    { id: "task-2", kind: "task", status: "resolved", summaryContains: "tests", minSourceTurns: 2 },
  ],
  expectedQueries: {
    activeDecisionIds: ["d-1", "d-2"],
    activeConstraintIds: ["c-1"],
    openTaskIds: [],
    supersededIds: [],
    unresolvedBranchIds: [],
  },
};

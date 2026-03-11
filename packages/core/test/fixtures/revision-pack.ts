/**
 * Phase 2C.3 — Revision mini-pack.
 *
 * Focused eval for revision semantics:
 * - Direct decision replacement
 * - Constraint relaxation (carve-out/exception)
 * - Constraint tightening
 * - Decision reversal
 * - Partial rollback
 * - Wrong-target-class trap (looks like decision revision but targets constraint)
 */

import type { TranscriptFixture } from "../harness/fixture-types.js";

const ts = "2026-03-11T12:00:00.000Z";

export const revisionPack: TranscriptFixture = {
  name: "revision-pack",
  class: "messy",
  description: "Focused revision semantics: direct replacement, constraint relaxation, tightening, reversal, partial rollback, wrong-target trap.",
  turns: [
    // Setup: establish baseline state
    { turnId: "t-1", role: "user", content: "Let's build an API service. Use Express for the server framework." },
    { turnId: "t-2", role: "assistant", content: "Got it. Express-based API service. Let me set it up." },
    { turnId: "t-3", role: "user", content: "Important constraint: all responses must be under 200ms. Hard requirement." },
    { turnId: "t-4", role: "user", content: "We'll use PostgreSQL for the database. No other databases." },
    { turnId: "t-5", role: "assistant", content: "Understood. PostgreSQL only, 200ms response time constraint." },

    // --- Scenario 1: Direct decision replacement ---
    { turnId: "t-6", role: "user", content: "Actually, let's switch from Express to Fastify. It's faster for our use case." },

    // --- Scenario 2: Constraint relaxation (exception/carve-out) ---
    { turnId: "t-7", role: "user", content: "For batch export endpoints, allow up to 5 seconds response time. The 200ms limit still applies to everything else." },

    // --- Scenario 3: Constraint tightening ---
    { turnId: "t-8", role: "user", content: "Actually, tighten the response time. Regular endpoints must respond under 100ms, not 200ms." },

    // --- Scenario 4: Decision reversal ---
    { turnId: "t-9", role: "user", content: "Wait, go back to Express. Fastify doesn't have the middleware we need." },

    // --- Scenario 5: Partial rollback (revise but keep some) ---
    { turnId: "t-10", role: "user", content: "We can also use Redis for caching alongside PostgreSQL. The no-other-databases rule still applies for primary storage." },

    // --- Scenario 6: Wrong-target-class trap ---
    // This says "revise" but the target is a constraint, not a decision.
    // An extractors that always emits decision_revised will get this wrong.
    { turnId: "t-11", role: "user", content: "Revise the response time requirement: 100ms for reads, 500ms for writes." },

    // --- Scenario 7: Implicit amendment without explicit "revise" language ---
    { turnId: "t-12", role: "assistant", content: "Noted. I'll also add connection pooling to the PostgreSQL config — up to 20 connections max." },
    { turnId: "t-13", role: "user", content: "Limit it to 10 connections, not 20. We're on a shared cluster." },
  ],
  expectedDeltas: [
    // Setup
    { kind: "goal_set", id: "g-1", summary: "Build an API service", confidence: "high", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
    { kind: "decision_made", id: "d-1", summary: "Use Express for the server framework", confidence: "high", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
    { kind: "constraint_added", id: "c-1", summary: "All responses must be under 200ms", hard: true, sourceTurns: [{ turnId: "t-3" }], timestamp: ts },
    { kind: "decision_made", id: "d-2", summary: "Use PostgreSQL for the database", confidence: "high", sourceTurns: [{ turnId: "t-4" }], timestamp: ts },

    // Scenario 1: Direct decision replacement — d-1 revised
    { kind: "decision_revised", targetId: "d-1", summary: "Switch from Express to Fastify", sourceTurns: [{ turnId: "t-6" }], timestamp: ts },

    // Scenario 2: Constraint relaxation — c-1 relaxed for batch endpoints
    { kind: "constraint_revised", targetId: "c-1", summary: "200ms limit relaxed: batch export endpoints allowed up to 5 seconds", mode: "relaxed", sourceTurns: [{ turnId: "t-7" }], timestamp: ts },

    // Scenario 3: Constraint tightening — c-1 tightened for regular endpoints
    { kind: "constraint_revised", targetId: "c-1", summary: "Response time tightened to 100ms for regular endpoints", mode: "tightened", sourceTurns: [{ turnId: "t-8" }], timestamp: ts },

    // Scenario 4: Decision reversal — d-1 revised back to Express
    { kind: "decision_revised", targetId: "d-1", summary: "Reverted to Express — Fastify lacks needed middleware", sourceTurns: [{ turnId: "t-9" }], timestamp: ts },

    // Scenario 5: Constraint relaxation — PostgreSQL-only relaxed to allow Redis for caching
    { kind: "constraint_revised", targetId: "d-2", summary: "Redis allowed for caching alongside PostgreSQL; no-other-databases still applies for primary storage", mode: "relaxed", sourceTurns: [{ turnId: "t-10" }], timestamp: ts },

    // Scenario 6: Wrong-target trap — "revise requirement" targets constraint c-1, not a decision
    { kind: "constraint_revised", targetId: "c-1", summary: "Response time split: 100ms for reads, 500ms for writes", mode: "amended", sourceTurns: [{ turnId: "t-11" }], timestamp: ts },

    // Scenario 7: Constraint added then revised
    { kind: "constraint_added", id: "c-2", summary: "PostgreSQL connection pool max 20 connections", hard: false, sourceTurns: [{ turnId: "t-12" }], timestamp: ts },
    { kind: "constraint_revised", targetId: "c-2", summary: "Connection pool limited to 10 (shared cluster)", mode: "tightened", sourceTurns: [{ turnId: "t-13" }], timestamp: ts },
  ],
  expectedItems: [
    { id: "g-1", kind: "goal", status: "active", summaryContains: "API", minSourceTurns: 1 },
    { id: "d-1", kind: "decision", status: "active", summaryContains: "Express", minSourceTurns: 3 },
    { id: "d-2", kind: "decision", status: "active", summaryContains: "PostgreSQL", minSourceTurns: 1 },
    { id: "c-1", kind: "constraint", status: "active", summaryContains: "response", minSourceTurns: 4 },
    { id: "c-2", kind: "constraint", status: "active", summaryContains: "connection", minSourceTurns: 2 },
  ],
  expectedQueries: {
    activeDecisionIds: ["d-1", "d-2"],
    activeConstraintIds: ["c-1", "c-2"],
    openTaskIds: [],
    supersededIds: [],
    unresolvedBranchIds: [],
  },
};

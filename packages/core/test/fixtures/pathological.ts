/**
 * Pathological session: contradictions, duplicate decisions phrased differently,
 * unresolved forks, low-confidence hypotheses that should never become canon,
 * and premature canonization traps.
 */

import type { TranscriptFixture } from "../harness/fixture-types.js";

const ts = "2026-03-11T12:00:00.000Z";

export const pathological: TranscriptFixture = {
  name: "pathological",
  class: "pathological",
  description: "Adversarial session: contradictions, ambiguous hedging, duplicate semantics, unresolved forks, confidence traps.",
  turns: [
    { turnId: "t-1", role: "user", content: "We should probably use Redis for caching. Maybe. I'm not sure yet." },
    { turnId: "t-2", role: "assistant", content: "Redis is a solid option. We could also consider in-memory caching if the dataset is small enough." },
    { turnId: "t-3", role: "user", content: "Yeah, or maybe just use a Map. Actually Redis is better for distributed setups." },
    { turnId: "t-4", role: "user", content: "The cache layer needs to handle at least 10k entries." },
    { turnId: "t-5", role: "user", content: "We need the cache layer to support minimum 10,000 items." },
    { turnId: "t-6", role: "assistant", content: "Noted — cache must handle 10k+ entries. That's a hard requirement." },
    { turnId: "t-7", role: "user", content: "I've been thinking — maybe we don't need caching at all. The database is fast enough." },
    { turnId: "t-8", role: "assistant", content: "That would simplify the architecture significantly. Should I remove the cache layer from the design?" },
    { turnId: "t-9", role: "user", content: "No no, keep it. But make it optional. Feature-flagged." },
    { turnId: "t-10", role: "user", content: "The API should use REST. Actually, GraphQL might be better. Let me think about it." },
    { turnId: "t-11", role: "user", content: "For the database, PostgreSQL is the way to go. Or maybe SQLite for simplicity." },
    { turnId: "t-12", role: "assistant", content: "Both are good choices with different tradeoffs. PostgreSQL for scale, SQLite for simplicity and zero-ops." },
    { turnId: "t-13", role: "user", content: "Let's go with PostgreSQL. Wait — actually this is a desktop app, so SQLite makes way more sense." },
    { turnId: "t-14", role: "assistant", content: "SQLite it is for the desktop app. Good call — no external database process needed." },
  ],
  expectedDeltas: [
    // t-1: hypothesis, NOT decision — hedged language ("probably", "maybe", "not sure")
    { kind: "hypothesis_introduced", id: "h-1", summary: "Redis for caching (user uncertain)", confidence: "low", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
    // t-2: branch — Redis vs in-memory
    { kind: "branch_created", id: "b-1", alternatives: ["Redis", "in-memory Map"], sourceTurns: [{ turnId: "t-2" }], timestamp: ts },
    // t-4: constraint (10k entries)
    { kind: "constraint_added", id: "c-1", summary: "Cache must handle at least 10k entries", hard: true, sourceTurns: [{ turnId: "t-4" }], timestamp: ts },
    // t-5: DUPLICATE of t-4 — should NOT create new item. Same constraint, different words.
    // t-7: this challenges the entire caching premise but does NOT kill it
    { kind: "hypothesis_introduced", id: "h-2", summary: "Caching may be unnecessary — database might be fast enough", confidence: "medium", sourceTurns: [{ turnId: "t-7" }], timestamp: ts },
    // t-9: resolution — cache stays but optional
    { kind: "item_superseded", targetId: "h-2", reason: "User decided to keep cache but make it optional", sourceTurns: [{ turnId: "t-9" }], timestamp: ts },
    { kind: "decision_made", id: "d-1", summary: "Cache layer is optional, feature-flagged", confidence: "high", sourceTurns: [{ turnId: "t-9" }], timestamp: ts },
    // t-10: unresolved branch — REST vs GraphQL, NO decision made
    { kind: "branch_created", id: "b-2", alternatives: ["REST API", "GraphQL API"], sourceTurns: [{ turnId: "t-10" }], timestamp: ts },
    // t-11: another branch — PostgreSQL vs SQLite
    { kind: "branch_created", id: "b-3", alternatives: ["PostgreSQL", "SQLite"], sourceTurns: [{ turnId: "t-11" }], timestamp: ts },
    // t-13: branch resolved — SQLite wins, with context
    { kind: "item_superseded", targetId: "b-3", reason: "Resolved: SQLite chosen for desktop app", sourceTurns: [{ turnId: "t-13" }], timestamp: ts },
    { kind: "decision_made", id: "d-2", summary: "Use SQLite (desktop app, no external DB process)", confidence: "certain", sourceTurns: [{ turnId: "t-13" }], timestamp: ts },
    { kind: "fact_learned", id: "f-1", summary: "This is a desktop application", confidence: "certain", sourceTurns: [{ turnId: "t-13" }], timestamp: ts },
  ],
  expectedItems: [
    // h-1 should remain tentative/low — NOT promoted to active decision
    { id: "h-1", kind: "hypothesis", status: "tentative", summaryContains: "Redis", minSourceTurns: 1 },
    // b-1 (Redis vs in-memory) is still technically unresolved — d-1 says "optional" but doesn't pick Redis vs Map
    { id: "b-1", kind: "hypothesis", status: "tentative", summaryContains: "Redis", minSourceTurns: 1 },
    // c-1 exists once despite being stated twice (t-4 and t-5)
    { id: "c-1", kind: "constraint", status: "active", summaryContains: "10k", minSourceTurns: 1 },
    // h-2 superseded — "maybe no cache" was overruled
    { id: "h-2", kind: "hypothesis", status: "superseded", summaryContains: "superseded", minSourceTurns: 2 },
    // d-1: cache is optional
    { id: "d-1", kind: "decision", status: "active", summaryContains: "optional", minSourceTurns: 1 },
    // b-2: REST vs GraphQL — STILL UNRESOLVED
    { id: "b-2", kind: "hypothesis", status: "tentative", summaryContains: "REST", minSourceTurns: 1 },
    // b-3: PostgreSQL vs SQLite — resolved
    { id: "b-3", kind: "hypothesis", status: "superseded", summaryContains: "superseded", minSourceTurns: 2 },
    // d-2: SQLite chosen
    { id: "d-2", kind: "decision", status: "active", summaryContains: "SQLite", minSourceTurns: 1 },
    // f-1: desktop app fact
    { id: "f-1", kind: "fact", status: "active", summaryContains: "desktop", minSourceTurns: 1 },
  ],
  expectedQueries: {
    activeDecisionIds: ["d-1", "d-2"],
    activeConstraintIds: ["c-1"],
    openTaskIds: [],
    supersededIds: ["h-2", "b-3"],
    // KEY: b-1 (cache tech) and b-2 (API style) are STILL unresolved
    unresolvedBranchIds: ["b-1", "b-2"],
  },
};

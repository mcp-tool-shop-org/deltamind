/**
 * Messy real session: backtracking, repeated constraints, "actually never mind,"
 * speculative branches, changed plans.
 */

import type { TranscriptFixture } from "../harness/fixture-types.js";

const ts = "2026-03-11T11:00:00.000Z";

export const messyReal: TranscriptFixture = {
  name: "messy-real",
  class: "messy",
  description: "Docs platform selection with backtracking, branch, plan change, repeated constraints, and a reversal.",
  turns: [
    { turnId: "t-1", role: "user", content: "I need a documentation site for the project. Let's use mdBook." },
    { turnId: "t-2", role: "assistant", content: "Sure, mdBook is a good choice for Rust-style docs. I'll set it up." },
    { turnId: "t-3", role: "user", content: "Wait, actually — we might want Starlight instead. It has better plugin support." },
    { turnId: "t-4", role: "assistant", content: "Both are viable. mdBook is simpler but Starlight has richer theming and i18n. Should I prototype both?" },
    { turnId: "t-5", role: "user", content: "Yeah, let's keep both options open for now. Also, whatever we pick must support dark mode." },
    { turnId: "t-6", role: "user", content: "Oh and dark mode is non-negotiable. I mentioned that right?" },
    { turnId: "t-7", role: "assistant", content: "Yes, dark mode is noted as a hard constraint. Both mdBook and Starlight support it." },
    { turnId: "t-8", role: "user", content: "Actually never mind the mdBook option. Let's go with Starlight. The plugin ecosystem seals it." },
    { turnId: "t-9", role: "assistant", content: "Starlight it is. I'll set up the Astro + Starlight scaffold now." },
    { turnId: "t-10", role: "user", content: "One more thing — each product repo should have its own docs site, not a shared hub." },
    { turnId: "t-11", role: "assistant", content: "Got it — per-repo docs sites, no shared hub. That means each repo gets its own Starlight instance." },
    { turnId: "t-12", role: "user", content: "Can you check if Starlight supports monorepo setups? Actually, it doesn't matter, we're doing per-repo." },
  ],
  expectedDeltas: [
    // t-1: goal + decision
    { kind: "goal_set", id: "g-1", summary: "Create documentation site for the project", confidence: "high", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
    { kind: "decision_made", id: "d-1", summary: "Use mdBook for docs", confidence: "high", sourceTurns: [{ turnId: "t-1" }], timestamp: ts },
    // t-3: branch introduced
    { kind: "branch_created", id: "b-1", alternatives: ["mdBook", "Starlight"], sourceTurns: [{ turnId: "t-3" }], timestamp: ts },
    // t-5: constraint
    { kind: "constraint_added", id: "c-1", summary: "Must support dark mode", hard: true, sourceTurns: [{ turnId: "t-5" }], timestamp: ts },
    // t-6: duplicate constraint — should NOT create a new item (dedup)
    // t-8: branch resolved, decision superseded + new decision
    { kind: "item_superseded", targetId: "d-1", reason: "User chose Starlight over mdBook", sourceTurns: [{ turnId: "t-8" }], timestamp: ts },
    { kind: "item_superseded", targetId: "b-1", reason: "Branch resolved: Starlight chosen", sourceTurns: [{ turnId: "t-8" }], timestamp: ts },
    { kind: "decision_made", id: "d-2", summary: "Use Starlight (Astro) for docs", confidence: "certain", sourceTurns: [{ turnId: "t-8" }], timestamp: ts },
    // t-10: architectural decision
    { kind: "decision_made", id: "d-3", summary: "Per-repo docs sites, no shared hub", confidence: "certain", sourceTurns: [{ turnId: "t-10" }], timestamp: ts },
    // t-10: rejected option
    { kind: "fact_learned", id: "f-1", summary: "Shared docs hub was considered and rejected in favor of per-repo sites", confidence: "certain", sourceTurns: [{ turnId: "t-10" }], timestamp: ts },
    // t-12: no-op chatter — monorepo question immediately self-cancelled
  ],
  expectedItems: [
    { id: "g-1", kind: "goal", status: "active", summaryContains: "documentation", minSourceTurns: 1 },
    { id: "d-1", kind: "decision", status: "superseded", summaryContains: "superseded", minSourceTurns: 2 },
    { id: "d-2", kind: "decision", status: "active", summaryContains: "Starlight", minSourceTurns: 1 },
    { id: "d-3", kind: "decision", status: "active", summaryContains: "per-repo", minSourceTurns: 1 },
    { id: "b-1", kind: "hypothesis", status: "superseded", summaryContains: "superseded", minSourceTurns: 2 },
    { id: "c-1", kind: "constraint", status: "active", summaryContains: "dark mode", minSourceTurns: 1 },
    { id: "f-1", kind: "fact", status: "active", summaryContains: "shared", minSourceTurns: 1 },
  ],
  expectedQueries: {
    activeDecisionIds: ["d-2", "d-3"],
    activeConstraintIds: ["c-1"],
    openTaskIds: [],
    supersededIds: ["d-1", "b-1"],
    unresolvedBranchIds: [],
  },
};

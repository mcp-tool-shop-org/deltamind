---
title: Delta Types
description: The 11 typed state changes DeltaMind tracks — schema, semantics, and when each fires.
sidebar:
  order: 3
---

DeltaMind defines 11 delta types. Each represents a specific kind of state change in a conversation. Deltas are typed unions — the TypeScript compiler enforces field requirements per kind.

## Backbone deltas

These are the primary state mutations that drive the working set.

### `goal_set`

What the session is trying to achieve. Goals are broad — "build a REST API" not "write the auth middleware."

```typescript
{
  kind: "goal_set",
  id: "item-1",
  summary: "Build a REST API with TypeScript",
  confidence: "high",
  sourceTurns: [{ turnId: "t-1" }],
  timestamp: "2026-03-11T..."
}
```

### `decision_made`

A settled choice. The user or assistant decided something concrete.

Fields: `id`, `summary`, `confidence`, `sourceTurns`.

### `decision_revised`

A change to a prior decision. Points to the original via `targetId`.

Fields: `targetId` (must reference an existing decision), `summary` (the new decision), `sourceTurns`.

The reconciler enforces type scoping: `decision_revised` can only target decisions. Attempting to revise a constraint with this delta type produces a rejection.

### `constraint_added`

A rule, boundary, or requirement. "No external databases." "Must support offline mode." "Budget is $500."

Fields: `id`, `summary`, `hard` (boolean — hard constraints are non-negotiable), `sourceTurns`.

### `constraint_revised`

A change to an existing constraint. Includes a `mode` field:

- **relaxed** — the constraint was loosened ("allow commander as sole exception to zero-dep")
- **tightened** — the constraint was made stricter ("actually, no exceptions at all")
- **amended** — the constraint was modified in a way that's neither purely looser nor stricter

Fields: `targetId` (must reference an existing constraint), `summary`, `mode`, `sourceTurns`.

This delta type was added in Phase 2C after model sweep data showed that constraint relaxations were being forced into `decision_revised`, causing type-mismatch rejections.

### `task_opened`

Work to be done. Concrete and actionable.

Fields: `id`, `summary`, `sourceTurns`.

### `task_closed`

Work completed or abandoned. Points to the open task via `targetId`.

Fields: `targetId`, `resolution` ("completed" or "abandoned"), `sourceTurns`.

## Knowledge deltas

### `fact_learned`

A stable piece of knowledge. Not a decision — a fact. "The API uses port 3000." "The database is PostgreSQL 15."

Fields: `id`, `summary`, `confidence`, `sourceTurns`.

### `hypothesis_introduced`

A tentative idea. Explicitly not a decision. "Maybe we should use Redis for caching?" stays a hypothesis until explicitly promoted.

This distinction is critical for safety. The system's zero-canonization invariant depends on hypotheses remaining tentative. They are tagged with `tentative` status and excluded from memory promotion suggestions.

Fields: `id`, `summary`, `confidence` (usually `"low"` or `"medium"`), `sourceTurns`.

### `branch_created`

Unresolved alternatives. "We could do A, B, or C." Preserved as a fork, not flattened.

Fields: `id`, `alternatives` (string array), `sourceTurns`.

Branch items are tagged with `"branch"` and excluded from memory promotion.

## Lifecycle delta

### `item_superseded`

Marks an existing item as replaced by something newer. The old item's status changes to `superseded` but it remains in state for history.

Fields: `targetId` (the item being superseded), `reason`, `sourceTurns`.

## Delta flow

```
Turn text → Extractor emits CandidateDelta → Normalizer deduplicates → Reconciler applies → State updated
```

The extractor proposes. The reconciler decides. Invalid proposals are rejected with reasons logged to provenance.

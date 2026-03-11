---
title: Reconciliation Invariants
description: The non-negotiable truths the reconciler enforces — why rejections are features, not bugs.
sidebar:
  order: 4
---

The reconciler is DeltaMind's truth authority. It applies candidate deltas to state and enforces invariants. When a candidate violates an invariant, it is rejected — logged to provenance with a reason, never silently dropped.

## The invariants

These always hold after reconciliation completes. They are tested. They are non-negotiable.

### 1. No dual status

An item cannot be both `active` and `superseded`. Status transitions are one-way: active → superseded, active → resolved. There is no path from superseded back to active.

### 2. Provenance is mandatory

Every accepted delta must have provenance — at least one source turn ID. Deltas without provenance are rejected. This ensures every piece of state can be traced back to the conversation that produced it.

### 3. Type-scoped revisions

`decision_revised` must point to an existing decision. Not a constraint, not a task, not a fact. The reconciler checks the target's kind before applying.

`constraint_revised` must point to an existing constraint. Same rule.

This invariant was strengthened in Phase 2C after model sweep data showed LLMs sometimes emit `decision_revised` targeting constraints. The system now rejects these rather than corrupting the type graph.

### 4. Valid targets required

Revision and supersession deltas reference existing items by `targetId`. If the target doesn't exist, the delta is rejected. Typos and hallucinated IDs cannot corrupt state.

### 5. Confidence changes, provenance appends

An item's confidence tier can change (high → medium, or medium → high) as new evidence arrives. But source turns are append-only — new sources are added, old ones are never removed. History is monotonic.

### 6. Extractor output stays separate

Candidate deltas are proposals. Reconciled state is truth. The extractor never writes directly to state. This separation means extractor bugs produce rejected candidates, not corrupted state.

### 7. Temporal ordering

The sequence counter (`seq`) monotonically increases. Every reconciliation step advances the sequence. Snapshots record their sequence number. Provenance events record theirs. This makes it possible to answer "what changed since seq N?"

## What rejection means

A rejection is not an error. It means the system caught something before it could cause harm:

- Wrong target kind → rejection (not a silent type coercion)
- Missing target → rejection (not a dangling reference)
- Missing provenance → rejection (not an untraceable ghost item)
- Duplicate of existing item → merged (not a silent double-count)

The rejection rate is a scoreboard metric. A high rejection rate means extractors are proposing poor candidates. A zero rejection rate on real data means the extractors and reconciler are well-calibrated.

## Why this matters

Without invariants, stateful systems accumulate ghosts — items that shouldn't exist, references that point nowhere, status combinations that violate logic. Over a long session, ghosts compound. The reconciler prevents this by being strict at the boundary.

The design principle: **rejections over corruption**. It is better to miss a valid state change than to accept an invalid one. The cost of a rejection is lower recall on one item. The cost of corruption is a poisoned working set that produces wrong answers for the rest of the session.

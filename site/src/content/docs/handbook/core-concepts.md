---
title: Core Concepts
description: The vocabulary of DeltaMind — turns, deltas, candidates, state, semantic IDs, provenance, snapshots, projections, and exports.
sidebar:
  order: 1
---

DeltaMind has a small set of concepts. Understanding these makes everything else click.

## Turn

A single message in a conversation. Has a `turnId`, `role` (user/assistant/system), and text `content`. Turns are the raw input. DeltaMind never modifies them.

## Delta

A typed state change extracted from one or more turns. Not a summary — a structured mutation. DeltaMind defines 11 delta types:

| Delta | Meaning |
|-------|---------|
| `goal_set` | What the session is trying to achieve |
| `decision_made` | A settled choice with rationale |
| `decision_revised` | A change to a prior decision |
| `constraint_added` | A rule, boundary, or requirement |
| `constraint_revised` | A relaxation, tightening, or amendment of a constraint |
| `task_opened` | Work to be done |
| `task_closed` | Work completed or abandoned |
| `fact_learned` | A stable piece of knowledge |
| `hypothesis_introduced` | A tentative idea — explicitly not a decision |
| `branch_created` | Unresolved alternatives (A vs B vs C) |
| `item_superseded` | Something replaced by something newer |

Every delta carries a timestamp, source turn references, and a kind.

## Candidate delta

The raw output of an extractor. A candidate is a delta that has not been reconciled yet. It includes:

- The proposed `delta` itself
- `evidence` — which turns and text snippets triggered it
- `extractorConfidence` — how confident the extractor is (0-1)
- `semanticId` — stable content hash for dedup

Candidates are proposals. The reconciler decides whether they become truth.

## Active context state

The reconciled working set. A map of **memory items** plus a delta log and sequence counter. Each item has:

- `id` — unique within the session
- `semanticId` — stable content hash (same meaning = same hash)
- `kind` — one of: goal, decision, constraint, task, fact, hypothesis, open_question, rejected_option, dependency, risk, artifact
- `summary` — human-readable description
- `status` — active, tentative, superseded, resolved
- `confidence` — certain, high, medium, low
- `scope` — session, project, durable
- `sourceTurns` — which turns produced this item (provenance)
- `lastTouched` — when the item was last created or modified
- `tags` — optional labels (e.g., "branch")

## Semantic ID

A stable content hash so that equivalent meaning converges regardless of which extractor found it or how it was phrased.

Algorithm:
1. Canonicalize the summary (lowercase, strip stop words, normalize verb forms)
2. Sort tokens alphabetically (order-independent)
3. FNV-1a 32-bit hash
4. Prefix with kind initial

Example: `d-a3f7c012` — a decision with hash `a3f7c012`.

"Use TypeScript for type safety" and "using typescript for type safety" produce the same semantic ID. Word order doesn't matter. Stop words are removed. Verb forms are normalized (using → use, building → build).

## Provenance

The event log — what happened. Every accepted delta, every rejection, every checkpoint is recorded as a line in the provenance log. This is the flight recorder.

Three event types:
- **Accepted** — a delta that the reconciler accepted into state
- **Rejected** — a delta that was rejected (with reason)
- **Checkpoint** — a periodic snapshot of session health metrics

## Snapshot

The current truth as machine-readable JSON. Versioned, deterministic (sorted keys), complete enough to resume a session. The snapshot is authoritative. Everything else is derived from it.

## Projection

Human-readable markdown generated from state. Not authoritative. Never parsed back into state. Useful for inspection:

- `ACTIVE_STATE.md` — full working set overview
- `DECISIONS.md` — decisions ledger (active + superseded)
- `TASKS.md` — task tracker
- `CONSTRAINTS.md` — constraint ledger

## Context export

A budgeted text rendering of the working set, designed for injection into LLM prompts. Priority ordering: constraints first, then decisions, goals, tasks, branches, recent deltas, changes since last export. Truncated at the character budget.

## Advisory memory suggestion

DeltaMind can suggest updates to durable memory systems (like claude-memories files). These are advisory — the system proposes, a human or policy decides. Hypotheses and branch-tagged items are explicitly excluded from suggestions.

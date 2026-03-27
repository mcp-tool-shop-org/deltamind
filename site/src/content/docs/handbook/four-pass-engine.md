---
title: The Four-Pass Engine
description: How DeltaMind processes turns — event gate, extractor, normalizer, reconciler.
sidebar:
  order: 2
---

DeltaMind processes conversation turns through a four-pass pipeline. Each pass has a single job and a clean interface with the next.

```
Turns → Pass 0 (Gate) → Pass 1 (Extract) → Pass 2 (Normalize) → Pass 3 (Reconcile) → State
```

## Pass 0: Event gate

**Job:** Decide which turns are worth analyzing.

The gate runs cheap heuristics on each turn, looking for signals that something state-relevant happened. It classifies turns into signal types:

- `goal`, `decision`, `constraint`, `task` — backbone state changes
- `revision`, `supersession` — changes to existing state
- `fact`, `hypothesis`, `branch` — knowledge and uncertainty
- `noop` — chatter, elaboration, nothing state-relevant

**Design principle:** High recall, tolerant of false positives. It's cheaper to run the extractor on a false positive than to miss a real state change. The gate exists to skip obviously inert turns (greetings, acknowledgments, tool output without decisions).

Each turn gets an `EventGateResult` with the detected signals and a boolean `gated` flag (true if any non-noop signal was detected).

## Pass 1: Delta extractor

**Job:** Emit candidate deltas from gated turns.

Two extractors work in parallel with complementary strengths:

### Rule-based extractor
Fast, precise, zero-cost. Pattern matches on explicit language:
- "we decided" / "let's go with" → `decision_made`
- "must" / "never" / "always" → `constraint_added`
- "working on" / "next step" → `task_opened`
- "actually, switch to" / "instead of" → `decision_revised`

**Strength:** 100% precision. If it fires, it's almost always right.
**Weakness:** Lower recall. Misses decisions phrased as questions, implicit constraints, goals stated indirectly.

### LLM extractor (gemma2:9b)
Semantic understanding via structured prompting. The LLM receives a turn window plus the current state shortlist, and outputs structured JSON candidates.

**Strength:** Catches goals, high-level decisions, and semantic state changes that regex misses.
**Weakness:** Slower, costs tokens, requires Ollama running locally.

Both extractors compute **semantic IDs** at emission time. Equivalent candidates from different extractors will have the same semantic ID, enabling dedup downstream.

Each candidate includes:
- The proposed delta
- Evidence (turn IDs, text snippets)
- Extractor confidence score
- Semantic ID

## Pass 2: Normalizer

**Job:** Merge duplicate candidates before reconciliation.

When both extractors fire on the same state change, the normalizer deduplicates. Four strategies, in priority order:

1. **Semantic ID match** — Same kind + same semantic ID → merge. This is the strongest signal.
2. **Word overlap (same kind)** — Same kind + canonicalized word overlap above 50% → merge.
3. **Cross-kind semantic match** — Related kinds (e.g., `decision_made` and `constraint_added`) with canonicalized word overlap above 70% → merge. Prevents the same concept from appearing as both a decision and a constraint.
4. **Target-based dedup** — Two revision or closure deltas targeting the same item → merge (keep the first).

## Pass 3: Reconciler

**Job:** Apply candidates to state. Decide truth.

The reconciler is deliberately simple and lawful. It applies deltas to the `ActiveContextState`:

- **Creates** new items for `goal_set`, `decision_made`, `constraint_added`, `task_opened`, `fact_learned`, `hypothesis_introduced`, `branch_created`
- **Modifies** existing items for `decision_revised`, `constraint_revised`, `task_closed`
- **Marks** items as superseded for `item_superseded`
- **Rejects** invalid candidates (wrong target kind, missing target, invariant violation)

### Reconciliation invariants

These always hold after reconciliation:

1. An item cannot be both `active` and `superseded`
2. Every accepted delta has provenance (source turn IDs)
3. `decision_revised` must point to an existing decision (not a constraint, not a task)
4. `constraint_revised` must point to an existing constraint
5. Confidence can change, but source turns are append-only
6. The reconciler never silently drops a candidate — it either accepts or rejects with a reason

**Rejections are features, not bugs.** A rejected candidate means the system caught something wrong before it could corrupt state. The rejection reason is logged to provenance.

## Pipeline output

The full pipeline produces a `PipelineResult`:

- `state` — the updated `ActiveContextState`
- `candidates` — all candidates the extractors produced
- `accepted` — candidates the reconciler accepted
- `rejected` — candidates with rejection reasons
- `gateResults` — per-turn gate signals
- `scoreboard` — quality metrics (precision, recall, canonization rate, etc.)

## Hybrid mode

In production, both extractors run and their outputs are merged through the normalizer. This is **hybrid extraction** — the default mode.

When Ollama is unavailable, the system degrades gracefully to rule-based only. No crash, no error — just lower recall. The degradation path is by design.

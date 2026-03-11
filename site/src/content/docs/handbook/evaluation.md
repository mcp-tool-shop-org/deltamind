---
title: Evaluation and Scaling
description: How DeltaMind is tested — transcript fixtures, scoreboard metrics, scaling results, and model sweeps.
sidebar:
  order: 10
---

DeltaMind's quality is measured empirically, not by vibes. Four fixture classes, seven scoreboard metrics, and systematic model sweeps provide the evidence.

## Transcript fixtures

Each fixture is a realistic conversation transcript with gold labels — expected deltas and items that a correct extractor should produce.

### Clean linear (9 turns)
A straightforward coding session. Decisions are explicit, constraints are stated clearly, tasks are concrete. This is the easy case — if an extractor fails here, something is fundamentally broken.

### Messy real (12 turns)
A realistic brainstorming session with tangents, corrections, and implicit decisions. Tests whether the extractor can handle natural conversation patterns.

### Pathological (14 turns)
Deliberately designed to trigger canonization failures. Hedged language, conditional plans, reversed decisions, questions that sound like decisions. The safety stress test.

### Revision mini-pack (13 turns)
Seven revision scenarios: direct replacement, relaxation, tightening, reversal, partial rollback, wrong-target trap, implicit amendment. Tests the revision ontology specifically.

### Long variants (56-62 turns)
Extended versions of the first three fixtures. Tests scaling behavior — whether item growth is sublinear, whether dedup holds, whether quality degrades with length.

## Scoreboard metrics

The pipeline produces a scoreboard after every run:

| Metric | What it measures |
|--------|-----------------|
| **Precision** | Accepted / total candidates. Are emitted deltas valid? |
| **Recall** | Matched expected / total expected. Were expected deltas found? |
| **Premature canonization rate** | Speculation promoted to decision. The safety metric. |
| **Bad target rate** | Revision/supersession pointing at wrong item. |
| **Duplicate emission rate** | Re-emitting equivalent deltas from chatter. |
| **Reconciler rejection rate** | Kernel refusing bad proposals. |
| **Cost per accepted delta** | Characters processed per useful state change. |

### Per-kind breakdown

The scoreboard also reports precision and recall per delta kind. This reveals where extraction is strong and where it's weak:

- **goal_set** — 100% recall across all models. Solved.
- **constraint_added** — 50-100% recall. Basically solved.
- **decision_made** — 0-50% recall. The main recall drag.
- **decision_revised** — 0% for most models. The real sinkhole.

### Match class distribution

When evaluating against expected deltas, each match is classified:

- **Exact** — same item ID (the extractor found the same item the gold label expected)
- **Semantic** — different ID but same semantic ID (equivalent meaning, different label)
- **Fuzzy** — word overlap above threshold but not semantic match
- **Missed** — expected delta not found at all

## Scaling results

The core scaling thesis: **state grows sublinearly while transcript grows linearly.**

| Metric | Short (9-14 turns) | Long (56-62 turns) |
|--------|-------------------|-------------------|
| Savings vs raw | 29% | **52%** |
| Items vs turns | ~linear | **sublinear** (2.9x items for 5x turns) |
| State-change density | 92% | 56% (sparser at scale) |
| Query score | 6/6 | 6/6 |
| Overhead vs gold | 1.69x | 2.36x (under 3x threshold) |

The compression improvement with length is the key finding. Short transcripts can inflate (metadata overhead exceeds savings). But by 56+ turns, DeltaMind is compressing 4-8x while maintaining full query capability and provenance.

### Why this happens

Most turns in a long conversation are elaboration, not mutation. The extractor identifies the sparse state changes and ignores the rest. The ratio of state-relevant turns to total turns drops as the conversation grows.

This is why summaries fail at scale — they compress everything equally, including the important parts. DeltaMind compresses by identifying what matters and discarding what doesn't.

## Model sweep results

Three models tested across four fixtures:

| Model | Clean precision | Clean recall | Pathological canon | Safety |
|-------|---------------|-------------|-------------------|--------|
| gemma2:9b | 100% | 78% | 0% | SAFE |
| phi4:14b | 86% | 67% | 0% | SAFE |
| qwen2.5:14b | 100% | 56% | 0% | SAFE |
| llama3.1:8b | 100% | 45% | **14.3%** | **UNSAFE** |

**gemma2:9b** became the default based on these results: best precision/recall balance, zero canonization, smaller and faster than 14B alternatives.

**llama3.1:8b** was blocked after it promoted hedged "Use Redis" to `decision_made` on the pathological fixture. A model that canonizes in controlled testing will canonize in production.

## Dogfood results

Three realistic session types processed through the full pipeline:

| Session | Turns | Items | Compression | Save/load stable |
|---------|-------|-------|------------|-----------------|
| Coding (auth refactor) | 35 | 7 | 22% of raw | Yes |
| Product (CLI planning) | 28 | 7 | 25% of raw | Yes |
| Messy (brainstorming) | 32 | 8 | 18% of raw | Yes |

All gates pass: zero false canonization, zero hypothesis promotion, zero advisory boundary leaks, round-trip stable save/load.

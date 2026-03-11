---
title: Hedging and Safety
description: How DeltaMind avoids canonizing speculation — zero-canonization goals, hedging detection, safety downgrades.
sidebar:
  order: 5
---

The most dangerous failure mode in a memory system is **premature canonization** — storing a passing remark as a settled decision. "Maybe we should use Redis?" becomes "Decision: use Redis." The agent then acts on a choice that was never made.

DeltaMind's safety model exists to prevent this.

## Zero-canonization goal

The canonization rate measures how often speculative language gets promoted to decision or fact status. DeltaMind targets **0% canonization** across all fixture types, including pathological transcripts designed to trick the extractor.

Current results: 0% canonization across all models (gemma2:9b, phi4:14b, qwen2.5:14b) and all fixture types (clean, messy, pathological, revision-pack).

## How hedging detection works

The rule-based extractor checks for hedging language before promoting anything to decision status:

- "maybe", "perhaps", "possibly", "might", "could"
- Question marks in decision-adjacent text
- "considering", "thinking about", "exploring"
- "not sure", "unclear", "depends on"

When hedging is detected, the candidate is downgraded from `decision_made` to `hypothesis_introduced`. The hypothesis gets `tentative` status and is excluded from memory promotion.

## LLM safety rails

The LLM extractor prompt includes explicit abstain permission:

> If a turn discusses possibilities without settling on a choice, emit hypothesis_introduced, not decision_made. If you are unsure whether something is a decision, abstain.

The LLM pipeline also runs a **safety downgrade pass** after extraction:

1. Candidates with `decision_revised` targeting a constraint are reclassified or dropped
2. Candidates with mismatched target kinds are dropped before they reach the reconciler
3. Low-confidence revision candidates are filtered

## Model policy

Not all models are safe for decision extraction. DeltaMind maintains an explicit model policy:

- **Default:** gemma2:9b — best precision/recall balance, zero canonization
- **Allowed:** qwen2.5:7b, qwen2.5:14b, phi4:14b, gemma2:9b
- **Blocked:** llama3.1:8b — 14.3% canonization on pathological fixture (promoted hedged "Use Redis" to decision_made)

The block is based on empirical evidence from the model sweep. A model that canonizes in controlled testing will canonize in production.

## Advisory boundary

Memory promotion suggestions have a hard boundary:

- **Included:** Decisions (active, high confidence), constraints, facts, goals
- **Excluded:** Hypotheses (always), branch-tagged items (always), tentative items (always), low-confidence items (by default)

This is the advisory/authoritative split. Session state is authoritative — DeltaMind updates it automatically. Durable memory is advisory — DeltaMind suggests, humans or policy decide.

The reasoning: a session-local false positive gets corrected when the session ends. A durable false positive persists across sessions and corrupts future context. The cost asymmetry demands different authority levels.

## Pathological testing

The pathological fixture is specifically designed to trigger canonization failures:

- Hedged language that sounds like decisions ("Maybe Redis would be good for this")
- Implicit preferences stated as questions ("What about using Fastify?")
- Conditional plans ("If the timeline allows, we could add caching")
- Reversed decisions stated ambiguously

Any model or extractor that canonizes on the pathological fixture is disqualified from default use.

## The principle

**Better to abstain than poison the ledger.**

A missed decision can be caught later — the conversation will reference it again if it matters. A false decision, once in state, biases every subsequent export, every suggestion, every query answer. The asymmetry is clear: abstention is recoverable, canonization is persistent damage.

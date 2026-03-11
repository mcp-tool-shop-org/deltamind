# DeltaMind

**Store what changed.**

Active context compaction for AI agents: typed deltas, structured state, provenance, and working-set budgeting for long-running conversations.

## The problem

Chat transcripts are terrible working memory. They mix settled facts, tentative ideas, tool noise, repeated explanations, and changed plans into one long noodle. As conversations grow, agents become senile — forgetting early constraints while clinging to stale plans.

## The idea

Don't store the conversation. Store what the conversation changed.

DeltaMind replaces transcript-as-memory with state-as-memory. Instead of summarizing history, it emits **typed deltas** — decisions made, constraints added, tasks opened, hypotheses introduced — and reconciles them into a structured, queryable state.

## Architecture

| Layer | Purpose |
|-------|---------|
| **Transcript** | Raw evidence, auditing, exact wording |
| **Operational state** | Live working set: goals, constraints, decisions, entities |
| **Retrieval memory** | Indexed archive: searchable facts, decisions, summaries with provenance |

## Packages

| Package | Description |
|---------|-------------|
| `@deltamind/core` | Typed deltas, state model, reconciliation, provenance |

## Status

Phase 1 — proving the state model. Schema, reconciler, invariant tests.

## License

MIT

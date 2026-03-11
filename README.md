<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/deltamind/readme.png" width="400" alt="DeltaMind" />
</p>

<p align="center">
  <strong>Store what changed.</strong>
</p>

<p align="center">
  Active context compaction for AI agents. Typed deltas, structured state, provenance, and working-set budgeting for long-running conversations.
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/deltamind/actions"><img src="https://github.com/mcp-tool-shop-org/deltamind/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://mcp-tool-shop-org.github.io/deltamind/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
</p>

## The problem

Chat transcripts are terrible working memory. They mix settled facts, tentative ideas, tool noise, repeated explanations, and changed plans into one growing noodle. As conversations grow, agents become senile — forgetting early constraints while clinging to stale plans.

Summaries smear. They flatten nuance, destroy provenance, and merge speculation with settled truth. You can't ask a summary "what did we decide about X and why?"

## The idea

Don't store the conversation. Store what the conversation changed.

DeltaMind replaces transcript-as-memory with **state-as-memory**. Instead of summarizing history, it emits **typed deltas** — decisions made, constraints added, tasks opened, hypotheses introduced — and reconciles them into a structured, queryable state.

A 500-turn session should feel clearer at turn 500 than at turn 50.

## Architecture

```
Transcript turns → Event gate → Delta extractor → Normalizer → Reconciler → State
                                    ↑ LLM (gemma2:9b)                        ↓
                                    ↑ Rule-based                    ┌────────┴────────┐
                                                                    ↓                 ↓
                                                              exportContext()    save()/load()
                                                                    ↓                 ↓
                                                          ai-loadout adapter    PROVENANCE.jsonl
                                                                    ↓           snapshot.json
                                                          claude-memories       *.md projections
                                                                    ↓
                                                          advisory suggestions
```

**Three representations, single job each:**

| Representation | Purpose | Format |
|---------------|---------|--------|
| Event log | What happened | `PROVENANCE.jsonl` (append-only) |
| State snapshot | Current truth | `snapshot.json` (versioned) |
| Markdown projections | Human inspection | `*.md` (generated, never authoritative) |

## Packages

| Package | Description |
|---------|-------------|
| `@deltamind/core` | Typed deltas, state model, reconciliation, extraction, persistence, adapters |
| `@deltamind/cli` | Operator CLI — inspect, export, replay, debug sessions |

## Quick start

```typescript
import { createSession } from "@deltamind/core";

const session = createSession({ forceRuleOnly: true });

session.ingestBatch([
  { turnId: "t-1", role: "user", content: "Build a REST API. Use TypeScript." },
  { turnId: "t-2", role: "assistant", content: "I'll set up Express with TypeScript." },
  { turnId: "t-3", role: "user", content: "Actually, switch to Fastify." },
]);

await session.process();

// What's in state?
const stats = session.stats();
// → { totalItems: 5, activeDecisions: 1, openTasks: 1, ... }

// Export budgeted context for injection
const ctx = session.exportContext({ maxChars: 2000 });
// → Structured text: constraints, decisions, goals, tasks, recent changes

// Save and resume later
const snapshot = session.save();
```

## CLI

```bash
deltamind inspect                    # Active state grouped by kind
deltamind changed --since 5          # What changed since seq 5
deltamind explain item-3             # Deep-dive: fields, provenance, revision chain
deltamind export --for ai-loadout    # Session layer for ai-loadout
deltamind replay --type accepted     # Walk provenance log
deltamind suggest-memory             # Advisory claude-memories updates
deltamind save                       # Persist to .deltamind/
deltamind resume                     # Load session, show health summary
```

## Delta types

DeltaMind tracks 11 typed state changes:

| Delta | What it captures |
|-------|-----------------|
| `goal_set` | What the session is trying to achieve |
| `decision_made` | A settled choice |
| `decision_revised` | A change to a prior decision |
| `constraint_added` | A rule or boundary |
| `constraint_revised` | A relaxation, tightening, or amendment |
| `task_opened` | Work to be done |
| `task_closed` | Work completed or abandoned |
| `fact_learned` | A stable piece of knowledge |
| `hypothesis_introduced` | A tentative idea (not a decision) |
| `branch_created` | Unresolved alternatives |
| `item_superseded` | Something replaced by something newer |

## Extraction

Hybrid by design. Two extractors with complementary strengths:

- **Rule-based**: Fast, precise, zero-cost. Catches explicit patterns ("we decided", "must not", "task: ..."). 100% precision, lower recall.
- **LLM-backed** (gemma2:9b via Ollama): Catches semantic items (goals, high-level decisions) that regex misses. 100% precision on safe models, higher recall on backbone deltas.

Both compute **semantic IDs** — FNV-1a hashes of canonicalized content. Equivalent meaning converges regardless of extraction path.

## Safety invariants

- **Zero canonization**: Hedged language ("maybe Redis?") never becomes a decision
- **Advisory boundary**: Memory suggestions exclude hypotheses and branch-tagged items
- **Type-scoped revision**: Decisions can only revise decisions, constraints only revise constraints
- **Rejection over corruption**: Invalid deltas are rejected, never silently absorbed
- **Provenance required**: Every accepted delta traces to source turns

## Scaling results

| Transcript length | Context vs raw | Items growth |
|------------------|---------------|--------------|
| Short (9-14 turns) | 18-62% of raw | ~linear |
| Long (56-62 turns) | **12-24% of raw** | sublinear (2.9x items for 5x turns) |

The longer the session, the more DeltaMind earns its keep. Query score: 6/6 across all fixture classes.

## Status

**Phases 1–5C complete. 229 tests (192 core + 37 CLI).**

- Phase 1: Schema, reconciler, invariants, harness, economics
- Phase 2: Rule-based extractor, LLM extractor, hybrid pipeline, model sweep, revision ontology
- Phase 3: Session runtime, persistence layer
- Phase 4: ai-loadout adapter, claude-memories adapter, dogfood harness
- Phase 5: LLM default runtime, semantic identity, operator CLI

## License

MIT

---

Built by [MCP Tool Shop](https://mcp-tool-shop.github.io/)

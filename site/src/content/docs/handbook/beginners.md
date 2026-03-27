---
title: Getting Started
description: A beginner-friendly walkthrough of DeltaMind — installation, first session, understanding output, common patterns, and next steps.
sidebar:
  order: 99
---

New to DeltaMind? This page walks you through everything you need to go from zero to a working session.

## What is DeltaMind?

DeltaMind is a TypeScript library that tracks what changed in a conversation, not the conversation itself. When an AI agent has a long session with a user, the transcript grows but most turns are elaboration, not decisions. DeltaMind extracts the meaningful state changes (decisions, constraints, tasks, goals) and maintains a structured working set that stays compact as the conversation grows.

Think of it as a flight recorder for AI sessions. Instead of summarizing (which destroys nuance and provenance), DeltaMind emits typed deltas and reconciles them into queryable state.

## Installation

DeltaMind is a monorepo with two packages:

- `@deltamind/core` -- the library (extraction, reconciliation, persistence, adapters)
- `@deltamind/cli` -- operator CLI for inspecting sessions

**Prerequisites:** Node.js 20 or later.

```bash
# Clone the repo
git clone https://github.com/mcp-tool-shop-org/deltamind.git
cd deltamind

# Install dependencies
npm install

# Build all packages
npm run build

# Run the test suite (229 tests)
npm test
```

For LLM-backed extraction (optional), you also need [Ollama](https://ollama.ai/) running locally with `gemma2:9b`:

```bash
ollama pull gemma2:9b
```

Rule-based extraction works without Ollama and is the recommended starting point.

## Your first session

Here is a minimal example that processes three conversation turns and shows the resulting state:

```typescript
import { createSession } from "@deltamind/core";

// Create a session with rule-based extraction (no LLM needed)
const session = createSession({ forceRuleOnly: true });

// Feed it some conversation turns
session.ingestBatch([
  { turnId: "t-1", role: "user", content: "Let's build a REST API. Use TypeScript." },
  { turnId: "t-2", role: "assistant", content: "I'll set up Express with TypeScript." },
  { turnId: "t-3", role: "user", content: "Actually, switch to Fastify instead." },
]);

// Process all pending turns through the pipeline
const result = await session.process();

// Check what was extracted
console.log(`Turns processed: ${result.turnsProcessed}`);
console.log(`Candidates: ${result.pipeline.candidates.length}`);
console.log(`Accepted: ${result.pipeline.accepted.length}`);
console.log(`Rejected: ${result.pipeline.rejected.length}`);

// Query the live state
const stats = session.stats();
console.log(`Total items in state: ${stats.totalItems}`);
console.log(`Active decisions: ${stats.activeDecisions}`);
console.log(`Active constraints: ${stats.activeConstraints}`);
console.log(`Open tasks: ${stats.openTasks}`);

// Export budgeted context for prompt injection
const ctx = session.exportContext({ maxChars: 2000 });
console.log(ctx.text);
```

**What happens under the hood:**

1. **Pass 0 (Gate)** -- Each turn is scanned for signals (decision language, constraint language, etc.). Turns with no signals are skipped.
2. **Pass 1 (Extract)** -- Gated turns produce candidate deltas. Turn t-1 produces a `goal_set` (build a REST API). Turn t-2 produces a `decision_made` (use Express) and a `task_opened`. Turn t-3 produces a `decision_revised` (switch to Fastify).
3. **Pass 2 (Normalize)** -- Duplicate candidates are merged.
4. **Pass 3 (Reconcile)** -- Candidates are applied to state. The reconciler checks invariants (valid targets, provenance, type-scoped revisions) and accepts or rejects each one.

## Understanding the output

DeltaMind's exported context is structured text with sections in priority order:

```
## Constraints
- [c-1] Must use TypeScript

## Decisions
- [d-2] Use Fastify (revised from Express)

## Goals
- [g-1] Build a REST API

## Open Tasks
- [task-3] Set up project scaffold

## Recent Changes
- decision_revised: Use Fastify (revised from Express)
- task_opened: Set up project scaffold
```

**Priority ordering matters.** Constraints come first because they are guardrails. If the budget runs out, recent changes are shed before constraints. This ensures the model always respects boundaries, even in tight context windows.

**Item IDs** (like `c-1`, `d-2`) are stable within a session. You can use `session.query({ kind: "decision" })` to retrieve items programmatically, or `deltamind explain d-2` from the CLI to inspect provenance.

## Key concepts in 60 seconds

| Concept | One-liner |
|---------|-----------|
| **Turn** | A single message (user, assistant, or system). Raw input, never modified. |
| **Delta** | A typed state change extracted from turns (e.g., `decision_made`, `constraint_added`). |
| **Candidate** | An unverified delta proposed by an extractor. May be accepted or rejected. |
| **Reconciler** | The truth authority. Applies candidates to state, enforcing invariants. |
| **Semantic ID** | A content hash so equivalent meaning produces the same ID regardless of phrasing. |
| **Provenance** | Every item traces back to the source turns that produced it. Append-only. |
| **Snapshot** | Machine-readable JSON of current state. Deterministic. Used for save/resume. |
| **Projection** | Human-readable markdown generated from state. Never authoritative. |
| **Export** | Budgeted text for LLM prompt injection. Prioritized, truncated at budget. |

## Common patterns

### Save and resume a session

```typescript
// Save current state
const snapshot = session.save();
const json = JSON.stringify(snapshot, null, 2);
// Write json to .deltamind/snapshot.json

// Later, resume
import { parseSnapshot } from "@deltamind/core";
const restored = parseSnapshot(json);
const session2 = createSession({ snapshot: restored });
// session2 has the same items, sequence, and state
```

### Incremental processing

```typescript
// Process turns as they arrive, not all at once
session.ingest({ turnId: "t-10", role: "user", content: "Add rate limiting." });
await session.process();

session.ingest({ turnId: "t-11", role: "assistant", content: "Done. Tests passing." });
await session.process();

// Each process() runs the full pipeline on pending turns only
```

### Query specific item types

```typescript
// All active decisions
const decisions = session.query({ kind: "decision", status: "active" });

// All open tasks
const tasks = session.query({ kind: "task", status: "active" });

// Items with a specific tag
const branches = session.query({ tag: "branch" });
```

### Use with LLM extraction (optional)

```typescript
// Auto-detect Ollama: uses gemma2:9b if available, falls back to rule-based
const session = createSession({ autoDetect: true });

// Or specify a model explicitly
const session = createSession({ model: "gemma2:9b" });
```

LLM extraction catches semantic state changes that regex misses (implicit decisions, indirect goals). Rule-based extraction is faster and zero-cost. Both produce semantic IDs, so hybrid mode deduplicates automatically.

## Troubleshooting

**"No deltas extracted from my turns"** -- The event gate filters out turns without recognizable signal patterns. Try using explicit language: "Let's use X", "We decided Y", "Must not Z". The rule-based extractor matches on specific phrases. See [The Four-Pass Engine](/deltamind/handbook/four-pass-engine/) for the signal patterns.

**"My hypothesis became a decision"** -- This should not happen. DeltaMind's hedging detection prevents speculative language ("maybe", "perhaps", "might") from becoming decisions. If you see this, file a bug with the exact turn content.

**"Revision was rejected"** -- Revisions require a valid target. `decision_revised` must point to an existing decision, `constraint_revised` must point to an existing constraint. Check that the original item exists in state before the revision turn.

**"Ollama model blocked"** -- DeltaMind maintains a model policy. Only validated models are allowed. `llama3.1:8b` is blocked due to a 14.3% canonization rate on pathological inputs. Use `gemma2:9b` (default), `qwen2.5:14b`, `phi4:14b`, or `qwen2.5:7b`.

## Next steps

- **[Core Concepts](/deltamind/handbook/core-concepts/)** -- the full vocabulary
- **[Session Runtime](/deltamind/handbook/session-runtime/)** -- complete API reference
- **[The Four-Pass Engine](/deltamind/handbook/four-pass-engine/)** -- how extraction works under the hood
- **[Hedging and Safety](/deltamind/handbook/safety-model/)** -- how DeltaMind prevents false canonization
- **[CLI Reference](/deltamind/handbook/cli-reference/)** -- operator commands for session inspection

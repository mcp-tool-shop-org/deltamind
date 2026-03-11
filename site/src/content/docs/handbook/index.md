---
title: What DeltaMind Is
description: Active context compaction for long-running AI sessions — store what changed, not the whole transcript.
sidebar:
  order: 0
---

DeltaMind is active context compaction for long-running AI sessions. It replaces transcript-as-memory with state-as-memory.

## The short version

Conversations produce state changes: decisions get made, constraints get added, tasks open and close, hypotheses emerge and collapse. DeltaMind tracks those changes as **typed deltas** and reconciles them into a structured, queryable working set.

The result: a 500-turn session feels clearer at turn 500 than at turn 50.

## What it does

- Emits typed deltas from conversation turns (decisions, constraints, tasks, goals, hypotheses, revisions)
- Reconciles deltas into a structured state with provenance tracking
- Exports budgeted context for injection into LLM prompts
- Persists state as snapshots for session resume
- Provides operator tools for inspection and debugging

## What it is not

- **Not a chat UI.** DeltaMind is a library and CLI. It processes turns that come from somewhere else.
- **Not a vector database.** There is no embedding, no similarity search, no retrieval augmentation. State is structured, not vectorized.
- **Not a generic note-taking app.** It tracks conversation state changes, not arbitrary documents.
- **Not a durable memory system by itself.** Session state is authoritative within a session. Durable memory promotion is advisory — the system suggests updates, it does not autonomously write them.
- **Not a replacement for reasoning models.** DeltaMind manages what the model remembers, not how it thinks.

## The thesis

Transcripts grow linearly. Every turn adds text regardless of whether anything meaningful changed. But state changes are sparse — most turns are elaboration, not mutation.

DeltaMind exploits this sparsity. On long sessions (56-62 turns), context is 12-24% of raw transcript size. The longer the session, the better the compression ratio.

Summaries don't solve this. They flatten nuance, destroy provenance, and merge speculation with settled truth. You can't ask a summary "what did we decide about X and why?" You can ask DeltaMind exactly that.

## Packages

| Package | Purpose |
|---------|---------|
| `@deltamind/core` | Typed deltas, state model, extraction, reconciliation, persistence, adapters |
| `@deltamind/cli` | Operator CLI for session inspection, export, replay, and debugging |

## Where to start

- **[Core Concepts](/deltamind/handbook/core-concepts/)** — the vocabulary you need
- **[Session Runtime](/deltamind/handbook/session-runtime/)** — how to use DeltaMind in code
- **[Four-Pass Engine](/deltamind/handbook/four-pass-engine/)** — how extraction works under the hood
- **[CLI Reference](/deltamind/handbook/cli-reference/)** — operator commands

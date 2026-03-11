---
title: Session Runtime
description: How to use DeltaMind in code — createSession, ingest, process, exportContext, save, resume.
sidebar:
  order: 6
---

The session runtime is the main API surface. Create a session, feed it turns, process them, and query or export the resulting state.

## Creating a session

```typescript
import { createSession } from "@deltamind/core";

// Rule-based only (no LLM needed)
const session = createSession({ forceRuleOnly: true });

// With LLM extraction (requires Ollama running locally)
const session = createSession({ model: "default" }); // gemma2:9b

// Auto-detect: probe Ollama, use if available, fall back to rule-based
const session = createSession({ autoDetect: true });

// Resume from a saved snapshot
const session = createSession({ snapshot: savedSnapshot });
```

### Session options

| Option | Default | Meaning |
|--------|---------|---------|
| `forceRuleOnly` | `false` | Skip all LLM paths, use rule-based extraction only |
| `model` | — | Ollama model name (resolved via model policy) |
| `baseUrl` | `http://localhost:11434` | Ollama base URL |
| `autoDetect` | `false` | Probe Ollama on first process(), fall back silently |
| `hybridMode` | `true` | Run both extractors and merge results |
| `batchSize` | `0` (all) | Process turns in batches of this size |
| `snapshot` | — | Restore from a previously saved snapshot |

## Ingesting turns

```typescript
// One at a time
session.ingest({ turnId: "t-1", role: "user", content: "Build a REST API." });

// Batch
session.ingestBatch([
  { turnId: "t-1", role: "user", content: "Build a REST API." },
  { turnId: "t-2", role: "assistant", content: "I'll set up Express." },
  { turnId: "t-3", role: "user", content: "Switch to Fastify." },
]);
```

Turns are queued. Nothing happens until you call `process()`.

## Processing

```typescript
const result = await session.process();

result.turnsProcessed;  // How many turns were processed
result.totalTurns;      // Total turns ingested so far
result.hasMore;         // True if batchSize was set and more turns remain
result.pipeline;        // Full pipeline result (candidates, accepted, rejected, scoreboard)
```

Processing runs the full pipeline: gate → extract → normalize → reconcile. The result includes everything — what was proposed, what was accepted, what was rejected and why.

## Querying state

```typescript
// Stats overview
const stats = session.stats();
// { totalTurns, totalItems, totalDeltas, seq, processCount,
//   activeDecisions, activeConstraints, openTasks }

// Query by filter
const decisions = session.query({ kind: "decision", status: "active" });
const highConf = session.query({ kind: "fact" }); // all facts
const tagged = session.query({ tag: "branch" }); // branch-tagged items

// Raw state access
const state = session.state();
state.items;    // Map<string, MemoryItem>
state.deltaLog; // MemoryDelta[]
state.seq;      // Current sequence number
```

## Budgeted context export

The primary output for LLM prompt injection:

```typescript
const ctx = session.exportContext({
  maxChars: 2000,        // Character budget (default: 4000)
  recentDeltaCount: 10,  // How many recent deltas to include
  since: isoTimestamp,   // Only items changed since this time
  includeSuperSeded: false, // Include superseded items (default: false)
});

ctx.text;        // Rendered text, ready for prompt injection
ctx.chars;       // Actual character count
ctx.goals;       // Goal items
ctx.decisions;   // Active decision items
ctx.constraints; // Active constraint items
ctx.tasks;       // Open task items
ctx.branches;    // Unresolved branches
ctx.totalItems;  // Total items in state
```

**Priority ordering in the exported text:**
1. Constraints (guardrails come first)
2. Decisions
3. Goals
4. Open tasks
5. Unresolved branches
6. Recent deltas
7. Changes since last export

If the budget is exceeded, sections are truncated from the bottom. Constraints always survive.

## Save and resume

```typescript
// Save
const snapshot = session.save(); // → StateSnapshot
const json = JSON.stringify(snapshot, null, 2);
// Write json to file...

// Resume
import { parseSnapshot } from "@deltamind/core";
const restored = parseSnapshot(json);
const session2 = createSession({ snapshot: restored });

// Session2 has the same state, items, sequence — can continue processing
```

The snapshot is deterministic: same state always produces the same JSON. Sorted keys, no randomness.

## Provenance access

```typescript
const prov = session.provenance();
const lines = prov.lines(); // All provenance events

for (const line of lines) {
  if (line.type === "accepted") {
    console.log(`Accepted: ${line.delta.kind} → ${line.itemId}`);
  } else if (line.type === "rejected") {
    console.log(`Rejected: ${line.delta.kind} — ${line.reason}`);
  }
}
```

---
title: Persistence Model
description: Three representations — event log, snapshot, markdown — each with one job.
sidebar:
  order: 8
---

DeltaMind persists state in three representations. Each has a single job and never pretends to do the others' work.

## The three representations

| Representation | Job | Format | Authority |
|---------------|-----|--------|-----------|
| Event log | What happened | `provenance.jsonl` | Historical record |
| Snapshot | Current truth | `snapshot.json` | Authoritative state |
| Projections | Human inspection | `*.md` | Generated, never authoritative |

## Event log (PROVENANCE.jsonl)

The append-only flight recorder. Every accepted delta, every rejection, and every checkpoint is a single JSON line.

```json
{"type":"accepted","seq":3,"timestamp":"2026-03-11T...","delta":{...},"itemId":"item-3","resultingStatus":"active"}
{"type":"rejected","seq":3,"timestamp":"2026-03-11T...","delta":{...},"reason":"target not found"}
{"type":"checkpoint","seq":5,"timestamp":"2026-03-11T...","totalItems":7,"totalDeltas":12,"totalTurns":35,"contextChars":830,"rawChars":3826}
```

**Design properties:**
- **Append-only** — lines are never modified or deleted
- **Self-contained** — each line is valid JSON with all context needed
- **Replayable** — feed events through the reconciler to reconstruct state at any point
- **Sequenced** — every event has a `seq` number for ordering

### Event types

**Accepted** — a delta the reconciler accepted:
- `seq`, `timestamp`, `delta` (the full delta), `itemId` (which item was created/modified), `resultingStatus`

**Rejected** — a delta the reconciler rejected:
- `seq`, `timestamp`, `delta`, `reason` (why it was rejected)

**Checkpoint** — periodic health snapshot:
- `seq`, `timestamp`, `totalItems`, `totalDeltas`, `totalTurns`, `contextChars`, `rawChars`

## Snapshot (snapshot.json)

Current truth as machine-readable JSON. Versioned, deterministic, complete.

```json
{
  "version": 1,
  "timestamp": "2026-03-11T...",
  "seq": 12,
  "items": [
    {
      "id": "item-1",
      "semanticId": "g-a3f7c012",
      "kind": "goal",
      "summary": "Build a REST API",
      "status": "active",
      "confidence": "high",
      "scope": "session",
      "sourceTurns": [{ "turnId": "t-1" }],
      "lastTouched": "2026-03-11T..."
    }
  ],
  "deltaLog": [...]
}
```

**Design properties:**
- **Deterministic** — same state always produces the same JSON (sorted by item ID)
- **Complete** — contains everything needed to resume a session
- **Versioned** — `version` field for forward compatibility
- **Machine-shaped** — machines load from machine-shaped files, not parse their own markdown

### Save and restore

```typescript
import {
  createSnapshot, serializeSnapshot,
  parseSnapshot, restoreState
} from "@deltamind/core";

// Save
const snapshot = createSnapshot(state);
const json = serializeSnapshot(snapshot); // Deterministic JSON string

// Restore
const parsed = parseSnapshot(json);
const state = restoreState(parsed); // Full ActiveContextState
```

Version mismatch throws an error. Future schema changes will include migration support.

## Markdown projections

Human-readable views generated from state. Four projections:

- **ACTIVE_STATE.md** — full working set overview (goals, decisions, constraints, tasks, branches, superseded)
- **DECISIONS.md** — decisions ledger (active + superseded with detail)
- **TASKS.md** — task tracker (open + resolved)
- **CONSTRAINTS.md** — constraint ledger

**These are never parsed back into state.** They exist for human inspection only. The snapshot is authoritative.

```typescript
import { renderActiveState, renderDecisions, renderTasks, renderConstraints } from "@deltamind/core";

const md = renderActiveState(session.state());
// → Markdown string with grouped items and metadata
```

## The .deltamind/ directory

The CLI persists sessions in a `.deltamind/` directory, searched upward from the current working directory (like `.git/`):

```
.deltamind/
  snapshot.json       # State snapshot
  provenance.jsonl    # Event log
```

Commands like `deltamind resume` and `deltamind inspect` find and load from this directory automatically.

## Why three representations

A single format can't serve all three jobs well:

- The event log is optimized for append-only recording and replay. It's terrible for querying current state.
- The snapshot is optimized for machine loading and state restoration. It's opaque to human readers.
- Markdown is optimized for human scanning and diffing. It's lossy and fragile for machine parsing.

Trying to make one format do all three jobs produces a format that does none of them well. The three-representation model accepts this and gives each format its optimal shape.

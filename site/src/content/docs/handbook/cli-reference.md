---
title: CLI Reference
description: Complete reference for the DeltaMind CLI — inspect, export, changed, explain, replay, save, resume, suggest-memory.
sidebar:
  order: 11
---

The DeltaMind CLI provides operator handles for inspecting, debugging, and managing sessions from the terminal.

## Installation

```bash
npm install @deltamind/cli
```

Or run directly:

```bash
npx tsx packages/cli/src/index.ts <command>
```

## Working directory

The CLI searches upward from the current directory for a `.deltamind/` directory (like Git searches for `.git/`). This directory contains `snapshot.json` and `provenance.jsonl`.

## Global flags

| Flag | Effect |
|------|--------|
| `--json` | Machine-readable JSON output (most commands) |
| `--help` | Show usage |

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Usage error (bad arguments, missing required flags) |
| 2 | Missing or corrupt `.deltamind/` directory |

## Commands

### `deltamind inspect`

Show active state grouped by kind. Uses the `renderActiveState()` projection.

```bash
deltamind inspect              # Full state overview
deltamind inspect --kind goal  # Only goals
deltamind inspect --json       # Machine output
```

### `deltamind export`

Export budgeted working-set text or ai-loadout JSON.

```bash
deltamind export                       # Context text (default 4000 chars)
deltamind export --max-chars 2000      # Smaller budget
deltamind export --for ai-loadout      # ai-loadout session layer JSON
deltamind export --json                # Full export object
```

### `deltamind changed --since <value>`

Show what changed since a given point. The `--since` value is interpreted as:

- **ISO timestamp** (contains "T" or starts with YYYY-): compared against `lastTouched`
- **Sequence number** (pure integer): looks up the timestamp from `deltaLog[seq]`
- **Turn ID** (starts with "t-"): finds the earliest delta with that source turn

```bash
deltamind changed --since 5                           # Since seq 5
deltamind changed --since t-12                        # Since turn t-12
deltamind changed --since 2026-03-11T10:00:00.000Z    # Since timestamp
deltamind changed --since 5 --json                    # Machine output
```

Output is grouped by kind.

### `deltamind explain <item-id>`

Deep-dive on a single item. Shows:

- Item fields (id, semanticId, kind, summary, status, confidence, source turns, tags)
- Delta history — all deltas in the log referencing this item (by id or targetId)
- Provenance events — accepted/rejected events for this item

```bash
deltamind explain item-3         # Full detail
deltamind explain item-3 --json  # Machine output
```

This is the debugging command. When something looks wrong in state, `explain` shows exactly how the item got there.

### `deltamind replay`

Walk the provenance log chronologically.

```bash
deltamind replay                          # All events
deltamind replay --since 10               # Events from seq 10 onward
deltamind replay --type accepted          # Only accepted deltas
deltamind replay --type rejected          # Only rejections
deltamind replay --type checkpoint        # Only checkpoints
deltamind replay --json                   # Machine output
```

Output format:
```
seq    3  ACCEPTED  decision_made         item-3: "Use Fastify for the backend"
seq    3  REJECTED  decision_revised      "Relax constraint" — target not found
seq    5  CHECKPOINT  items:7 deltas:12 turns:35
```

### `deltamind suggest-memory`

Show advisory memory update suggestions.

```bash
deltamind suggest-memory                            # All suggestions
deltamind suggest-memory --min-confidence high      # Only high-confidence
deltamind suggest-memory --include-superseded       # Include superseded items
deltamind suggest-memory --json                     # Machine output
```

Each suggestion includes the action (create/update), item reference, rendered memory file with frontmatter, and confidence reasoning.

### `deltamind save`

Persist the current session to `.deltamind/`.

```bash
deltamind save                # Save to .deltamind/ (creates if needed)
deltamind save --from-stdin   # Initialize from a piped snapshot
```

`--from-stdin` reads a JSON snapshot from stdin:

```bash
cat snapshot.json | deltamind save --from-stdin
```

### `deltamind resume`

Load a session and show health stats.

```bash
deltamind resume         # Human-readable summary
deltamind resume --json  # Machine output
```

Output:
```
Session loaded from /path/to/.deltamind

Sequence:     12
Items:        7
Deltas:       15
Turns:        35
Processed:    3 batches
Decisions:    2 active
Constraints:  3 active
Tasks:        1 open
```

## Pipe-friendly design

- **stdout** — data output (command results, JSON). Pipe-safe.
- **stderr** — diagnostics and error messages. Separated from data.
- **No ANSI colors** — output is plain text. Won't corrupt pipes or log files.
- **JSON mode** — every command supports `--json` for machine consumption.

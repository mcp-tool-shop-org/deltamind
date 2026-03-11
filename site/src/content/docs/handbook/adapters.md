---
title: Adapters
description: How DeltaMind integrates with ai-loadout and claude-memories — session layer export and advisory memory promotion.
sidebar:
  order: 9
---

DeltaMind includes two adapters that connect session state to external memory systems. Both read from the snapshot — never from projections — and produce structured output ready for consumption.

## ai-loadout adapter

The ai-loadout adapter exports session state as a **session layer** for the ai-loadout knowledge management system. This bridges DeltaMind's runtime state with ai-loadout's preload budget model.

### How it works

```typescript
import { toLoadoutEntries, toLoadoutIndex } from "@deltamind/core";

// Get individual entries
const entries = toLoadoutEntries(session);
// → LoadoutEntry[] with priority, layer, keywords, body

// Get complete index (ready to write as session layer)
const index = toLoadoutIndex(session);
// → { version, entries, budget, generatedAt }
```

### Priority mapping

| Item kind | Loadout priority | Layer |
|-----------|-----------------|-------|
| Constraints | `core` | session |
| Decisions | `core` | session |
| Goals | `core` | session |
| Tasks | `domain` | session |
| Branches | `domain` | session |
| Recent deltas | `domain` | session |

Core items have higher priority in ai-loadout's budget allocation. Constraints and decisions are always loaded; tasks and branches are loaded if budget allows.

### Budget footprint

Typical session layer budgets from dogfood testing:

| Session type | Entries | Core tokens | Domain tokens | Total |
|-------------|---------|------------|--------------|-------|
| Coding (35 turns) | 4 | ~50 | ~66 | ~116 |
| Product (28 turns) | 5 | ~60 | ~82 | ~142 |
| Messy (32 turns) | 4 | ~45 | ~63 | ~108 |

Compact. The session layer adds ~100-140 tokens to the loadout — a fraction of what raw transcript injection would cost.

### Keywords

Each entry extracts keywords from the item summary for ai-loadout's matching system. Keywords are lowercase, deduplicated, and stripped of stop words.

## claude-memories adapter

The claude-memories adapter suggests updates to durable memory files (MEMORY.md ecosystem). These suggestions are **advisory only** — the system proposes, humans or policy decide.

### How it works

```typescript
import { suggestMemoryUpdates, renderMemoryFile } from "@deltamind/core";

const suggestions = suggestMemoryUpdates(session, {
  minConfidence: "high",      // Only suggest high-confidence items
  includeSuperSeded: false,   // Skip superseded items
});

for (const s of suggestions) {
  console.log(s.action);    // "create" | "update"
  console.log(s.fileName);  // e.g., "project_rest-api-decision.md"
  console.log(renderMemoryFile(s)); // Complete markdown with frontmatter
}
```

### Memory type mapping

| Item kind | Memory type | Rationale |
|-----------|------------|-----------|
| Decision | `project` | Decisions are project-scoped choices |
| Goal | `project` | Goals frame the project |
| Constraint | `project` | Constraints govern the project |
| Task | `project` | Tasks are project work items |
| Fact | `reference` | Facts are reusable knowledge |

### What's excluded

The adapter enforces a hard boundary on what it will suggest:

- **Hypotheses** — always excluded. Tentative ideas must not become durable memory.
- **Branch-tagged items** — always excluded. Unresolved alternatives are not promotable.
- **Tentative status** — excluded by default. Only `active` items are suggested.
- **Low confidence** — excluded by default (configurable via `minConfidence`).
- **Insufficient provenance** — items with fewer than 2 source turns are excluded (configurable).

### Rendered output

Each suggestion renders as a complete memory file with frontmatter:

```markdown
---
name: REST API with Fastify
description: Decision to use Fastify for the REST API backend
type: project
---

Decision: Use Fastify (not Express) for the REST API backend.
Rationale: Better TypeScript support, faster performance.
Source: turns t-2, t-5
Confidence: high
```

### The advisory principle

DeltaMind never writes to durable memory autonomously. The reasoning:

- A session-local false positive is corrected when the session ends
- A durable false positive persists across sessions and corrupts future context
- The cost asymmetry demands explicit human or policy approval for promotion

This is why `suggestMemoryUpdates` returns suggestions, not side effects. The caller decides what to do with them.

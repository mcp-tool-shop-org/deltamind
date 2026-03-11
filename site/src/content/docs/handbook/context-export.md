---
title: Budgeted Context Export
description: How DeltaMind renders compact, prioritized context for LLM prompt injection.
sidebar:
  order: 7
---

The context export is DeltaMind's primary output. It renders the working set as prioritized text that fits within a token budget, designed to be injected into LLM system prompts or context blocks.

## Why budgeting matters

LLM context windows are finite and expensive. Injecting the full state wastes tokens on low-priority items. Injecting nothing wastes the session's accumulated knowledge. The export balances these by rendering high-priority items first and truncating at the budget.

## Priority ordering

The export renders sections in this order:

1. **Constraints** — guardrails that govern everything else. These always survive truncation.
2. **Decisions** — settled choices the model should respect.
3. **Goals** — what the session is trying to achieve.
4. **Open tasks** — work in progress.
5. **Unresolved branches** — open questions and alternatives.
6. **Recent deltas** — what changed recently (newest first).
7. **Changes since last export** — incremental awareness.

If the text exceeds `maxChars`, it truncates from the bottom. This means constraints and decisions always survive, while recent changes are the first to be shed. This ordering reflects a deliberate priority: it's more important to remember boundaries than to remember recent activity.

## Export options

```typescript
session.exportContext({
  maxChars: 2000,           // Default: 4000
  recentDeltaCount: 10,     // Default: 10
  since: "2026-03-11T...",  // ISO timestamp
  includeSuperSeded: false, // Default: false
});
```

- **maxChars** — the character budget. Includes section headers and formatting.
- **recentDeltaCount** — how many recent deltas to include in the "Recent Changes" section.
- **since** — only include items changed since this timestamp in the "Changed" section.
- **includeSuperSeded** — whether to append superseded items (useful for debugging, not for injection).

## Context economics

Scaling measurements across fixture classes:

| Transcript | Turns | Raw chars | Export chars | Ratio |
|-----------|-------|-----------|-------------|-------|
| Clean linear | 9 | 698 | 942 | 135% |
| Messy real | 12 | 983 | 363 | 37% |
| Pathological | 14 | 1,099 | 197 | 18% |
| Long linear | 56 | 5,106 | 703 | 14% |
| Long messy | 62 | 5,783 | 1,373 | 24% |
| Long pathological | 58 | 4,845 | 569 | 12% |

Short transcripts can inflate (metadata overhead exceeds compression). By 56+ turns, context is 12-24% of raw. The overhead is fixed while the transcript grows linearly — this is why DeltaMind improves with session length.

## Incremental context

The `since` option enables incremental awareness:

```typescript
// First export — full state
const ctx1 = session.exportContext();
// ... more turns processed ...

// Second export — includes "changed since last export"
const ctx2 = session.exportContext();
// ctx2 includes a "Changed Since Last Export" section
// showing only items touched since ctx1
```

The session tracks the last export timestamp automatically. Each export's "Changed" section shows items modified since the previous export, giving the model incremental awareness without re-reading the full state.

## Export vs projection

Exports and projections serve different purposes:

| | Export | Projection |
|---|--------|-----------|
| **Audience** | LLM | Human |
| **Format** | Budgeted text | Full markdown |
| **Priority** | Constraints first | Grouped by kind |
| **Truncation** | Yes (maxChars) | No |
| **Purpose** | Prompt injection | Inspection |

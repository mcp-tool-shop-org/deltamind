<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/deltamind/readme.png" width="400" alt="DeltaMind" />
</p>

<p align="center">
  <strong>State-as-memory for AI agents</strong><br>
  Typed deltas &bull; Reconciliation &bull; Provenance &bull; Context export
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@deltamind/core"><img src="https://img.shields.io/npm/v/@deltamind/core" alt="npm" /></a>
  <a href="https://github.com/mcp-tool-shop-org/deltamind/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/deltamind" alt="license" /></a>
</p>

---

## What is this?

`@deltamind/core` is the runtime engine for DeltaMind — a system that replaces transcript-as-memory with **state-as-memory** for AI agents.

Instead of re-reading old messages, agents emit typed deltas (goal-set, decision, constraint, task, revision...) that get reconciled into a canonical state. That state can be exported as a token-budgeted context block for any downstream consumer.

## Install

```bash
npm install @deltamind/core
```

## Quick start

```typescript
import { createSession } from '@deltamind/core';

const session = createSession();

session.ingest({
  role: 'user',
  content: 'Build a REST API for the inventory service'
});

const result = session.process();
// result.accepted → deltas that passed reconciliation
// result.rejected → deltas that violated invariants

const context = session.exportContext({ maxChars: 4000 });
// Token-budgeted state block ready for any LLM
```

## Key concepts

- **Deltas** — typed state changes (11 types: goal-set, decision, constraint, task, revision, preference, context-anchor, open-question, insight, assumption, dependency)
- **Reconciliation** — enforces 7 invariants (no duplicates, no contradictions, revision-only mutation, etc.)
- **Provenance** — full event log of what was accepted, rejected, and why
- **Semantic IDs** — content-addressed identity for deduplication across turns
- **Context export** — priority-ordered, budget-aware state rendering

## Links

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [Handbook](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [CLI package](https://www.npmjs.com/package/@deltamind/cli)

## License

MIT

<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## Cos'è questo?

`@deltamind/core` è il motore di runtime per DeltaMind, un sistema che sostituisce la "trascrizione come memoria" con la "**stato come memoria**" per gli agenti di intelligenza artificiale.

Invece di rileggere vecchi messaggi, gli agenti emettono delta tipizzati (insieme di obiettivi, decisione, vincolo, compito, revisione, ecc.) che vengono integrati in uno stato canonico. Tale stato può essere esportato come un blocco di contesto con un budget di token per qualsiasi componente successivo.

## Installazione

```bash
npm install @deltamind/core
```

## Guida rapida

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

## Concetti chiave

- **Delta** — modifiche allo stato tipizzate (11 tipi: insieme di obiettivi, decisione, vincolo, compito, revisione, preferenza, ancoraggio di contesto, domanda aperta, intuizione, ipotesi, dipendenza)
- **Riconciliazione** — applica 7 invarianti (nessun duplicato, nessuna contraddizione, mutazione solo tramite revisione, ecc.)
- **Provenienza** — registro completo degli eventi di ciò che è stato accettato, rifiutato e perché.
- **ID semantici** — identità basata sul contenuto per la deduplicazione tra le interazioni.
- **Esportazione del contesto** — rendering dello stato ordinato per priorità e consapevole del budget.

## Link

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [Manuale](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [Pacchetto CLI](https://www.npmjs.com/package/@deltamind/cli)

## Licenza

MIT

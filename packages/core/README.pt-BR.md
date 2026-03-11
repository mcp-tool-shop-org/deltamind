<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
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

## O que é isso?

`@deltamind/core` é o motor de execução do DeltaMind — um sistema que substitui a "transcrição como memória" por "**estado como memória**" para agentes de inteligência artificial.

Em vez de reler mensagens antigas, os agentes emitem deltas tipados (conjunto de objetivos, decisão, restrição, tarefa, revisão, etc.) que são reconciliados em um estado canônico. Esse estado pode ser exportado como um bloco de contexto com um limite de tokens para qualquer consumidor subsequente.

## Instalação

```bash
npm install @deltamind/core
```

## Início rápido

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

## Conceitos-chave

- **Deltas** — mudanças de estado tipadas (11 tipos: conjunto de objetivos, decisão, restrição, tarefa, revisão, preferência, âncora de contexto, pergunta aberta, percepção, suposição, dependência)
- **Reconciliação** — impõe 7 invariantes (sem duplicatas, sem contradições, mutação apenas por revisão, etc.)
- **Rastreabilidade** — registro completo de eventos do que foi aceito, rejeitado e por quê.
- **IDs semânticos** — identidade baseada no conteúdo para desduplicação entre interações.
- **Exportação de contexto** — renderização de estado ordenada por prioridade e com consciência do limite.

## Links

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [Manual](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [Pacote CLI](https://www.npmjs.com/package/@deltamind/cli)

## Licença

MIT

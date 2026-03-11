<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## Qu'est-ce que c'est ?

`@deltamind/core` est le moteur d'exécution de DeltaMind, un système qui remplace la transcription en tant que mémoire par une approche basée sur l'**état en tant que mémoire** pour les agents d'IA.

Au lieu de relire de vieux messages, les agents émettent des "deltas" typés (ensemble d'objectifs, décision, contrainte, tâche, révision, etc.) qui sont intégrés dans un état canonique. Cet état peut être exporté sous forme de bloc de contexte avec une allocation de ressources pour tout consommateur ultérieur.

## Installation

```bash
npm install @deltamind/core
```

## Démarrage rapide

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

## Concepts clés

- **Deltas** — modifications d'état typées (11 types : ensemble d'objectifs, décision, contrainte, tâche, révision, préférence, ancre de contexte, question ouverte, intuition, hypothèse, dépendance)
- **Réconciliation** — applique 7 invariants (pas de doublons, pas de contradictions, mutation par révision uniquement, etc.)
- **Traçabilité** — journal complet des événements, indiquant ce qui a été accepté, rejeté et pourquoi.
- **Identifiants sémantiques** — identité basée sur le contenu pour la déduplication entre les interactions.
- **Exportation du contexte** — rendu de l'état ordonné par priorité et tenant compte des ressources disponibles.

## Liens

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [Manuel](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [Package CLI](https://www.npmjs.com/package/@deltamind/cli)

## Licence

MIT

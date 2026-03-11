<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/deltamind/readme.png" width="400" alt="DeltaMind" />
</p>

<p align="center">
  <strong>Store what changed.</strong>
</p>

<p align="center">
  Active context compaction for AI agents. Typed deltas, structured state, provenance, and working-set budgeting for long-running conversations.
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/deltamind/actions"><img src="https://github.com/mcp-tool-shop-org/deltamind/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://mcp-tool-shop-org.github.io/deltamind/"><img src="https://img.shields.io/badge/Landing_Page-live-blue" alt="Landing Page"></a>
</p>

## Le problème

Les transcriptions de conversations sont une mémoire de travail désastreuse. Elles mélangent des faits établis, des idées provisoires, du bruit provenant des outils, des explications répétées et des plans modifiés en un amas confus. Au fur et à mesure que les conversations s'allongent, les agents deviennent séniles, oubliant les contraintes initiales tout en s'accrochant à des plans obsolètes.

Les résumés sont imprécis. Ils simplifient les nuances, détruisent la provenance des informations et fusionnent les spéculations avec les vérités établies. On ne peut pas demander à un résumé "qu'avons-nous décidé concernant X et pourquoi ?".

## L'idée

Ne stockez pas la conversation. Stockez ce que la conversation a modifié.

DeltaMind remplace la transcription en tant que mémoire par l'**état en tant que mémoire**. Au lieu de résumer l'historique, il génère des **deltas typés** : décisions prises, contraintes ajoutées, tâches ouvertes, hypothèses introduites, et les réconcilie en un état structuré et consultable.

Une session de 500 tours devrait être plus claire au tour 500 qu'au tour 50.

## Architecture

```
Transcript turns → Event gate → Delta extractor → Normalizer → Reconciler → State
                                    ↑ LLM (gemma2:9b)                        ↓
                                    ↑ Rule-based                    ┌────────┴────────┐
                                                                    ↓                 ↓
                                                              exportContext()    save()/load()
                                                                    ↓                 ↓
                                                          ai-loadout adapter    PROVENANCE.jsonl
                                                                    ↓           snapshot.json
                                                          claude-memories       *.md projections
                                                                    ↓
                                                          advisory suggestions
```

**Trois représentations, chaque fonction dédiée :**

| Représentation | Objectif | Format |
|---------------|---------|--------|
| Journal des événements | Ce qui s'est passé | `PROVENANCE.jsonl` (uniquement en ajout) |
| Instantané de l'état | Vérité actuelle | `snapshot.json` (versionné) |
| Projections Markdown | Inspection humaine | `*.md` (généré, n'est jamais une source d'autorité) |

## Packages

| Package | Description |
|---------|-------------|
| `@deltamind/core` | Deltas typés, modèle d'état, réconciliation, extraction, persistance, adaptateurs |
| `@deltamind/cli` | Interface en ligne de commande (CLI) pour les opérateurs : inspection, exportation, relecture, débogage des sessions |

## Démarrage rapide

```typescript
import { createSession } from "@deltamind/core";

const session = createSession({ forceRuleOnly: true });

session.ingestBatch([
  { turnId: "t-1", role: "user", content: "Build a REST API. Use TypeScript." },
  { turnId: "t-2", role: "assistant", content: "I'll set up Express with TypeScript." },
  { turnId: "t-3", role: "user", content: "Actually, switch to Fastify." },
]);

await session.process();

// What's in state?
const stats = session.stats();
// → { totalItems: 5, activeDecisions: 1, openTasks: 1, ... }

// Export budgeted context for injection
const ctx = session.exportContext({ maxChars: 2000 });
// → Structured text: constraints, decisions, goals, tasks, recent changes

// Save and resume later
const snapshot = session.save();
```

## Interface en ligne de commande (CLI)

```bash
deltamind inspect                    # Active state grouped by kind
deltamind changed --since 5          # What changed since seq 5
deltamind explain item-3             # Deep-dive: fields, provenance, revision chain
deltamind export --for ai-loadout    # Session layer for ai-loadout
deltamind replay --type accepted     # Walk provenance log
deltamind suggest-memory             # Advisory claude-memories updates
deltamind save                       # Persist to .deltamind/
deltamind resume                     # Load session, show health summary
```

## Types de deltas

DeltaMind suit 11 types de changements d'état :

| Delta | Ce qu'il capture |
|-------|-----------------|
| `goal_set` | Ce que la session essaie d'accomplir |
| `decision_made` | Un choix définitif |
| `decision_revised` | Un changement d'une décision antérieure |
| `constraint_added` | Une règle ou une limite |
| `constraint_revised` | Un assouplissement, un renforcement ou une modification |
| `task_opened` | Travail à effectuer |
| `task_closed` | Travail terminé ou abandonné |
| `fact_learned` | Une connaissance stable |
| `hypothesis_introduced` | Une idée provisoire (pas une décision) |
| `branch_created` | Alternatives non résolues |
| `item_superseded` | Quelque chose remplacé par quelque chose de plus récent |

## Extraction

Hybride par conception. Deux extracteurs aux forces complémentaires :

- **Basé sur des règles** : Rapide, précis, coût nul. Capture les schémas explicites ("nous avons décidé", "il est interdit de", "tâche : ..."). Précision de 100 %, rappel plus faible.
- **Basé sur un LLM** (gemma2:9b via Ollama) : Capture les éléments sémantiques (objectifs, décisions de haut niveau) que les expressions régulières ne détectent pas. Précision de 100 % sur les modèles sécurisés, rappel plus élevé pour les deltas de base.

Les deux calculent des **identifiants sémantiques** — hachages FNV-1a du contenu normalisé. La signification équivalente converge quel que soit le chemin d'extraction.

## Invariants de sécurité

- **Pas de canonisation** : Le langage hésitant ("peut-être Redis ?") ne devient jamais une décision.
- **Limite consultative** : Les suggestions de mémoire excluent les hypothèses et les éléments étiquetés comme des branches.
- **Révision par type** : Les décisions ne peuvent réviser que les décisions, les contraintes ne peuvent réviser que les contraintes.
- **Rejet plutôt que corruption** : Les deltas invalides sont rejetés, et ne sont jamais absorbés silencieusement.
- **Provenance requise** : Chaque delta accepté est traçable aux tours sources.

## Résultats de l'évolutivité

| Longueur de la transcription | Contexte vs données brutes | Croissance des éléments |
|------------------|---------------|--------------|
| Courte (9-14 tours) | 18-62 % des données brutes | Linéaire |
| Longue (56-62 tours) | **12-24 % des données brutes** | Sublinéaire (2,9 fois plus d'éléments pour 5 fois plus de tours) |

Plus la session est longue, plus DeltaMind justifie son utilité. Score de requête : 6/6 pour toutes les classes de configuration.

## Statut

**Phases 1 à 5C terminées. 229 tests (192 tests principaux + 37 tests CLI).**

- Phase 1 : Schéma, réconciliateur, invariants, outil de test, aspects économiques.
- Phase 2 : Extracteur basé sur des règles, extracteur LLM, pipeline hybride, exploration de modèles, ontologie de révision.
- Phase 3 : Exécution de session, couche de persistance.
- Phase 4 : Adaptateur ai-loadout, adaptateur claude-memories, outil de test interne.
- Phase 5 : Exécution LLM par défaut, identité sémantique, CLI de l'opérateur.

## Licence

MIT

---

Créé par [MCP Tool Shop](https://mcp-tool-shop.github.io/)

<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/deltamind/readme.png" width="400" alt="DeltaMind" />
</p>

<p align="center">
  <strong>Operator CLI for DeltaMind</strong><br>
  Inspect &bull; Export &bull; Replay &bull; Debug
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@deltamind/cli"><img src="https://img.shields.io/npm/v/@deltamind/cli" alt="npm" /></a>
  <a href="https://github.com/mcp-tool-shop-org/deltamind/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/deltamind" alt="license" /></a>
</p>

---

## Qu'est-ce que c'est ?

`@deltamind/cli` est l'interface en ligne de commande pour [DeltaMind](https://www.npmjs.com/package/@deltamind/core) — 8 commandes qui vous permettent d'inspecter, de déboguer et d'exporter les sessions de mémoire des agents depuis le terminal.

## Installation

```bash
npm install -g @deltamind/cli
```

## Commandes

| Commande | Description |
|---------|-------------|
| `deltamind inspect` | Affiche l'état actif (tous les éléments ou `--kind goal`) |
| `deltamind export` | Exporte un bloc de contexte (`--max-chars 4000`, `--for ai-loadout`) |
| `deltamind changed --since <ref>` | Affiche les modifications depuis un horodatage, une séquence ou un ID de tour. |
| `deltamind explain <id>` | Historique complet d'un élément : champs, modifications, provenance. |
| `deltamind replay` | Parcourt le journal de provenance (`--since`, `--type accepted`) |
| `deltamind suggest-memory` | Suggère des mises à jour des fichiers de mémoire (`--min-confidence 0.8`) |
| `deltamind save` | Enregistre la session dans le répertoire `.deltamind/` (`--from-stdin` pour les instantanés envoyés en flux). |
| `deltamind resume` | Charge la session et affiche les statistiques. |

Toutes les commandes prennent en charge l'option `--json` pour une sortie lisible par machine.

## Conception

- **Compatible avec les pipes** — la sortie standard (stdout) contient les données, la sortie d'erreur standard (stderr) contient les diagnostics, sans codes ANSI.
- **Codes de sortie** — 0 : succès, 1 : erreur d'utilisation, 2 : répertoire `.deltamind/` inexistant.
- **Configuration minimale** — recherche le répertoire `.deltamind/` en remontant depuis le répertoire courant (comme `.git/`).
- **Pas de framework** — utilise `parseArgs` de Node 18+ et n'a que des dépendances d'exécution minimales, au-delà de `@deltamind/core`.

## Exemple

```bash
# What changed in the last hour?
deltamind changed --since 2025-01-15T10:00:00Z

# Export context for an LLM prompt
deltamind export --max-chars 4000

# Debug a specific item
deltamind explain goal::build-rest-api

# Pipe session state from another tool
cat snapshot.json | deltamind save --from-stdin
```

## Liens

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [Manuel](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [Package principal](https://www.npmjs.com/package/@deltamind/core)

## Licence

MIT

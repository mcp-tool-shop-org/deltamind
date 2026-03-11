<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## Cos'è questo?

`@deltamind/cli` è l'interfaccia a riga di comando per [DeltaMind](https://www.npmjs.com/package/@deltamind/core) — 8 comandi che consentono di ispezionare, eseguire il debug ed esportare le sessioni di memoria degli agenti direttamente dal terminale.

## Installazione

```bash
npm install -g @deltamind/cli
```

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `deltamind inspect` | Mostra lo stato attivo (tutti gli elementi o `--kind goal`) |
| `deltamind export` | Esporta un blocco di contesto (`--max-chars 4000`, `--for ai-loadout`) |
| `deltamind changed --since <ref>` | Mostra le modifiche avvenute a partire da un timestamp, una sequenza o un ID di turno. |
| `deltamind explain <id>` | Visualizza la cronologia completa di un elemento: campi, modifiche, origine. |
| `deltamind replay` | Esamina il registro delle modifiche (`--since`, `--type accepted`) |
| `deltamind suggest-memory` | Suggerisce aggiornamenti al file di memoria (`--min-confidence 0.8`) |
| `deltamind save` | Salva la sessione nella directory `.deltamind/` (`--from-stdin` per salvare snapshot provenienti dall'input standard). |
| `deltamind resume` | Carica la sessione e mostra le statistiche. |

Tutti i comandi supportano l'opzione `--json` per un output leggibile dalle macchine.

## Progettazione

- **Compatibile con i pipe** — l'output standard contiene i dati, l'errore standard contiene le informazioni diagnostiche, senza codici ANSI.
- **Codici di uscita** — 0: successo, 1: errore di utilizzo, 2: directory `.deltamind/` non trovata.
- **Configurazione minima** — trova la directory `.deltamind/` risalendo dalla directory di lavoro corrente (come `.git/`).
- **Nessun framework** — utilizza `parseArgs` di Node 18+ e non ha dipendenze di runtime oltre a `@deltamind/core`.

## Esempio

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

## Link

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [Manuale](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [Pacchetto Core](https://www.npmjs.com/package/@deltamind/core)

## Licenza

MIT

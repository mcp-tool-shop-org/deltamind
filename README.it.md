<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## Il problema

Le trascrizioni delle chat sono una pessima forma di memoria. Mescolano fatti accertati, idee preliminari, rumori di strumenti, spiegazioni ripetute e piani modificati in un unico, confuso insieme. Man mano che le conversazioni si sviluppano, gli operatori diventano distratti, dimenticando i vincoli iniziali pur rimanendo ancorati a piani obsoleti.

I riassunti sono imprecisi. Appiattiscono le sfumature, distruggono la provenienza e fondono le speculazioni con la verità accertata. Non si può chiedere a un riassunto "cosa abbiamo deciso riguardo a X e perché?".

## L'idea

Non salvare la conversazione. Salvare cosa la conversazione ha cambiato.

DeltaMind sostituisce la trascrizione come memoria con lo **stato come memoria**. Invece di riassumere la cronologia, genera **delta tipizzati** – decisioni prese, vincoli aggiunti, attività avviate, ipotesi introdotte – e li riconcilia in uno stato strutturato e interrogabile.

Una sessione di 500 turni dovrebbe risultare più chiara al turno 500 rispetto al turno 50.

## Architettura

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

**Tre rappresentazioni, ciascuna con un compito specifico:**

| Rappresentazione | Scopo | Formato |
|---------------|---------|--------|
| Registro degli eventi | Cosa è successo | `PROVENANCE.jsonl` (solo aggiunte) |
| Snapshot dello stato | Verità corrente | `snapshot.json` (con versioni) |
| Proiezioni in Markdown | Ispezione umana | `*.md` (generato, mai definitivo) |

## Pacchetti

| Pacchetto | Descrizione |
|---------|-------------|
| `@deltamind/core` | Delta tipizzati, modello di stato, riconciliazione, estrazione, persistenza, adattatori |
| `@deltamind/cli` | Interfaccia a riga di comando (CLI) per operatori: ispezione, esportazione, riproduzione, debug delle sessioni |

## Guida rapida

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

## CLI

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

## Tipi di delta

DeltaMind traccia 11 tipi di modifiche di stato:

| Delta | Cosa registra |
|-------|-----------------|
| `goal_set` | Cosa la sessione sta cercando di raggiungere |
| `decision_made` | Una scelta definitiva |
| `decision_revised` | Una modifica a una decisione precedente |
| `constraint_added` | Una regola o un limite |
| `constraint_revised` | Un'attenuazione, un inasprimento o una modifica |
| `task_opened` | Lavoro da svolgere |
| `task_closed` | Lavoro completato o abbandonato |
| `fact_learned` | Una conoscenza stabile |
| `hypothesis_introduced` | Un'idea preliminare (non una decisione) |
| `branch_created` | Alternative irrisolte |
| `item_superseded` | Qualcosa sostituito da qualcosa di più recente |

## Estrazione

Ibrida per progettazione. Due estrattori con punti di forza complementari:

- **Basato su regole**: Veloce, preciso, a costo zero. Cattura schemi espliciti ("abbiamo deciso", "non deve", "attività: ..."). Precisione del 100%, richiamo inferiore.
- **Supportato da LLM** (gemma2:9b tramite Ollama): Cattura elementi semantici (obiettivi, decisioni di alto livello) che le espressioni regolari non riescono a cogliere. Precisione del 100% sui modelli sicuri, richiamo più elevato sui delta principali.

Entrambi calcolano **ID semantici** – hash FNV-1a del contenuto normalizzato. Il significato equivalente converge indipendentemente dal percorso di estrazione.

## Invarianti di sicurezza

- **Nessuna canonizzazione**: Il linguaggio incerto ("forse Redis?") non diventa mai una decisione.
- **Limite di avviso**: I suggerimenti di memoria escludono ipotesi e elementi contrassegnati come rami.
- **Revisione con ambito di tipo**: Le decisioni possono solo modificare decisioni, i vincoli possono solo modificare vincoli.
- **Rifiuto anziché corruzione**: I delta non validi vengono rifiutati, non assorbiti silenziosamente.
- **Provenienza richiesta**: Ogni delta accettato traccia la sua origine ai turni sorgente.

## Risultati di scalabilità

| Lunghezza della trascrizione | Contesto rispetto al testo originale | Crescita degli elementi |
|------------------|---------------|--------------|
| Breve (9-14 turni) | 18-62% del testo originale | ~lineare |
| Lungo (56-62 turni) | **12-24% del testo originale** | sublineare (2,9 volte più elementi per 5 volte i turni) |

Più lunga è la sessione, maggiore è il valore che DeltaMind offre. Punteggio di verifica: 6/6 per tutte le classi di configurazione.

## Stato

**Fasi 1–5C completate. 229 test (192 di base + 37 tramite interfaccia a riga di comando).**

- Fase 1: Schema, reconciliatore, invarianti, ambiente di test, aspetti economici
- Fase 2: Estrattore basato su regole, estrattore LLM, pipeline ibrida, ottimizzazione del modello, revisione dell'ontologia
- Fase 3: Runtime della sessione, livello di persistenza
- Fase 4: Adattatore ai-loadout, adattatore claude-memories, ambiente di test interno
- Fase 5: Runtime LLM predefinito, identità semantica, interfaccia a riga di comando per gli operatori

## Licenza

MIT

---

Creato da [MCP Tool Shop](https://mcp-tool-shop.github.io/)

<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## El problema

Las transcripciones de las conversaciones son una memoria de trabajo deficiente. Mezclan hechos establecidos, ideas tentativas, ruido de herramientas, explicaciones repetidas y planes modificados en una masa confusa. A medida que las conversaciones se alargan, los agentes se vuelven seniles, olvidando las restricciones iniciales mientras se aferran a planes obsoletos.

Los resúmenes son imprecisos. Simplifican los matices, destruyen la procedencia y mezclan la especulación con la verdad establecida. No se puede preguntar a un resumen "¿qué decidimos sobre X y por qué?".

## La idea

No almacene la conversación. Almacene lo que la conversación cambió.

DeltaMind reemplaza la transcripción como memoria con el **estado como memoria**. En lugar de resumir la historia, emite **deltas tipados**: decisiones tomadas, restricciones añadidas, tareas iniciadas, hipótesis introducidas, y los reconcilia en un estado estructurado y consultable.

Una sesión de 500 interacciones debería ser más clara en la interacción 500 que en la interacción 50.

## Arquitectura

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

**Tres representaciones, cada una con una única función:**

| Representación | Propósito | Formato |
|---------------|---------|--------|
| Registro de eventos | Lo que sucedió | `PROVENANCE.jsonl` (solo se añade información) |
| Instantánea del estado | Verdad actual | `snapshot.json` (con versión) |
| Proyecciones en Markdown | Inspección humana | `*.md` (generado, nunca es la fuente definitiva) |

## Paquetes

| Paquete | Descripción |
|---------|-------------|
| `@deltamind/core` | Deltas tipados, modelo de estado, reconciliación, extracción, persistencia, adaptadores. |
| `@deltamind/cli` | Interfaz de línea de comandos (CLI) para operadores: inspeccionar, exportar, reproducir, depurar sesiones. |

## Cómo empezar

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

## Interfaz de línea de comandos (CLI)

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

## Tipos de deltas

DeltaMind rastrea 11 cambios de estado tipados:

| Delta | Lo que captura |
|-------|-----------------|
| `goal_set` | Lo que la sesión intenta lograr |
| `decision_made` | Una elección definitiva |
| `decision_revised` | Un cambio a una decisión anterior |
| `constraint_added` | Una regla o límite |
| `constraint_revised` | Una relajación, un endurecimiento o una modificación |
| `task_opened` | Trabajo por realizar |
| `task_closed` | Trabajo completado o abandonado |
| `fact_learned` | Un conocimiento estable |
| `hypothesis_introduced` | Una idea tentativa (no una decisión) |
| `branch_created` | Alternativas no resueltas |
| `item_superseded` | Algo reemplazado por algo más nuevo |

## Extracción

Híbrida por diseño. Dos extractores con fortalezas complementarias:

- **Basada en reglas**: Rápida, precisa, de costo cero. Captura patrones explícitos ("decidimos", "no debe", "tarea: ..."). 100% de precisión, menor capacidad de recuperación.
- **Impulsada por LLM** (gemma2:9b vía Ollama): Captura elementos semánticos (objetivos, decisiones de alto nivel) que las expresiones regulares no detectan. 100% de precisión en modelos seguros, mayor capacidad de recuperación en deltas principales.

Ambos calculan **identificadores semánticos** — hashes FNV-1a del contenido normalizado. El significado equivalente converge independientemente de la ruta de extracción.

## Invariantes de seguridad

- **Sin canonización**: El lenguaje ambiguo ("tal vez Redis?") nunca se convierte en una decisión.
- **Límite de advertencia**: Las sugerencias de memoria excluyen hipótesis y elementos etiquetados como rama.
- **Revisión con ámbito de tipo**: Las decisiones solo pueden revisar decisiones, las restricciones solo pueden revisar restricciones.
- **Rechazo sobre corrupción**: Los deltas inválidos se rechazan, nunca se absorben silenciosamente.
- **Procedencia requerida**: Cada delta aceptado tiene un origen en las interacciones originales.

## Resultados de escalamiento

| Longitud de la transcripción | Contexto vs. datos brutos | Crecimiento de elementos |
|------------------|---------------|--------------|
| Corta (9-14 interacciones) | 18-62% de los datos brutos | ~lineal |
| Larga (56-62 interacciones) | **12-24% de los datos brutos** | sublineal (2.9 veces más elementos para 5 veces más interacciones) |

Cuanto más larga sea la sesión, más valor aporta DeltaMind. Puntuación de consulta: 6/6 en todas las clases de configuración.

## Estado

**Fases 1 a 5C completadas. 229 pruebas (192 pruebas principales + 37 pruebas de línea de comandos).**

- Fase 1: Esquema, conciliador, invariantes, entorno de pruebas, economía.
- Fase 2: Extractor basado en reglas, extractor de LLM, canalización híbrida, exploración de modelos, ontología de revisión.
- Fase 3: Tiempo de ejecución de la sesión, capa de persistencia.
- Fase 4: Adaptador ai-loadout, adaptador claude-memories, entorno de pruebas interno.
- Fase 5: Tiempo de ejecución predeterminado de LLM, identidad semántica, línea de comandos del operador.

## Licencia

MIT

---

Creado por [MCP Tool Shop](https://mcp-tool-shop.github.io/)

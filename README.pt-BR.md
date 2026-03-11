<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
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

## O problema

As transcrições de conversas são uma memória de trabalho terrível. Elas misturam fatos estabelecidos, ideias preliminares, ruídos de ferramentas, explicações repetidas e planos alterados em um amontoado confuso. À medida que as conversas se prolongam, os agentes se tornam senis — esquecendo as restrições iniciais, enquanto se apegam a planos obsoletos.

Os resumos são imprecisos. Eles simplificam demais, destroem a origem das informações e misturam especulações com verdades comprovadas. Não é possível perguntar a um resumo "o que decidimos sobre X e por quê?".

## A ideia

Não armazene a conversa. Armazene o que a conversa mudou.

O DeltaMind substitui a transcrição como memória pelo **estado como memória**. Em vez de resumir o histórico, ele emite **deltas tipados** — decisões tomadas, restrições adicionadas, tarefas iniciadas, hipóteses introduzidas — e os reconcilia em um estado estruturado e pesquisável.

Uma sessão com 500 interações deve parecer mais clara na interação 500 do que na interação 50.

## Arquitetura

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

**Três representações, cada uma com uma função específica:**

| Representação | Propósito | Formato |
|---------------|---------|--------|
| Registro de eventos | O que aconteceu | `PROVENANCE.jsonl` (apenas para anexar) |
| Snapshot do estado | Estado atual | `snapshot.json` (com controle de versão) |
| Projeções em Markdown | Inspeção humana | `*.md` (gerado, nunca definitivo) |

## Pacotes

| Pacote | Descrição |
|---------|-------------|
| `@deltamind/core` | Deltas tipados, modelo de estado, reconciliação, extração, persistência, adaptadores |
| `@deltamind/cli` | Interface de linha de comando (CLI) para operadores — inspecionar, exportar, reproduzir, depurar sessões |

## Como começar

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

## Interface de linha de comando (CLI)

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

## Tipos de delta

O DeltaMind rastreia 11 tipos de alterações de estado:

| Delta | O que ele captura |
|-------|-----------------|
| `goal_set` | O que a sessão está tentando alcançar |
| `decision_made` | Uma escolha definitiva |
| `decision_revised` | Uma alteração em uma decisão anterior |
| `constraint_added` | Uma regra ou limite |
| `constraint_revised` | Uma flexibilização, endurecimento ou modificação |
| `task_opened` | Trabalho a ser feito |
| `task_closed` | Trabalho concluído ou abandonado |
| `fact_learned` | Um conhecimento estável |
| `hypothesis_introduced` | Uma ideia preliminar (não uma decisão) |
| `branch_created` | Alternativas não resolvidas |
| `item_superseded` | Algo substituído por algo mais novo |

## Extração

Híbrido por design. Dois extratores com pontos fortes complementares:

- **Baseado em regras**: Rápido, preciso, com custo zero. Captura padrões explícitos ("decidimos", "não deve", "tarefa: ..."). 100% de precisão, menor capacidade de recuperação.
- **Baseado em LLM** (gemma2:9b via Ollama): Captura itens semânticos (objetivos, decisões de alto nível) que as expressões regulares não capturam. 100% de precisão em modelos seguros, maior capacidade de recuperação em deltas principais.

Ambos calculam **IDs semânticos** — hashes FNV-1a do conteúdo normalizado. O significado equivalente converge, independentemente do caminho de extração.

## Invariantes de segurança

- **Nenhuma canonização**: Linguagem hesitante ("talvez Redis?") nunca se torna uma decisão.
- **Limite de aviso**: Sugestões de memória excluem hipóteses e itens marcados como ramificações.
- **Revisão com escopo de tipo**: Decisões só podem revisar decisões, restrições só podem revisar restrições.
- **Rejeição em vez de corrupção**: Deltas inválidos são rejeitados, nunca absorvidos silenciosamente.
- **Rastreabilidade obrigatória**: Cada delta aceito rastreia até as interações de origem.

## Resultados de escalabilidade

| Comprimento da transcrição | Contexto vs. dados brutos | Crescimento de itens |
|------------------|---------------|--------------|
| Curta (9-14 interações) | 18-62% dos dados brutos | ~linear |
| Longa (56-62 interações) | **12-24% dos dados brutos** | sublinear (2,9x itens para 5x interações) |

Quanto mais longa a sessão, mais o DeltaMind demonstra sua utilidade. Pontuação de consulta: 6/6 em todas as classes de configuração.

## Status

**Fases 1 a 5C concluídas. 229 testes (192 principais + 37 de linha de comando).**

- Fase 1: Esquema, reconciliador, invariantes, estrutura de testes, economia.
- Fase 2: Extrator baseado em regras, extrator de LLM, pipeline híbrido, varredura de modelos, ontologia de revisão.
- Fase 3: Tempo de execução da sessão, camada de persistência.
- Fase 4: Adaptador ai-loadout, adaptador claude-memories, estrutura de testes interna.
- Fase 5: Tempo de execução padrão de LLM, identidade semântica, interface de linha de comando do operador.

## Licença

MIT

---

Criado por [MCP Tool Shop](https://mcp-tool-shop.github.io/)

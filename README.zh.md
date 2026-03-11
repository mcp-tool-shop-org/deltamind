<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## 问题

聊天记录是一种糟糕的工作记忆。它将已确定的事实、初步的想法、工具噪音、重复的解释以及变更的计划混杂在一起，形成一个不断膨胀的混乱信息。随着对话的进行，参与者会变得健忘，忘记早期的约束，却仍然坚持过时的计划。

摘要会扭曲事实。它会抹平细微之处，破坏信息的来源，并将猜测与已确定的事实混淆。你无法向摘要询问“我们关于X的决定是什么，以及为什么？”

## 想法

不要存储整个对话。存储对话所带来的变化。

DeltaMind 用“状态”代替“聊天记录”作为记忆。它不是总结历史，而是输出带有类型的“增量”（deltas），记录了做出的决策、添加的约束、打开的任务、提出的假设，并将这些增量整合到一个结构化的、可查询的状态中。

一个包含500个回合的会话，应该在第500个回合时比在第50个回合时更清晰。

## 架构

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

**三种表示方式，每种负责一项任务：**

| 表示方式 | 目的 | 格式 |
|---------------|---------|--------|
| 事件日志 | 发生了什么 | `PROVENANCE.jsonl` (仅追加) |
| 状态快照 | 当前的事实 | `snapshot.json` (版本控制) |
| Markdown 投影 | 人工检查 | `*.md` (生成，但不具有权威性) |

## 组件

| 组件 | 描述 |
|---------|-------------|
| `@deltamind/core` | 带有类型的增量、状态模型、合并、提取、持久化、适配器 |
| `@deltamind/cli` | 命令行界面 (CLI) — 检查、导出、重放、调试会话 |

## 快速入门

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

## 命令行界面 (CLI)

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

## 增量类型

DeltaMind 跟踪 11 种类型的状态变化：

| 增量 | 它捕获的内容 |
|-------|-----------------|
| `goal_set` | 会话试图实现的目标 |
| `decision_made` | 一个已确定的选择 |
| `decision_revised` | 对先前决定的更改 |
| `constraint_added` | 一个规则或边界 |
| `constraint_revised` | 一个放松、收紧或修改 |
| `task_opened` | 需要完成的工作 |
| `task_closed` | 已完成或已放弃的工作 |
| `fact_learned` | 一个稳定的知识点 |
| `hypothesis_introduced` | 一个初步的想法（不是一个决定） |
| `branch_created` | 未解决的备选方案 |
| `item_superseded` | 被更新内容所取代的内容 |

## 提取

设计上是混合式的。有两种提取器，具有互补的优势：

- **基于规则的：** 速度快，精确，成本低。捕获明确的模式（例如“我们决定”、“必须不”、“任务：...”）。 100% 的精确度，较低的召回率。
- **基于 LLM 的：** (使用 Ollama 的 gemma2:9b) 捕获语义项（目标、高级决策），这些项是正则表达式无法捕捉到的。 对于安全模型，精确度为 100%，对于核心增量，召回率更高。

两者都计算 **语义 ID** — 对规范化内容的 FNV-1a 哈希值。 无论提取路径如何，具有相同含义的内容都会收敛。

## 安全约束

- **零规范化：** 带有不确定性的语言（例如“也许是 Redis？”）永远不会成为一个决定。
- **建议边界：** 记忆建议排除假设和带有分支标签的项目。
- **类型范围内的修订：** 只能修订决策，只能修订约束。
- **拒绝而不是损坏：** 无效的增量会被拒绝，而不会被默默地吸收。
- **需要溯源：** 每个被接受的增量都必须追溯到原始回合。

## 扩展结果

| 聊天记录长度 | 上下文与原始数据 | 增量数量增长 |
|------------------|---------------|--------------|
| 短 (9-14 回合) | 原始数据的 18-62% | 线性增长 |
| 长 (56-62 回合) | 原始数据的 **12-24%** | 亚线性增长 (5 倍的回合数，增量数量增加 2.9 倍) |

DeltaMind 的价值体现在会话时间越长，其收益越高。查询得分：所有配置类别均为 6/6。

## 状态

**阶段 1–5C 已完成。共 229 个测试（192 个核心测试 + 37 个命令行测试）。**

- 阶段 1：模式、协调器、不变性、测试框架、经济性
- 阶段 2：基于规则的提取器、LLM 提取器、混合流水线、模型扫描、修订本体
- 阶段 3：会话运行时、持久层
- 阶段 4：ai-loadout 适配器、claude-memories 适配器、内部测试框架
- 阶段 5：LLM 默认运行时、语义身份、操作员命令行

## 许可证

MIT

---

由 [MCP Tool Shop](https://mcp-tool-shop.github.io/) 构建。

<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## 这是什么？

`@deltamind/core` 是 DeltaMind 的运行时引擎，DeltaMind 是一种系统，它用 **状态作为记忆** 来替代传统的“转录作为记忆”的方式，用于人工智能代理。

与重新阅读旧消息不同，代理会发出带有类型信息的增量数据（目标集、决策、约束、任务、修订等），这些增量数据会被整合到一个规范的状态中。该状态可以被导出为带有令牌限制的上下文块，供任何下游应用使用。

## 安装

```bash
npm install @deltamind/core
```

## 快速开始

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

## 关键概念

- **增量数据 (Deltas)** — 带有类型信息的状态变化（11种类型：目标集、决策、约束、任务、修订、偏好、上下文锚点、开放式问题、洞察、假设、依赖关系）
- **整合 (Reconciliation)** — 强制执行 7 条不变性规则（例如：不允许重复、不允许矛盾、仅允许修订等）
- **溯源 (Provenance)** — 完整事件日志，记录了哪些内容被接受、被拒绝以及原因。
- **语义 ID (Semantic IDs)** — 基于内容的内容寻址身份，用于在对话过程中进行去重。
- **上下文导出 (Context export)** — 按照优先级排序、考虑预算的状态呈现。

## 链接

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [手册](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [CLI 包](https://www.npmjs.com/package/@deltamind/cli)

## 许可证

MIT

<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## 这是什么？

`@deltamind/cli` 是 [DeltaMind](https://www.npmjs.com/package/@deltamind/core) 的操作者命令行工具，它提供了 8 个命令，允许您在终端中检查、调试和导出代理的内存会话。

## 安装

```bash
npm install -g @deltamind/cli
```

## 命令

| 命令 | 描述 |
|---------|-------------|
| `deltamind inspect` | 显示活动状态（所有项目或 `--kind goal`） |
| `deltamind export` | 导出上下文块（`--max-chars 4000`，`--for ai-loadout`） |
| `deltamind changed --since <ref>` | 显示自某个时间戳、序列或回合 ID 以来的更改 |
| `deltamind explain <id>` | 显示某个项目的完整历史记录，包括字段、变更和来源 |
| `deltamind replay` | 查看来源日志（`--since`，`--type accepted`） |
| `deltamind suggest-memory` | 建议更新内存文件（`--min-confidence 0.8`） |
| `deltamind save` | 将会话保存到 `.deltamind/` 目录（使用 `--from-stdin` 选项可以从标准输入读取快照） |
| `deltamind resume` | 加载会话并显示统计信息 |

所有命令都支持 `--json` 选项，用于生成机器可读的输出。

## 设计

- **支持管道传输** — 标准输出是数据，标准错误输出是诊断信息，不包含 ANSI 编码。
- **退出码** — 0 表示成功，1 表示使用错误，2 表示没有 `.deltamind/` 目录。
- **零配置** — 通过从当前工作目录向上查找来定位 `.deltamind/` 目录（类似于 `.git/`）。
- **无框架** — 使用 Node 18+ 的 `parseArgs`，除了 `@deltamind/core` 之外没有其他运行时依赖。

## 示例

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

## 链接

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [手册](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [核心包](https://www.npmjs.com/package/@deltamind/core)

## 许可证

MIT

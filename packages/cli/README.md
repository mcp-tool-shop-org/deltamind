<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## What is this?

`@deltamind/cli` is the operator shell for [DeltaMind](https://www.npmjs.com/package/@deltamind/core) — 8 commands that let you inspect, debug, and export agent memory sessions from the terminal.

## Install

```bash
npm install -g @deltamind/cli
```

## Commands

| Command | Description |
|---------|-------------|
| `deltamind inspect` | Show active state (all items or `--kind goal`) |
| `deltamind export` | Export context block (`--max-chars 4000`, `--for ai-loadout`) |
| `deltamind changed --since <ref>` | Show what changed since a timestamp, sequence, or turn ID |
| `deltamind explain <id>` | Full history of one item — fields, deltas, provenance |
| `deltamind replay` | Walk the provenance log (`--since`, `--type accepted`) |
| `deltamind suggest-memory` | Suggest memory file updates (`--min-confidence 0.8`) |
| `deltamind save` | Save session to `.deltamind/` (`--from-stdin` for piped snapshots) |
| `deltamind resume` | Load session and show stats |

All commands support `--json` for machine-readable output.

## Design

- **Pipe-friendly** — stdout is data, stderr is diagnostics, no ANSI codes
- **Exit codes** — 0 success, 1 usage error, 2 no `.deltamind/` directory
- **Zero config** — finds `.deltamind/` by walking up from cwd (like `.git/`)
- **No framework** — Node 18+ `parseArgs`, zero runtime dependencies beyond `@deltamind/core`

## Example

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

## Links

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [Handbook](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [Core package](https://www.npmjs.com/package/@deltamind/core)

## License

MIT

<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
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

## O que é isso?

`@deltamind/cli` é a interface de linha de comando para [DeltaMind](https://www.npmjs.com/package/@deltamind/core) — 8 comandos que permitem inspecionar, depurar e exportar sessões de memória de agentes a partir do terminal.

## Instalação

```bash
npm install -g @deltamind/cli
```

## Comandos

| Comando | Descrição |
|---------|-------------|
| `deltamind inspect` | Mostra o estado ativo (todos os itens ou `--kind goal`) |
| `deltamind export` | Exporta um bloco de contexto (`--max-chars 4000`, `--for ai-loadout`) |
| `deltamind changed --since <ref>` | Mostra o que mudou desde um carimbo de data/hora, sequência ou ID de turno. |
| `deltamind explain <id>` | Histórico completo de um item — campos, alterações, origem. |
| `deltamind replay` | Percorre o registro de origem (`--since`, `--type accepted`) |
| `deltamind suggest-memory` | Sugere atualizações do arquivo de memória (`--min-confidence 0.8`) |
| `deltamind save` | Salva a sessão em `.deltamind/` (`--from-stdin` para snapshots enviados por pipe) |
| `deltamind resume` | Carrega a sessão e mostra as estatísticas. |

Todos os comandos suportam `--json` para saída legível por máquina.

## Design

- **Compatível com pipes** — a saída padrão (stdout) é dados, a saída de erro padrão (stderr) é para diagnósticos, sem códigos ANSI.
- **Códigos de saída** — 0 para sucesso, 1 para erro de uso, 2 se o diretório `.deltamind/` não existir.
- **Configuração mínima** — encontra `.deltamind/` percorrendo os diretórios a partir do diretório de trabalho atual (como `.git/`).
- **Sem framework** — usa `parseArgs` do Node 18+ e não possui dependências de tempo de execução além de `@deltamind/core`.

## Exemplo

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
- [Manual](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [Pacote Core](https://www.npmjs.com/package/@deltamind/core)

## Licença

MIT

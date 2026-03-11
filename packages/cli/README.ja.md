<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## これは何ですか？

`@deltamind/cli` は、[DeltaMind](https://www.npmjs.com/package/@deltamind/core) のオペレーターシェルです。ターミナルからエージェントのメモリセッションを検査、デバッグ、エクスポートするための8つのコマンドを提供します。

## インストール

```bash
npm install -g @deltamind/cli
```

## コマンド

| コマンド | 説明 |
|---------|-------------|
| `deltamind inspect` | アクティブな状態を表示します（すべての項目、または `--kind goal` を指定）。 |
| `deltamind export` | コンテキストブロックをエクスポートします (`--max-chars 4000`、`--for ai-loadout`）。 |
| `deltamind changed --since <ref>` | 特定のタイムスタンプ、シーケンス、またはターンID以降に変更された内容を表示します。 |
| `deltamind explain <id>` | 特定の項目の完全な履歴を表示します。フィールド、デルタ、由来などを確認できます。 |
| `deltamind replay` | 由来ログを辿ります (`--since`、`--type accepted`）。 |
| `deltamind suggest-memory` | メモリファイルの更新を提案します (`--min-confidence 0.8`）。 |
| `deltamind save` | セッションを `.deltamind/` フォルダに保存します (`--from-stdin` は、パイプで渡されたスナップショットの場合に使用）。 |
| `deltamind resume` | セッションをロードし、統計情報を表示します。 |

すべてのコマンドは、機械可読な出力のために `--json` オプションをサポートしています。

## 設計

- **パイプに対応:** 標準出力はデータ、標準エラー出力は診断情報であり、ANSIコードは含まれません。
- **終了コード:** 0 は成功、1 は使用方法のエラー、2 は `.deltamind/` フォルダが存在しないことを示します。
- **設定不要:** 現在のディレクトリから上位のディレクトリを検索して `.deltamind/` フォルダを見つけます（`.git/` と同様）。
- **フレームワーク不要:** Node 18 以降の `parseArgs` を使用し、`@deltamind/core` 以外の実行時依存関係はありません。

## 例

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

## リンク

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [Handbook](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [Core package](https://www.npmjs.com/package/@deltamind/core)

## ライセンス

MIT

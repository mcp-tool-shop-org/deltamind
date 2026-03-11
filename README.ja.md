<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## 問題点

チャットのトランスクリプトは、記憶として機能するには不十分です。そこには、確定した事実、仮説、ツールのノイズ、繰り返しの説明、変更された計画などが混在しており、全体としてまとまりのない状態になります。会話が長くなるにつれて、エージェントは認知症のような状態になり、初期の制約を忘れ、古い計画にしがみつきます。

要約は、内容を歪めてしまいます。ニュアンスを失わせ、情報の出所を破壊し、推測と確定した事実を混同します。要約に対して「Xについてどのような決定を下し、なぜそうしたのか？」と質問することはできません。

## アイデア

会話の内容を保存するのではなく、会話によって何が変わったのかを保存します。

DeltaMindは、トランスクリプトを記憶としてではなく、**状態を記憶**として扱います。履歴を要約する代わりに、**型付きのデルタ**を生成します。これには、決定事項、追加された制約、開始されたタスク、導入された仮説などが含まれ、これらを構造化された、検索可能な状態に統合します。

500ターンのセッションでは、50ターン目の方が5ターン目よりも、状況が明確であるはずです。

## アーキテクチャ

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

**3つの表現があり、それぞれが特定の役割を担います。**

| 表現 | 目的 | 形式 |
|---------------|---------|--------|
| イベントログ | 何が起こったか | `PROVENANCE.jsonl` (追記専用) |
| 状態のスナップショット | 現在の状態 | `snapshot.json` (バージョン管理) |
| Markdown形式の表現 | 人間による確認 | `*.md` (生成されたもの、常に公式なものではない) |

## パッケージ

| パッケージ | 説明 |
|---------|-------------|
| `@deltamind/core` | 型付きデルタ、状態モデル、調整、抽出、永続化、アダプター |
| `@deltamind/cli` | オペレーターCLI：セッションの検査、エクスポート、リプレイ、デバッグ |

## クイックスタート

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

## CLI（コマンドラインインターフェース）

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

## デルタの種類

DeltaMindは、11種類の型付きの状態変化を追跡します。

| デルタ | 何が記録されるか |
|-------|-----------------|
| `goal_set` | セッションが何を達成しようとしているか |
| `decision_made` | 確定した選択 |
| `decision_revised` | 以前の決定に対する変更 |
| `constraint_added` | ルールまたは境界 |
| `constraint_revised` | 緩和、厳格化、または修正 |
| `task_opened` | 実行すべき作業 |
| `task_closed` | 完了または中止された作業 |
| `fact_learned` | 安定した知識 |
| `hypothesis_introduced` | 仮説（決定ではない） |
| `branch_created` | 未解決の選択肢 |
| `item_superseded` | より新しいものに置き換えられたもの |

## 抽出

設計上、ハイブリッド方式を採用しています。相補的な強みを持つ2つの抽出器があります。

- **ルールベース**: 高速、正確、コストゼロ。明示的なパターンを検出します（例：「決定しました」、「～してはならない」、「タスク：～」）。100%の精度ですが、再現率は低い。
- **LLM（大規模言語モデル）ベース**: 正規表現では検出できない、目標や高レベルの決定などの意味的な項目を検出します。安全なモデルでは100%の精度ですが、デルタの再現率は高い。

どちらも、**意味的なID**を計算します。これは、正規化されたコンテンツのFNV-1aハッシュです。抽出経路に関わらず、意味的に同じものは同じIDになります。

## 安全性の制約

- **正規化の禁止**: 曖昧な表現（例：「もしかしてRedisを使うか？」）は、決定事項にはなりません。
- **アドバイザリー境界**: 記憶の提案には、仮説やブランチタグが付与された項目は含まれません。
- **型範囲の修正**: 決定は決定のみを修正でき、制約は制約のみを修正できます。
- **拒否優先**: 無効なデルタは、サイレントに吸収されることはなく、常に拒否されます。
- **出所情報の必要性**: 許容されるすべてのデルタは、元のターンにトレース可能です。

## スケーリング結果

| トランスクリプトの長さ | コンテキストと生のデータ | アイテムの増加 |
|------------------|---------------|--------------|
| 短い（9～14ターン） | 生のデータの18～62% | ほぼ線形 |
| 長い（56～62ターン） | 生のデータの**12～24%** | サブ線形（ターンの5倍に対して、アイテムは2.9倍増加） |

セッションが長ければ長いほど、DeltaMind の価値がより明確になります。すべてのテストケースにおいて、評価スコアは6/6でした。

## ステータス

**フェーズ1～5Cが完了。229件のテストを実施（コアテスト192件、CLIテスト37件）。**

- フェーズ1：スキーマ、リコンサイラー、不変条件、テストフレームワーク、経済性
- フェーズ2：ルールベース抽出器、LLM抽出器、ハイブリッドパイプライン、モデル評価、知識体系の改訂
- フェーズ3：セッション実行環境、永続化レイヤー
- フェーズ4：ai-loadoutアダプター、claude-memoriesアダプター、社内向けテストフレームワーク
- フェーズ5：LLMのデフォルト実行環境、意味的同一性、オペレーターCLI

## ライセンス

MIT

---

[MCP Tool Shop](https://mcp-tool-shop.github.io/)によって作成されました。

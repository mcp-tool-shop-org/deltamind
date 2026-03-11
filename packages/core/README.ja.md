<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

## これは何ですか？

`@deltamind/core` は、DeltaMind の実行エンジンです。DeltaMind は、AI エージェントのためのシステムであり、従来の「記録を記憶として利用する」のではなく、**「状態を記憶として利用する」** ことを特徴としています。

エージェントは、古いメッセージを再読み込みする代わりに、型付きのデルタ（目標セット、意思決定、制約、タスク、修正など）を生成し、それらが標準的な状態に統合されます。その状態は、任意のダウンストリームの利用者のために、トークン数に基づいて調整されたコンテキストブロックとしてエクスポートできます。

## インストール

```bash
npm install @deltamind/core
```

## クイックスタート

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

## 主要な概念

- **デルタ**：型付きの状態変化（11種類：目標セット、意思決定、制約、タスク、修正、好み、コンテキストアンカー、未解決の質問、洞察、仮定、依存関係）
- **整合性**：7つの不変条件を適用します（重複の禁止、矛盾の禁止、修正のみによる変更など）
- **トレーサビリティ**：受け入れられた、拒否された、およびその理由に関する完全なイベントログ
- **セマンティックID**：ターン全体での重複排除のための、コンテンツに基づいた識別子
- **コンテキストエクスポート**：優先順位に基づいて調整され、リソース制限を考慮した状態のレンダリング

## リンク

- [GitHub](https://github.com/mcp-tool-shop-org/deltamind)
- [ハンドブック](https://mcp-tool-shop-org.github.io/deltamind/handbook/)
- [CLI パッケージ](https://www.npmjs.com/package/@deltamind/cli)

## ライセンス

MIT

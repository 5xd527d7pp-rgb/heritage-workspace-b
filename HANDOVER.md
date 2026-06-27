# 引継ぎメモ

文化財保存活用地域計画の執筆支援ツール（**道B**）の引継ぎ用メモです。詳細は [README.md](./README.md) を参照。

---

## これは何か

- **目的**: 地域計画の本文執筆を支援する Web アプリ（プロトタイプ）
- **位置づけ**: 道A（workspace-ui-kit 改造）と比較するための **新規 Next.js 版**
- **比較対象**: [workspace-ui-kit-heritage-a](https://github.com/5xd527d7pp-rgb/workspace-ui-kit-heritage-a)

---

## 起動

```bash
npm install
npm run dev
# → http://localhost:3000
```

---

## 技術スタック

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 16（App Router） |
| UI | shadcn/ui（Base UI + Tailwind CSS v4） |
| 型・バリデーション | Zod |
| 状態管理 | React useState（外部ライブラリなし） |
| 永続化 | localStorage（`heritage-workspace-b:v1`） |
| AI | ローカルスタブ（実 API 未接続） |

---

## 画面構成（4ペイン）

```
┌──────────┬─────────────────┬──────────────┐
│ 章立て   │                 │ 記載要件     │
│ 進捗     │   本文エディタ   │ チェック     │
│          │                 ├──────────────┤
│ (左)     │    (中央)       │ 素材データ   │
│          │                 │  (右下)      │
└──────────┴─────────────────┴──────────────┘
```

- 左ペイン折りたたみ: `Cmd+B` / `Ctrl+B`
- 右ペイン折りたたみ: `Cmd+J` / `Ctrl+J`

---

## データの流れ

1. **初期データ**: `src/data/*.json`（sections / requirements / materials / links / workspace）
2. **型の正本**: `src/lib/schema.ts`（Zod スキーマ）
3. **実行時**: `HeritageWorkspace` が state を保持
4. **保存**: 編集内容は localStorage に自動保存（リロード後も復元）
5. **リセット**: 画面内の「初期データに戻す」ボタン

---

## 触る場所（優先度順）

| やりたいこと | ファイル |
|---|---|
| UI 全体・レイアウト | `src/components/heritage/HeritageWorkspace.tsx` |
| 各ペイン | `src/components/heritage/{NavAside,EditorPane,RequirementsPane,MaterialsPane}.tsx` |
| ドメイン型・データ構造 | `src/lib/schema.ts` |
| 初期データ | `src/data/*.json` |
| AI 機能（スタブ） | `src/lib/ai/heritage.ts` |
| エクスポート（HTML / Word） | `src/lib/export/` |
| 永続化 | `src/lib/persistence/storage.ts` |

---

## 実装済み / 未実装

### 実装済み
- 節ごとの本文編集・進捗ステータス
- 記載要件の達成チェック
- 素材の追加・節への根拠紐付け
- 表紙メタ編集（案・年月・発行者）
- 目次ページの自動生成
- レビュー版 HTML 出力
- 提出用 Word 出力（`.doc`）
- localStorage 永続化

### スタブ / 未着手
- AI 下書き・要件チェック・素材紐付け候補（`src/lib/ai/heritage.ts`）
- サーバー側 API / DB 連携
- 素材データのインポート
- ユーザー認証

---

## 直近の変更（2026-06 時点）

- 右ペイン折りたたみ対応
- 提出用 Word のレイアウト・フォント統一
- 表紙フィールドの編集機能
- 目次ページの自動生成

---

## 次にやるなら

1. AI スタブを実 API に接続（`src/lib/ai/heritage.ts` の入出力契約は維持）
2. localStorage → DB（Neon / Postgres 等）への移行
3. 提出先に合わせた Word / HTML 書式調整
4. 素材データのインポート機能

---

## 注意点

- **道B は自由度が高い** → 規律（命名・コンポーネント分割）は自分で決める必要あり
- **データの正本は `schema.ts`** → JSON や UI を変えるときはここから
- **AI はスタブ** → 本番連携時も `AiContext` / `DraftResult` 等の型を守る
- 未コミット: `output/heritage-data-architecture.html`（図解アウトプット）

---

## 連絡・参照

- 設計の正本: heritage-plan-tool / designing-heritage-ui スキル
- 詳細ドキュメント: [README.md](./README.md)

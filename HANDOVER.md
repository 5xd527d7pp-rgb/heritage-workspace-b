# 引継ぎメモ

文化財保存活用地域計画の執筆支援ツール（**道B**）。詳細は [README.md](./README.md)。

---

## 現状（2026-06）

| 項目 | 状態 |
|---|---|
| 4ペイン UI・編集・エクスポート | ✅ 実装済み |
| 永続化 | localStorage（`heritage-workspace-b:v1`） |
| AI | `/api/ai` → Claude（キー未設定時はスタブ） |
| 本番公開 | ✅ Vercel（GitHub `main` 連携） |
| DB | ❌ 未着手（第7回課題） |

---

## 本番 URL（発表用）

| 用途 | URL |
|---|---|
| **アプリ（共有・発表）** | https://heritage-workspace-b-2mzn.vercel.app |
| 管理画面（Vercel） | https://vercel.com/atsunori-hasegawas-projects/heritage-workspace-b-2mzn |

一言: 文化財保存活用地域計画の執筆支援（4ペイン・localStorage 永続化・AI 下書き）

---

## 起動

```bash
npm install && npm run dev   # → http://localhost:3000
```

AI をローカルで使う: `.env.local.example` をコピーして `ANTHROPIC_API_KEY` を設定。

---

## 触る場所

| やりたいこと | ファイル |
|---|---|
| UI・レイアウト | `src/components/heritage/HeritageWorkspace.tsx` |
| 各ペイン | `src/components/heritage/*Pane.tsx` |
| 型・データ構造 | `src/lib/schema.ts` |
| 初期データ | `src/data/*.json` |
| AI（スタブ） | `src/lib/ai/heritage.ts` |
| AI（API） | `src/app/api/ai/route.ts` |
| 永続化 | `src/lib/persistence/storage.ts` |
| HTML / Word 出力 | `src/lib/export/` |

---

## 次にやるなら

1. **Neon DB 移行** — Vercel Storage → Neon、`DATABASE_URL` 設定、`storage.ts` を API 化
2. **`ANTHROPIC_API_KEY`** — Vercel 環境変数に追加 → Redeploy
3. 素材インポート、Word/HTML 書式調整

---

## 注意

- 型の正本は `schema.ts`。JSON・UI を変えるときはここから。
- 更新は `git push` → Vercel が自動デプロイ。
- 比較対象（道A）: [workspace-ui-kit-heritage-a](https://github.com/5xd527d7pp-rgb/workspace-ui-kit-heritage-a)

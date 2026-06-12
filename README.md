# heritage-workspace-b

文化財保存活用地域計画の本文執筆を支援する、道B（自由ルート）の Next.js プロトタイプです。

採用管理向けの `workspace-ui-kit` 雛形を直接改造するのではなく、`create-next-app` + shadcn/ui から新規に作り、heritage-plan-tool の設計思想に合わせて自由に構成しています。

## 位置づけ

このリポジトリは、2つのUI案を比較するための **道B: 新規アプリで自由構成** です。

- 道A: [`workspace-ui-kit-heritage-a`](https://github.com/5xd527d7pp-rgb/workspace-ui-kit-heritage-a)
- 道B: [`heritage-workspace-b`](https://github.com/5xd527d7pp-rgb/heritage-workspace-b)

どちらも同じ文化財保存活用地域計画ドメインを扱います。道Bは茶系テーマ、CSS Grid、必要最小限の状態管理で、heritage-plan-tool 原典に近い本番ツール候補として育てやすい構成にしています。

## 画面構成

4ペイン構成です。

- 左: 章立て・進捗
- 中央: 本文エディタ
- 右上: 記載要件チェックリスト
- 右下: 素材データ

左の章立て・進捗ペインは、ボタンまたは `Cmd+B` / `Ctrl+B` で折りたためます。

## 主な機能

- 節ごとの本文編集と進捗ステータス管理
- 記載要件の達成チェック
- 素材データの追加と節への根拠紐付け
- AI下書き、AI要件チェック、AI素材紐付け候補のスタブ
- レビュー版HTML出力（点検用・注釈付き）
- 提出用Word出力（Word互換HTMLを `.doc` として保存）

AI機能は現時点ではローカルの簡易スタブです。実API連携に進む場合も、`src/lib/ai/heritage.ts` の入出力契約を保つ想定です。

## 道A / 道B の比較

| 観点 | 道A: workspace-ui-kit 改造 | 道B: 新規 Next.js アプリ |
|---|---|---|
| 目的 | 教材・雛形の作法に乗る | 本命ツールとして自由に育てる |
| 土台 | 既存の4ペイン workspace-ui-kit | create-next-app + shadcn/ui |
| レイアウト | shadcn Sidebar / SidebarInset ベース | CSS Grid ベース |
| テーマ | workspace-ui-kit の設計規律を継承 | 茶系テーマで heritage-plan-tool に近い |
| 向いている用途 | 講義・比較・雛形としての説明 | 実運用に向けた機能追加 |
| 制約 | 既存テンプレート作法に寄せる | 自由度が高いぶん自分で規律を決める |

今回の比較では、同じ設計思想・同じデータ・同じ4ペイン責務を使ったため、見た目の概観は近くなっています。差が出るのは、今後の拡張時に「既存テンプレートの作法に乗るか」「ドメインに合わせて自由に変えるか」です。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。別ポートで起動する場合は次のように指定します。

```bash
PORT=3200 npm run dev
```

## 開発コマンド

```bash
npm run dev      # 開発サーバー
npm run build    # 本番ビルド
npm run lint     # ESLint
```

## ディレクトリ構成

```text
src/app/                         Next.js App Router
src/components/heritage/          4ペインUI本体
src/components/ui/                shadcn/ui 部品
src/data/                         初期データ(JSON)
src/lib/schema.ts                 ドメインスキーマと型
src/lib/ai/heritage.ts            AIアクションのスタブ
src/lib/export/                   レビュー版HTML / 提出用Word 出力
src/lib/computed/sections.ts      節単位の派生計算
```

## 次に育てるなら

- AIアクションを実APIに接続する
- レビュー版HTML / 提出用Wordの書式を提出先に合わせる
- 素材データのインポート機能を追加する
- 本文・要件・素材を永続化する
- 道Aとの差分を踏まえて、道B固有のデザインスキルを作る

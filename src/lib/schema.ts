/**
 * 文化財保存活用地域計画の執筆支援ドメインの Zod スキーマと派生型。
 * 雛形の SSoT として、UI コンポーネントはここから型をインポートする。
 *
 * レイアウト思想: 左=構造(章立て) / 中央=出力(本文) / 右上=仕様(要件) / 右下=材料(素材)。
 * 設計の正本は heritage-plan-tool の実装（designing-heritage-ui スキル参照）。
 */

import { z } from "zod";

// ===== 節の状態（章立てナビ・本文エディタで共通利用） =====

/** 節の進捗ステータス。STATUS_LABELS と一致する 6 段階。 */
export const sectionStatusSchema = z.enum([
  "not_started",
  "material_linked",
  "drafted",
  "checked",
  "reviewed",
  "done",
]);
export type SectionStatus = z.infer<typeof sectionStatusSchema>;

// ===== ① 章立て（Section） =====

/**
 * 計画書の章・節。`level: 1` が章、`level: 2` が節。
 * `parentId` は章へのリンク（章は null）。本文 `body` を持つのは主に節。
 */
export const sectionSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  number: z.string(),
  title: z.string(),
  body: z.string(),
  status: sectionStatusSchema,
  level: z.number(),
  // 目次のノンブル（例「序-1」「1-1」）。Word互換HTMLでは実ページを自動算出できない
  // ため手入力。空なら目次で点線のみ表示。古いデータに無くても default で補完。
  pageRef: z.string().default(""),
});
export type Section = z.infer<typeof sectionSchema>;

// ===== ③ 記載要件（Requirement） =====

/**
 * 指針・ハンドブック由来の記載要件カード（＝仕様）。
 * 本文の評価基準であり本文そのものではない。節に紐付く。
 */
export const requirementSchema = z.object({
  id: z.string(),
  sectionId: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  sourceDoc: z.string(),
  sourceLocation: z.string(),
  condition: z.string(),
  satisfied: z.boolean().default(false),
});
export type Requirement = z.infer<typeof requirementSchema>;

// ===== ④ 素材（Material） =====

/** 素材の種類。台帳 / 資料 / 画像。kindLabel と一致する。 */
export const materialKindSchema = z.enum(["inventory", "document", "image"]);
export type MaterialKind = z.infer<typeof materialKindSchema>;

/**
 * 取り込み参照型の素材（＝材料）。台帳・資料・画像など。
 * 節・要件に紐付けて本文の根拠にする。`textExcerpt` は AI の接地に使う抜粋。
 */
export const materialSchema = z.object({
  id: z.string(),
  kind: materialKindSchema,
  title: z.string(),
  refType: z.string(),
  location: z.string(),
  textExcerpt: z.string(),
});
export type Material = z.infer<typeof materialSchema>;

// ===== 紐付け（Link） =====

/** 素材と節・要件の紐付け。承認されるまで正式な根拠にしない。 */
export const linkStatusSchema = z.enum(["suggested", "approved"]);
export type LinkStatus = z.infer<typeof linkStatusSchema>;

export const linkSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  requirementId: z.string().nullable(),
  materialId: z.string(),
  status: linkStatusSchema,
  note: z.string().default(""),
});
export type Link = z.infer<typeof linkSchema>;

// ===== JSON 全体用スキーマ =====

export const sectionsSchema = z.array(sectionSchema);
export const requirementsSchema = z.array(requirementSchema);
export const materialsSchema = z.array(materialSchema);
export const linksSchema = z.array(linkSchema);
export const workspaceSchema = z.object({
  name: z.string(),
  icon: z.string(),
  // 表紙メタ。古い保存データ・JSON に無くても default で補完する（後方互換）。
  // status=「（案）」/ date=策定年月 / publisher=発行者。空文字なら表紙で非表示。
  status: z.string().default("（案）"),
  date: z.string().default("令和○年（202○）○月"),
  publisher: z.string().default("○○市"),
});
export type Workspace = z.infer<typeof workspaceSchema>;

// ===== AI アクション（draft / check / suggest-links） =====
//
// この雛形は Express サーバーを持たないため、AI ロジックは `lib/ai/heritage.ts`
// のローカル簡易関数（スタブ）。入出力契約は heritage-plan-tool と揃える。

/** AI 実行前にユーザーへ提示する送信コンテキスト。 */
export type AiContext = {
  section: Pick<Section, "number" | "title" | "body">;
  requirements: Requirement[];
  approvedMaterials: Material[];
};

/** 下書き作成の結果。根拠素材と不足を必ず併記する。 */
export type DraftResult = {
  draft: string;
  groundedOn: string[];
  insufficient: string[];
};

/** 要件チェックの結果（要件ごと）。最終判断は人。 */
export type CheckResultItem = {
  requirementId: string;
  requirementTitle: string;
  satisfied: boolean;
  reason: string;
};

/** 素材紐付け候補。承認で正式な根拠になる。 */
export type LinkSuggestion = {
  materialId: string;
  materialTitle: string;
  requirementId: string | null;
  requirementTitle: string | null;
  score: number;
};

/**
 * 雛形の表示文言（labels）。
 *
 * 文化財保存活用地域計画の執筆支援ドメイン。業種を変える受講生は、
 * このファイルの値を業種に合わせて書き換える。
 */

import { type SectionStatus, type MaterialKind } from "@/lib/schema";

// ===== 節の進捗ステータス（章立てナビ・本文エディタ共通） =====

export const STATUS_LABELS: Record<SectionStatus, string> = {
  not_started: "未着手",
  material_linked: "素材紐付け済",
  drafted: "下書き済",
  checked: "要件チェック済",
  reviewed: "レビュー済",
  done: "完了",
};

/** 状態セレクトの表示順。本文エディタの状態セレクトで使う。 */
export const STATUS_ORDER: SectionStatus[] = [
  "not_started",
  "material_linked",
  "drafted",
  "checked",
  "reviewed",
  "done",
];

// ===== 素材の種類（④ 素材データ） =====

export const KIND_LABELS: Record<MaterialKind, string> = {
  inventory: "台帳",
  document: "資料",
  image: "画像",
};

// ===== 各ペインの見出し =====

export const PANE_HEADERS = {
  nav: "章立て・進捗",
  editor: "本文エディタ",
  requirements: "記載要件チェックリスト",
  materials: "素材データ",
} as const;

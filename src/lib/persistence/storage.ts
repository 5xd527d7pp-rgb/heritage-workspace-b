/**
 * 道B のローカル永続化（localStorage）。
 *
 * 講義第7回「自分のツールに記憶を持たせる」の最初の一歩。
 * 編集中の state（章節・要件・素材・紐付け）をブラウザに保存し、
 * リロードしても消えないようにする。将来 DB(Neon/Postgres) に置き換える際も
 * 「読み込む / 保存する / 消す」という責務はこのモジュールに閉じる。
 *
 * 保存形式は JSON。読み込み時は zod で検証し、壊れていれば初期データに戻す
 * （捏造・部分復元はしない）。
 */

import {
  linksSchema,
  materialsSchema,
  requirementsSchema,
  sectionsSchema,
  type Link,
  type Material,
  type Requirement,
  type Section,
} from "@/lib/schema";
import { z } from "zod";

const STORAGE_KEY = "heritage-workspace-b:v1";

const persistedSchema = z.object({
  sections: sectionsSchema,
  requirements: requirementsSchema,
  materials: materialsSchema,
  links: linksSchema,
});

export type PersistedState = z.infer<typeof persistedSchema>;

/** localStorage から復元する。無い・壊れている場合は null。 */
export function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = persistedSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** 現在の編集状態を localStorage に保存する。 */
export function savePersisted(state: {
  sections: Section[];
  requirements: Requirement[];
  materials: Material[];
  links: Link[];
}): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 容量超過などは黙って無視（保存できなくても操作は継続できる）
  }
}

/** 保存データを消す（初期データに戻すときに使う）。 */
export function clearPersisted(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

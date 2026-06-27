/**
 * 道B の永続化（localStorage + 任意で Neon API）。
 *
 * 講義第7回「自分のツールに記憶を持たせる」。
 * 編集中の state を保存し、リロードしても消えないようにする。
 * DATABASE_URL 設定時は /api/workspace 経由で DB にも同期する。
 *
 * 読み込み時は zod で検証し、壊れていれば初期データに戻す（捏造・部分復元はしない）。
 */

import {
  type Link,
  type Material,
  type Requirement,
  type Section,
  type Workspace,
} from "@/lib/schema";
import {
  persistedSchema,
  type PersistedState,
} from "@/lib/persistence/schema";

export type { PersistedState };

const STORAGE_KEY = "heritage-workspace-b:v1";

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

export type PersistedPayload = {
  sections: Section[];
  requirements: Requirement[];
  materials: Material[];
  links: Link[];
  workspace: Workspace;
};

/** 現在の編集状態を localStorage に保存する。 */
export function savePersisted(state: PersistedPayload): void {
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

export type RemoteLoadResult = {
  /** DB API が利用可能か（503 なら false） */
  enabled: boolean;
  /** DB に保存済みデータがあれば返す。空なら null。 */
  state: PersistedState | null;
};

/** Neon API から復元。ネットワーク失敗時は enabled=false。 */
export async function loadRemotePersisted(): Promise<RemoteLoadResult> {
  try {
    const res = await fetch("/api/workspace");
    if (res.status === 503) {
      return { enabled: false, state: null };
    }
    if (!res.ok) {
      return { enabled: true, state: null };
    }
    const data: unknown = await res.json();
    if (data === null) {
      return { enabled: true, state: null };
    }
    const parsed = persistedSchema.safeParse(data);
    return { enabled: true, state: parsed.success ? parsed.data : null };
  } catch {
    return { enabled: false, state: null };
  }
}

/** Neon API に保存。DB 未設定時は false。 */
export async function saveRemotePersisted(state: PersistedPayload): Promise<boolean> {
  try {
    const res = await fetch("/api/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** リロード直前など、非同期完了を待てないときに DB へ送る。 */
export function flushRemotePersisted(state: PersistedPayload): void {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
      keepalive: true,
    });
  } catch {
    // noop
  }
}

/** Neon API の保存データを消す。 */
export async function clearRemotePersisted(): Promise<boolean> {
  try {
    const res = await fetch("/api/workspace", { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 節を軸にした派生計算。章立てナビの進捗バッジ・本文エディタの根拠表示で使う。
 * candidates 配列（旧採用管理）の派生計算を heritage 仕様に置き換えたもの。
 */

import { type Link, type Requirement } from "@/lib/schema";

/** 節の要件達成数（done / total）を派生計算する。 */
export function getRequirementProgress(
  sectionId: string,
  requirements: Requirement[],
): { total: number; done: number } {
  const reqs = requirements.filter((r) => r.sectionId === sectionId);
  return {
    total: reqs.length,
    done: reqs.filter((r) => r.satisfied).length,
  };
}

/** 節に承認済みの根拠（approved な Link）があるかを派生計算する。 */
export function hasEvidence(sectionId: string, links: Link[]): boolean {
  return links.some(
    (l) => l.sectionId === sectionId && l.status === "approved",
  );
}

/** 節に紐付く承認済み素材 id の集合を派生計算する。 */
export function approvedMaterialIds(
  sectionId: string,
  links: Link[],
): Set<string> {
  return new Set(
    links
      .filter((l) => l.sectionId === sectionId && l.status === "approved")
      .map((l) => l.materialId),
  );
}

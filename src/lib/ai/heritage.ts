/**
 * AI アクションのスタブ実装（ローカル簡易ロジック）。
 *
 * 設計上の契約を固定する:
 *   - 送信コンテキストは選択中の章節本文・該当要件・承認済み素材抜粋のみ
 *   - 材料に接地し、不足は捏造せず報告する
 *   - 確定は人。AI は候補を出す
 *
 * heritage-plan-tool の server/ai.ts を Next.js のクライアント純関数に移植。
 * 実 API に差し替える場合もこの入出力契約を保つ。
 */

import {
  type AiContext,
  type CheckResultItem,
  type DraftResult,
  type LinkSuggestion,
} from "@/lib/schema";

export function generateDraft(ctx: AiContext): DraftResult {
  const { section, requirements, approvedMaterials } = ctx;
  const groundedOn = approvedMaterials.map((m) => m.title);
  const insufficient: string[] = [];

  if (approvedMaterials.length === 0) {
    return {
      draft: "",
      groundedOn: [],
      insufficient: [
        "この節に紐付く承認済みの素材がありません。素材を紐付けてから下書きを生成してください（捏造は行いません）。",
      ],
    };
  }

  const lines: string[] = [];
  lines.push(`【${section.number} ${section.title}】の下書き（素材接地・要確認）`);
  lines.push("");
  for (const m of approvedMaterials) {
    lines.push(`本節では、${m.title}に基づき次の点を記述する。${m.textExcerpt}`);
  }
  lines.push("");
  for (const r of requirements) {
    if (r.condition) {
      lines.push(`（要件「${r.title}」への対応）${r.description}`);
    }
  }

  for (const r of requirements) {
    const covered = approvedMaterials.some((m) =>
      overlaps(m.textExcerpt + m.title, r.title + r.description),
    );
    if (!covered) {
      insufficient.push(`要件「${r.title}」を裏付ける素材が不足しています。`);
    }
  }

  return { draft: lines.join("\n"), groundedOn, insufficient };
}

export function checkRequirements(ctx: AiContext): CheckResultItem[] {
  const { section, requirements } = ctx;
  const body = section.body || "";
  return requirements.map((r) => {
    const hasBody = body.trim().length > 0;
    const mentions = overlaps(body, r.title + r.description + r.condition);
    const satisfied = hasBody && mentions;
    let reason: string;
    if (!hasBody) reason = "本文が未記入です。";
    else if (!mentions)
      reason = "本文に要件に対応する記述が見当たりません（薄い可能性）。";
    else
      reason = "要件に対応する記述が含まれています。最終確認は人が行ってください。";
    return {
      requirementId: r.id,
      requirementTitle: r.title,
      satisfied,
      reason,
    };
  });
}

export function suggestLinks(
  ctx: AiContext,
  allRequirements: { id: string; title: string; description: string; condition: string }[],
): LinkSuggestion[] {
  const { approvedMaterials } = ctx;
  const suggestions: LinkSuggestion[] = [];
  for (const m of approvedMaterials) {
    let bestId: string | null = null;
    let bestTitle: string | null = null;
    let bestScore = 0;
    for (const r of allRequirements) {
      const score = similarity(
        m.title + m.textExcerpt,
        r.title + r.description + r.condition,
      );
      if (score > bestScore) {
        bestScore = score;
        bestId = r.id;
        bestTitle = r.title;
      }
    }
    suggestions.push({
      materialId: m.id,
      materialTitle: m.title,
      requirementId: bestId,
      requirementTitle: bestTitle,
      score: Math.round(bestScore * 100) / 100,
    });
  }
  return suggestions.sort((a, b) => b.score - a.score);
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (t) => t.length >= 2,
  );
}

function overlaps(a: string, b: string): boolean {
  return similarity(a, b) > 0.05;
}

function similarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

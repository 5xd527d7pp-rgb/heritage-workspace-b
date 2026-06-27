/**
 * POST /api/ai
 *
 * 文化財保存活用地域計画の執筆支援 AI API ルート。
 * Anthropic Claude を呼び出し、下書き生成 / 要件チェック / 素材紐付け候補を返す。
 *
 * 講義第7・8回「発展課題: Webアプリケーションに AI を組み込む」の実装。
 *
 * 環境変数:
 *   ANTHROPIC_API_KEY  Claude API キー（未設定時はスタブで代替）
 *
 * Request body:
 *   { mode: "draft" | "check" | "suggest", context: AiContext, allRequirements?: Requirement[] }
 *
 * Response:
 *   DraftResult | CheckResultItem[] | LinkSuggestion[]
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  type AiContext,
  type CheckResultItem,
  type DraftResult,
  type LinkSuggestion,
  type Requirement,
} from "@/lib/schema";
import {
  generateDraft,
  checkRequirements,
  suggestLinks,
} from "@/lib/ai/heritage";

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { mode, context, allRequirements } = body as {
    mode: "draft" | "check" | "suggest";
    context: AiContext;
    allRequirements?: Requirement[];
  };

  if (!client) {
    // ANTHROPIC_API_KEY 未設定時はスタブで代替（開発・デモ用）
    if (mode === "draft") return NextResponse.json(generateDraft(context));
    if (mode === "check") return NextResponse.json(checkRequirements(context));
    return NextResponse.json(suggestLinks(context, allRequirements ?? []));
  }

  try {
    if (mode === "draft") {
      const result = await callDraft(client, context);
      return NextResponse.json(result);
    }
    if (mode === "check") {
      const result = await callCheck(client, context);
      return NextResponse.json(result);
    }
    const result = await callSuggest(client, context, allRequirements ?? []);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/ai] Claude error:", err);
    // API 障害時もスタブで代替
    if (mode === "draft") return NextResponse.json(generateDraft(context));
    if (mode === "check") return NextResponse.json(checkRequirements(context));
    return NextResponse.json(suggestLinks(context, allRequirements ?? []));
  }
}

// ── Claude 呼び出し ───────────────────────────────────────────────────────────

async function callDraft(
  client: Anthropic,
  ctx: AiContext,
): Promise<DraftResult> {
  const materialsText =
    ctx.approvedMaterials.length > 0
      ? ctx.approvedMaterials
          .map(
            (m) =>
              `【${m.title}（${m.refType}）】\n抜粋: ${m.textExcerpt || "（抜粋なし）"}`,
          )
          .join("\n\n")
      : "（承認済み素材なし）";

  const requirementsText =
    ctx.requirements.length > 0
      ? ctx.requirements
          .map(
            (r) =>
              `・${r.title}: ${r.description}${r.condition ? `\n  条件: ${r.condition}` : ""}`,
          )
          .join("\n")
      : "（記載要件カードなし）";

  const systemPrompt = `あなたは文化財保存活用地域計画の執筆支援 AI です。
行政文書として適切な文体（敬体ではなく常体）で、根拠素材に接地した下書きを作成します。
材料が不足している場合は捏造せず、不足を明記してください。
最終確認は必ず人が行うことを念頭に、過度な断定は避け「〜が考えられる」「〜を踏まえ」などの表現を使います。`;

  const userPrompt = `以下の節の下書きを作成してください。

# 対象節
${ctx.section.number} ${ctx.section.title}

# 現在の本文
${ctx.section.body || "（未記入）"}

# 記載要件（満たすべき要件）
${requirementsText}

# 承認済み素材（根拠にしてよい材料）
${materialsText}

---
出力形式（JSON）:
{
  "draft": "下書き本文",
  "groundedOn": ["根拠にした素材タイトル", ...],
  "insufficient": ["不足報告メッセージ", ...]
}
JSONのみ返してください。`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2048,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return generateDraft(ctx); // パース失敗時はスタブ

  try {
    return JSON.parse(jsonMatch[0]) as DraftResult;
  } catch {
    return generateDraft(ctx);
  }
}

async function callCheck(
  client: Anthropic,
  ctx: AiContext,
): Promise<CheckResultItem[]> {
  if (ctx.requirements.length === 0) return [];

  const requirementsText = ctx.requirements
    .map(
      (r, i) =>
        `${i + 1}. id="${r.id}" タイトル="${r.title}"\n   説明: ${r.description}${r.condition ? `\n   条件: ${r.condition}` : ""}`,
    )
    .join("\n\n");

  const systemPrompt = `あなたは文化財保存活用地域計画の審査 AI です。
本文が各記載要件を充足しているかを客観的に評価します。
最終判断は人が行う旨を踏まえ、根拠を具体的に示してください。`;

  const userPrompt = `以下の本文が、各記載要件を充足しているか評価してください。

# 節: ${ctx.section.number} ${ctx.section.title}
# 本文
${ctx.section.body || "（本文未記入）"}

# 記載要件
${requirementsText}

---
出力形式（JSON配列）:
[
  {
    "requirementId": "req-xxx",
    "requirementTitle": "要件名",
    "satisfied": true または false,
    "reason": "判定理由（具体的に）"
  },
  ...
]
JSONのみ返してください。`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 2048,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return checkRequirements(ctx);

  try {
    return JSON.parse(jsonMatch[0]) as CheckResultItem[];
  } catch {
    return checkRequirements(ctx);
  }
}

async function callSuggest(
  client: Anthropic,
  ctx: AiContext,
  allRequirements: Requirement[],
): Promise<LinkSuggestion[]> {
  if (ctx.approvedMaterials.length === 0) return [];

  const materialsText = ctx.approvedMaterials
    .map(
      (m, i) =>
        `${i + 1}. id="${m.id}" タイトル="${m.title}"\n   抜粋: ${m.textExcerpt || "（なし）"}`,
    )
    .join("\n\n");

  const requirementsText = allRequirements
    .map(
      (r, i) =>
        `${i + 1}. id="${r.id}" タイトル="${r.title}"\n   説明: ${r.description}`,
    )
    .join("\n\n");

  const systemPrompt = `あなたは文化財保存活用地域計画の執筆支援 AI です。
素材と記載要件の関連性を評価し、紐付け候補を提案します。`;

  const userPrompt = `以下の素材を、最も関連する記載要件と紐付けてください。

# 素材
${materialsText}

# 記載要件
${requirementsText}

---
出力形式（JSON配列）:
[
  {
    "materialId": "mat-xxx",
    "materialTitle": "素材名",
    "requirementId": "req-xxx または null",
    "requirementTitle": "要件名 または null",
    "score": 0.0〜1.0（関連度）
  },
  ...
]
JSONのみ返してください。`;

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: userPrompt }],
    system: systemPrompt,
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return suggestLinks(ctx, allRequirements);

  try {
    return JSON.parse(jsonMatch[0]) as LinkSuggestion[];
  } catch {
    return suggestLinks(ctx, allRequirements);
  }
}

/**
 * 計画書の成果物出力（レビュー版HTML / 提出用Word）。
 *
 * 設計上の役割分担:
 *   - レビュー版: 各節の状態・要件達成・根拠素材の注釈を併記した「点検用」の文書。
 *   - 提出用Word: 章節見出しと本文のみの「成果物」。注釈は載せない。
 *
 * ここは DOM に触れない純関数（描画は client.ts、テスト容易性のため分離）。
 * 実 API 連携や docx ライブラリ化に差し替える場合もこの入出力の責務を保つ。
 */

import { type Link, type Material, type Requirement, type Section } from "@/lib/schema";
import { STATUS_LABELS } from "@/lib/labels";
import { approvedMaterialIds, getRequirementProgress } from "@/lib/computed/sections";

export type ExportInput = {
  workspaceName: string;
  sections: Section[];
  requirements: Requirement[];
  materials: Material[];
  links: Link[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 本文を段落（空行区切り）に分け、段落内改行は <br> にする。 */
function bodyToParagraphs(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 提出用ファイル名の安全化（拡張子は呼び出し側で付与）。 */
export function safeFileBase(workspaceName: string): string {
  const base = workspaceName.trim().replace(/[\\/:*?"<>|\s]+/g, "_");
  return base.length > 0 ? base : "計画書";
}

// ===== レビュー版HTML（点検用・注釈付き） =====

export function renderReviewHtml(input: ExportInput): string {
  const { workspaceName, sections, requirements, materials, links } = input;
  const today = formatDate(new Date());

  const toc = sections
    .map((s) => {
      const indent = s.level >= 2 ? ' style="padding-left:1.2em"' : "";
      return `<li${indent}><a href="#${escapeHtml(s.id)}">${escapeHtml(`${s.number} ${s.title}`)}</a></li>`;
    })
    .join("\n");

  const body = sections.map((s) => renderReviewSection(s, requirements, materials, links)).join("\n");

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(workspaceName)}（レビュー版）</title>
<style>${REVIEW_STYLES}</style>
</head>
<body>
<main class="doc">
  <header class="doc-head">
    <p class="doc-kind">レビュー版（点検用・注釈付き）</p>
    <h1>${escapeHtml(workspaceName)}</h1>
    <p class="doc-meta">出力日: ${today}　／　全 ${sections.length} 節</p>
    <p class="doc-note">この版には各節の進捗・記載要件の達成状況・根拠素材を注釈として併記しています。提出物には含まれません。</p>
  </header>
  <nav class="toc">
    <h2>目次</h2>
    <ul>
${toc}
    </ul>
  </nav>
${body}
</main>
</body>
</html>`;
}

function renderReviewSection(
  section: Section,
  requirements: Requirement[],
  materials: Material[],
  links: Link[],
): string {
  const heading = section.level >= 2 ? "h3" : "h2";
  const progress = getRequirementProgress(section.id, requirements);
  const approvedIds = approvedMaterialIds(section.id, links);
  const groundedTitles = materials.filter((m) => approvedIds.has(m.id)).map((m) => m.title);

  const reqText =
    progress.total > 0
      ? `記載要件 ${progress.done}/${progress.total} 達成`
      : "記載要件なし";
  const materialText =
    groundedTitles.length > 0
      ? `根拠素材: ${groundedTitles.map(escapeHtml).join("、")}`
      : "根拠素材: なし";

  const annotation = `<aside class="annot">
    <span class="badge">${escapeHtml(STATUS_LABELS[section.status])}</span>
    <span>${escapeHtml(reqText)}</span>
    <span>${materialText}</span>
  </aside>`;

  const content = section.body.trim()
    ? bodyToParagraphs(section.body)
    : `<p class="empty">（本文未記入）</p>`;

  return `<section id="${escapeHtml(section.id)}" class="sec sec-l${section.level}">
  <${heading}>${escapeHtml(`${section.number} ${section.title}`)}</${heading}>
  ${annotation}
  ${content}
</section>`;
}

const REVIEW_STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #f7f5f1;
    color: #2a2620;
    font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif;
    line-height: 1.85;
  }
  .doc { max-width: 820px; margin: 0 auto; padding: 48px 32px 96px; }
  .doc-head { border-bottom: 3px solid #6b4e2e; padding-bottom: 16px; margin-bottom: 24px; }
  .doc-kind { color: #b26a00; font-weight: 700; letter-spacing: 0.08em; font-size: 0.8rem; margin: 0 0 4px; }
  .doc-head h1 { font-size: 1.8rem; margin: 0 0 8px; color: #6b4e2e; }
  .doc-meta { color: #8a8377; font-size: 0.85rem; margin: 0 0 8px; }
  .doc-note { background: #f0ebe1; border-left: 4px solid #c9b48f; padding: 8px 12px; font-size: 0.8rem; color: #6b4e2e; margin: 0; border-radius: 4px; }
  .toc { background: #fff; border: 1px solid #e3ddd2; border-radius: 8px; padding: 16px 24px; margin-bottom: 32px; }
  .toc h2 { font-size: 1rem; margin: 0 0 8px; color: #6b4e2e; }
  .toc ul { list-style: none; margin: 0; padding: 0; }
  .toc li { padding: 2px 0; font-size: 0.9rem; }
  .toc a { color: #2a2620; text-decoration: none; }
  .toc a:hover { color: #6b4e2e; text-decoration: underline; }
  .sec { margin-bottom: 28px; }
  .sec-l1 h2 { font-size: 1.35rem; color: #6b4e2e; border-bottom: 2px solid #e3ddd2; padding-bottom: 6px; margin: 32px 0 12px; }
  .sec-l2 h3 { font-size: 1.1rem; color: #2a2620; margin: 20px 0 8px; }
  .annot {
    display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center;
    background: #f0ebe1; border-radius: 6px; padding: 6px 12px; margin: 0 0 12px;
    font-size: 0.78rem; color: #8a8377;
  }
  .badge { background: #6b4e2e; color: #fff; border-radius: 999px; padding: 1px 10px; font-size: 0.72rem; font-weight: 700; }
  .sec p { margin: 0 0 10px; }
  .empty { color: #b26a00; font-style: italic; }
  @media print {
    body { background: #fff; }
    .doc { padding: 0; max-width: none; }
    .doc-note, .toc { break-inside: avoid; }
    .sec { break-inside: avoid-page; }
  }
`;

// ===== 提出用Word（成果物・本文のみ） =====
//
// 依存を増やさず確実に Word で開けるよう、Word 互換 HTML を生成して .doc として
// 保存する方式。将来 docx ライブラリで .docx 化する場合もこの関数の責務を保つ。

export function renderWordHtml(input: ExportInput): string {
  const { workspaceName, sections } = input;
  const today = formatDate(new Date());

  const body = sections
    .map((s) => {
      const tag = s.level >= 2 ? "h2" : "h1";
      const cls = s.level >= 2 ? "h-sec" : "h-chap";
      const content = s.body.trim() ? bodyToParagraphs(s.body) : "";
      return `<${tag} class="${cls}">${escapeHtml(`${s.number} ${s.title}`)}</${tag}>\n${content}`;
    })
    .join("\n");

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(workspaceName)}</title>
<style>${WORD_STYLES}</style>
</head>
<body>
<div class="title-block">
  <h1 class="doc-title">${escapeHtml(workspaceName)}</h1>
  <p class="doc-date">${today}</p>
</div>
${body}
</body>
</html>`;
}

const WORD_STYLES = `
  body { font-family: "MS Mincho", "Yu Mincho", serif; font-size: 10.5pt; line-height: 1.8; color: #000; }
  .title-block { text-align: center; margin-bottom: 36pt; }
  .doc-title { font-size: 18pt; margin: 0 0 12pt; }
  .doc-date { font-size: 10.5pt; margin: 0; }
  h1.h-chap { font-size: 14pt; margin: 18pt 0 8pt; border-bottom: 1pt solid #999; padding-bottom: 2pt; }
  h2.h-sec { font-size: 12pt; margin: 12pt 0 6pt; }
  p { margin: 0 0 8pt; text-indent: 1em; }
`;

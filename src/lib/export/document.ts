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
  // 表紙メタ（提出用Wordの表紙でのみ使用）。未指定なら既定値で出力する。
  coverStatus?: string;
  coverDate?: string;
  coverPublisher?: string;
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

// ===== 提出用Word（成果物・表紙＋本文） =====
//
// 依存を増やさず確実に Word で開けるよう、Word 互換 HTML を生成して .doc として
// 保存する方式。将来 docx ライブラリで .docx 化する場合もこの関数の責務を保つ。
//
// 体裁は「本文レイアウト設定」(熊本県菊陽町 報告書レイアウト案) に準拠する:
//   - A4縦 / 余白 上25・下27・左右25mm / ヘッダー18mm・フッター15mm
//   - フォント: 既定は MS明朝 / MSゴシック（レイアウトPDF準拠・Word標準）。WORD_FONT_TARGET
//     で基準を切替（"windows"=MS系優先 / "mac"=ヒラギノ優先。FONT_PRESETS 参照）
//   - 本文: 明朝 11pt・両端揃え・字下げ1字・行間 固定18pt
//   - 見出し番号: 章=「第1章」/ 節=「1」/ 項=「（1）」（レイアウト例の体系）
//   - 見出し1(章): 18pt MSゴシックBold 中央・緑網掛け（#6FA976 ベタ塗り・白抜き文字）
//   - 見出し2(節): 16pt MS Pゴシック 両端・下罫線3pt
//   - 見出し3(項): 12pt MS PゴシックBold 両端・下罫線1.5pt
//   - フッター: ページ番号 Century 中央（表紙はノンブルなし）
//   - メインカラー: 緑 #6FA976
// 表紙は本文と同じセクションの先頭に置き、タイトル＋「（案）」を中段、策定年月＋
// 発行者名を下段に中央配置する。表紙が単独1ページになるのは、表紙内容が1ページに
// 収まり、直後の第1章に必ず改ページ(page-break-before)が入るため（@page の
// セクション区切りには依存しない）。ノンブルは mso-first-footer で1ページ目だけ
// 空にして出さない。
// 注: 奇数/偶数別の柱（ヘッダー章名）、章ごとのノンブル「章-頁」、ルビは
//     Word 互換 HTML の限界で本実装では再現しない（true .docx 化の際に対応）。

const WORD_GREEN = "#6FA976";

// 表紙の既定表記。UI（左ペインの「表紙」欄）から ExportInput 経由で上書きされる。
// UI 未指定時のフォールバックとしてここを使う（年月は ○ を数字に置き換える前提）。
const COVER_STATUS_DEFAULT = "（案）";
const COVER_PUBLISHER_DEFAULT = "○○市";
const COVER_DATE_DEFAULT = "令和○年（202○）○月";

// 提出用Word の日本語フォント基準。ここを切り替えるだけで全フォント指定が変わる。
//   "windows"（既定）: MS明朝 / MSゴシック優先。レイアウト設定 PDF 準拠で、表紙(MS P明朝)
//                      とも書体が揃う。Mac 版 Word も Office 同梱の MS フォントを持つので
//                      Mac/Windows どちらで開いても同じ書体になる（＝既定はこちら）。
//   "mac":             ヒラギノ優先。Word を使わず Mac のプレビュー等で開く場合向け。
// mso-fareast-font-family は Word が日本語字形に使うフォントなので、開く環境に
// 実在するフォントを先頭に置くのが肝心（無いとゴシック等で代替表示される）。
type WordFontTarget = "mac" | "windows";
const WORD_FONT_TARGET: WordFontTarget = "windows";

// フォント名は Word が認識する「英語名」で指定する。半角MS＋漢字の "MS 明朝" 等は
// 登録名と一致せずゴシックで代替されるため使わない（MS明朝→"MS Mincho"、MS P明朝→
// "MS PMincho"、MSゴシック→"MS Gothic"、MS Pゴシック→"MS PGothic"）。
// Mac の日本語ゴシックは「ヒラギノ角ゴシック」。英語別名 "Hiragino Sans" は日本語版が
// 無い環境だと中国語版 "Hiragino Sans GB" に化けるため使わない。
const FONT_PRESETS = {
  mac: {
    mincho: { family: `"ヒラギノ明朝 ProN", "Hiragino Mincho ProN", "MS Mincho", serif`, fareast: `"ヒラギノ明朝 ProN"` },
    gothic: { family: `"ヒラギノ角ゴシック", "Hiragino Kaku Gothic ProN", "MS Gothic", sans-serif`, fareast: `"ヒラギノ角ゴシック"` },
    gothicP: { family: `"ヒラギノ角ゴシック", "Hiragino Kaku Gothic ProN", "MS PGothic", sans-serif`, fareast: `"ヒラギノ角ゴシック"` },
  },
  windows: {
    mincho: { family: `"MS Mincho", "ＭＳ 明朝", "ヒラギノ明朝 ProN", serif`, fareast: `"MS Mincho"` },
    gothic: { family: `"MS Gothic", "ＭＳ ゴシック", "ヒラギノ角ゴシック", sans-serif`, fareast: `"MS Gothic"` },
    gothicP: { family: `"MS PGothic", "ＭＳ Ｐゴシック", "ヒラギノ角ゴシック", sans-serif`, fareast: `"MS PGothic"` },
  },
} as const;

const FONT = FONT_PRESETS[WORD_FONT_TARGET];

// 表紙は OS を問わず MS P明朝（"MS PMincho"）Bold で固定。Word は Mac/Windows とも
// 同梱（実機の msmincho.ttc に "MS PMincho" を確認済み）。本文・見出しの基準（FONT）
// とは独立。Word 以外で開く場合に備え、ヒラギノ明朝 ProN をフォールバックに付ける。
const COVER_FONT_FAMILY = `"MS PMincho", "ＭＳ Ｐ明朝", "ヒラギノ明朝 ProN", serif`;
const COVER_FONT_FAREAST = `"MS PMincho"`;

/** 本文を段落（空行区切り）に分け、標準スタイルの段落にする。 */
function bodyToWordParagraphs(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  return trimmed
    .split(/\n{2,}/)
    .map((p) => `<p class="BodyText">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

/** 節の level を見出しクラス（章/節/項）に対応づける。 */
function headingClass(level: number): string {
  if (level <= 1) return "ChapterHeading";
  if (level === 2) return "SectionHeading";
  return "ItemHeading";
}

/**
 * 見出しの番号表記をレイアウト例の体系に整える。
 *   章(level1): 第1章   節(level2): 1   項(level3+): （1）
 * データの number は章="1"・節="1.1" 形式なので、節以下は末尾の枝番だけ使う。
 */
function formatHeadingLabel(level: number, number: string, title: string): string {
  const tail = number.includes(".") ? number.slice(number.lastIndexOf(".") + 1) : number;
  if (level <= 1) return `第${number}章　${title}`;
  if (level === 2) return `${tail}　${title}`;
  return `（${tail}）${title}`;
}

/**
 * 目次用の見出し表記。章=「第1章 …」/ 節=「第1節 …」/ 項=「（1）…」。
 * （本文見出しは節を「1」と出すが、目次は読みやすさ優先で「第1節」と綴る。）
 */
function formatTocLabel(level: number, number: string, title: string): string {
  const tail = number.includes(".") ? number.slice(number.lastIndexOf(".") + 1) : number;
  if (level <= 1) return `第${number}章　${title}`;
  if (level === 2) return `第${tail}節　${title}`;
  return `（${tail}）${title}`;
}

/**
 * 目次ページ（表紙の次・第1章の前）。章はノンブルなし・節は右ぞろえドットリーダー＋
 * 手入力ノンブル（pageRef）・項はインデントのみ。ノンブルは空なら点線だけ伸びる。
 */
function renderToc(workspaceName: string, status: string, sections: Section[]): string {
  const heading = `目　次${status}`;
  const rows = sections
    .map((s) => {
      const label = formatTocLabel(s.level, s.number, s.title);
      if (s.level <= 1) {
        return `<p class="TocChapter">${escapeHtml(label)}</p>`;
      }
      if (s.level === 2) {
        const ref = (s.pageRef ?? "").trim();
        return `<p class="TocSection">${escapeHtml(label)}<span style="mso-tab-count:1"></span>${escapeHtml(ref)}</p>`;
      }
      return `<p class="TocItem">${escapeHtml(label)}</p>`;
    })
    .join("\n");

  return `<p class="TocPlanName">${escapeHtml(workspaceName)}</p>
<p class="TocTitle">${escapeHtml(heading)}</p>
${rows}`;
}

export function renderWordHtml(input: ExportInput): string {
  const { workspaceName, sections } = input;

  // 表紙メタは UI（ExportInput）優先、未指定なら既定値。空文字の項目は段落ごと省く。
  const coverStatus = (input.coverStatus ?? COVER_STATUS_DEFAULT).trim();
  const coverDate = (input.coverDate ?? COVER_DATE_DEFAULT).trim();
  const coverPublisher = (input.coverPublisher ?? COVER_PUBLISHER_DEFAULT).trim();

  // 表紙は本文と同じセクション内の先頭に置く。表紙が単独ページになるのは、表紙の
  // 内容が1ページに収まる高さで、かつ直後の第1章に必ず改ページ（page-break-before）
  // が入るため。@page のセクション区切りに依存しないので、ビューアを問わず確実。
  const cover = [
    `<p class="CoverSpacerTop">&nbsp;</p>`,
    `<p class="CoverTitle">${escapeHtml(workspaceName)}</p>`,
    coverStatus ? `<p class="CoverStatus">${escapeHtml(coverStatus)}</p>` : "",
    `<p class="CoverSpacerMid">&nbsp;</p>`,
    coverDate ? `<p class="CoverDate">${escapeHtml(coverDate)}</p>` : "",
    coverPublisher ? `<p class="CoverPublisher">${escapeHtml(coverPublisher)}</p>` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // 目次は表紙の次ページ（TocPlanName に page-break-before）。本文の第1章も改ページ
  // するので、表紙→目次→第1章の順に各ページ先頭から始まる。
  const toc = renderToc(workspaceName, coverStatus, sections);

  // 章見出しは常に改ページする（ChapterHeading に page-break-before:always）。
  // 第1章も同じで、表紙の次ページ先頭から始まる。
  const body = sections
    .map((s) => {
      const cls = headingClass(s.level);
      const label = formatHeadingLabel(s.level, s.number, s.title);
      const heading = `<p class="${cls}">${escapeHtml(label)}</p>`;
      const content = s.body.trim() ? bodyToWordParagraphs(s.body) : "";
      return content ? `${heading}\n${content}` : heading;
    })
    .join("\n");

  // ノンブルは1ページ目（表紙）だけ空フッター(ff1)にして出さない。2ページ目以降は
  // f1（PAGE フィールド）。@page の mso-first-footer で「最初のページのみ別指定」。
  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(workspaceName)}</title>
<style>${WORD_STYLES}</style>
</head>
<body lang="JA">
<div class="WordSection1">
${cover}
${toc}
${body}
<div style="mso-element:footer" id="ff1">
<p class="MsoFooter">&nbsp;</p>
</div>
<div style="mso-element:footer" id="f1">
<p class="MsoFooter" style="text-align:center"><span style="mso-field-code:&quot; PAGE &quot;"></span></p>
</div>
</div>
</body>
</html>`;
}

const WORD_STYLES = `
  @page WordSection1 {
    size: 210.0mm 297.0mm;
    margin: 25.0mm 25.0mm 27.0mm 25.0mm;
    mso-header-margin: 18.0mm;
    mso-footer-margin: 15.0mm;
    mso-footer: f1;
    mso-first-footer: ff1;
    mso-title-page: yes;
    mso-paper-source: 0;
  }
  div.WordSection1 { page: WordSection1; }
  body {
    font-family: ${FONT.mincho.family};
    mso-fareast-font-family: ${FONT.mincho.fareast};
    font-size: 11pt;
    color: #000;
    line-height: 18pt;
    mso-line-height-rule: exactly;
  }
  p {
    margin: 0;
    line-height: 18pt;
    mso-line-height-rule: exactly;
  }
  p.BodyText {
    font-family: ${FONT.mincho.family};
    mso-fareast-font-family: ${FONT.mincho.fareast};
    font-size: 11pt;
    text-align: justify;
    text-indent: 1em;
    margin: 0;
  }
  p.ChapterHeading {
    font-family: ${FONT.gothic.family};
    mso-fareast-font-family: ${FONT.gothic.fareast};
    font-size: 18pt;
    font-weight: bold;
    text-align: center;
    color: #fff;
    background: ${WORD_GREEN};
    mso-shading: ${WORD_GREEN};
    padding: 6pt 0;
    margin: 0 0 12pt 0;
    line-height: normal;
    page-break-before: always;
    mso-break-type: page-break;
  }
  p.SectionHeading {
    font-family: ${FONT.gothicP.family};
    mso-fareast-font-family: ${FONT.gothicP.fareast};
    font-size: 16pt;
    text-align: justify;
    color: #1a1a1a;
    border-bottom: 3pt solid ${WORD_GREEN};
    padding-bottom: 2pt;
    margin: 16pt 0 8pt 0;
    line-height: normal;
  }
  p.ItemHeading {
    font-family: ${FONT.gothicP.family};
    mso-fareast-font-family: ${FONT.gothicP.fareast};
    font-size: 12pt;
    font-weight: bold;
    text-align: justify;
    color: #1a1a1a;
    border-bottom: 1.5pt solid ${WORD_GREEN};
    padding-bottom: 1pt;
    margin: 12pt 0 6pt 0;
    line-height: normal;
  }
  p.CoverSpacerTop {
    margin: 0;
    font-size: 1pt;
    line-height: 60mm;
    mso-line-height-rule: exactly;
  }
  p.CoverSpacerMid {
    margin: 0;
    font-size: 1pt;
    line-height: 110mm;
    mso-line-height-rule: exactly;
  }
  p.CoverTitle {
    font-family: ${COVER_FONT_FAMILY};
    mso-fareast-font-family: ${COVER_FONT_FAREAST};
    font-size: 28pt;
    font-weight: bold;
    text-align: center;
    color: #000;
    margin: 0;
    line-height: normal;
  }
  p.CoverStatus {
    font-family: ${COVER_FONT_FAMILY};
    mso-fareast-font-family: ${COVER_FONT_FAREAST};
    font-size: 24pt;
    font-weight: bold;
    text-align: center;
    color: #000;
    margin: 10pt 0 0 0;
    line-height: normal;
  }
  p.CoverDate {
    font-family: ${COVER_FONT_FAMILY};
    mso-fareast-font-family: ${COVER_FONT_FAREAST};
    font-size: 18pt;
    font-weight: bold;
    text-align: center;
    color: #000;
    margin: 0;
    line-height: normal;
  }
  p.CoverPublisher {
    font-family: ${COVER_FONT_FAMILY};
    mso-fareast-font-family: ${COVER_FONT_FAREAST};
    font-size: 18pt;
    font-weight: bold;
    text-align: center;
    color: #000;
    margin: 10pt 0 0 0;
    line-height: normal;
  }
  p.TocPlanName {
    font-family: ${FONT.gothic.family};
    mso-fareast-font-family: ${FONT.gothic.fareast};
    font-size: 14pt;
    text-align: center;
    color: #1a1a1a;
    margin: 0 0 6pt 0;
    line-height: normal;
    page-break-before: always;
    mso-break-type: page-break;
  }
  p.TocTitle {
    font-family: ${FONT.gothic.family};
    mso-fareast-font-family: ${FONT.gothic.fareast};
    font-size: 18pt;
    font-weight: bold;
    letter-spacing: 0.3em;
    text-align: center;
    color: #1a1a1a;
    margin: 0 0 18pt 0;
    line-height: normal;
  }
  p.TocChapter {
    font-family: ${FONT.gothic.family};
    mso-fareast-font-family: ${FONT.gothic.fareast};
    font-size: 12pt;
    font-weight: bold;
    color: #1a1a1a;
    margin: 10pt 0 4pt 0;
    line-height: normal;
  }
  p.TocSection {
    font-family: ${FONT.mincho.family};
    mso-fareast-font-family: ${FONT.mincho.fareast};
    font-size: 11pt;
    color: #000;
    margin: 2pt 0 2pt 1em;
    line-height: normal;
    mso-tab-stops: right dotted 155.0mm;
  }
  p.TocItem {
    font-family: ${FONT.mincho.family};
    mso-fareast-font-family: ${FONT.mincho.fareast};
    font-size: 10.5pt;
    color: #000;
    margin: 1pt 0 1pt 2em;
    line-height: normal;
  }
  p.MsoFooter {
    font-family: Century, serif;
    font-size: 10.5pt;
    text-align: center;
    margin: 0;
  }
`;

/**
 * 成果物出力のブラウザ側ヘルパー（DOM 副作用はここに閉じる）。
 * 文字列生成は document.ts（純関数）に分離している。
 */

import {
  renderReviewHtml,
  renderWordHtml,
  safeFileBase,
  type ExportInput,
} from "@/lib/export/document";

/** レビュー版HTML を新規タブで開く（印刷でPDF化できる）。 */
export function openReviewPreview(input: ExportInput): void {
  const html = renderReviewHtml(input);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    // ポップアップがブロックされた場合はダウンロードにフォールバック
    triggerDownload(url, `${safeFileBase(input.workspaceName)}_レビュー版.html`, false);
  }
  // Blob URL はタブが読み込んだ後に解放する
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** 提出用Word（Word 互換HTML）を .doc としてダウンロードする。 */
export function downloadWord(input: ExportInput): void {
  const html = renderWordHtml(input);
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${safeFileBase(input.workspaceName)}.doc`, true);
}

function triggerDownload(url: string, filename: string, revoke: boolean): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (revoke) window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * 词汇表 PDF 生成工具 —— 简单三列表格
 *
 * 布局：
 * - 标题「Vocabulary」左上角
 * - 3 列表格：黑色网格线
 * - 列顺序固定：序号 | WORD(英文已填) | MEANING(中文已填) | CHECK(空白)
 * - 每页 25 行
 */

export interface PrintWord {
  word: string;
  chinese: string;
  level?: string;
}

// ═══════════════════════════════
// 布局常量
// ═══════════════════════════════

const ROWS_PER_PAGE = 25;

export function getWordsPerPage(): number {
  return ROWS_PER_PAGE;
}

// ═══════════════════════════════
// 辅助
// ═══════════════════════════════

function escapeHtml(s: string): string {
  const m: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return s.replace(/[&<>"']/g, (c) => m[c] || c);
}

// ═══════════════════════════════
// CSS 样式
// ═══════════════════════════════

const STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }

.paper {
  width: 210mm;
  min-height: 297mm;
  background: #FFFFFF;
  padding: 12mm 12mm 10mm 12mm;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  color: #000;
}

.paper-title {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 6mm;
}

/* ── 表格：黑色网格线 ── */
.word-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.word-table thead th {
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  padding: 3mm 2mm;
  border: 1px solid #000;
  background: #FFF;
}

.word-table tbody td {
  text-align: center;
  vertical-align: middle;
  padding: 2mm 2mm;
  height: 8.5mm;
  border: 1px solid #000;
  font-size: 11px;
  word-break: break-word;
}

/* 列宽 */
.col-no   { width: 10%; }
.col-a    { width: 30%; }
.col-b    { width: 30%; }
.col-check { width: 30%; }
`;

// ═══════════════════════════════
// 渲染
// ═══════════════════════════════

/** 渲染一页 */
function renderPage(
  words: PrintWord[],
  startIndex: number
): string {
  let rowsHtml = "";
  for (let r = 0; r < ROWS_PER_PAGE; r++) {
    const wi = startIndex + r;
    const word: PrintWord | null = wi < words.length ? words[wi] : null;

    const num = word ? wi + 1 : "";
    const wordCol = word ? escapeHtml(word.word) : "";
    const meaningCol = word ? escapeHtml(word.chinese) : "";

    rowsHtml += `
      <tr>
        <td class="col-no">${num}</td>
        <td class="col-a">${wordCol}</td>
        <td class="col-b">${meaningCol}</td>
        <td class="col-check"></td>
      </tr>`;
  }

  return `
    <div class="paper">
      <div class="paper-title">Vocabulary</div>
      <table class="word-table">
        <colgroup>
          <col class="col-no" />
          <col class="col-a" />
          <col class="col-b" />
          <col class="col-check" />
        </colgroup>
        <thead>
          <tr>
            <th>序号</th>
            <th>WORD</th>
            <th>MEANING</th>
            <th>CHECK</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
}

// ═══════════════════════════════
// 公开 API
// ═══════════════════════════════

/**
 * 生成纯内容 HTML（供 PdfPreviewModal 使用）
 */
export function generatePrintHtml(words: PrintWord[]): string {
  if (words.length === 0) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;}</style></head><body><div style="color:#888;font-size:14px;">未选择单词</div></body></html>`;
  }

  let pages = "";
  for (let i = 0; i < words.length; i += ROWS_PER_PAGE) {
    pages += renderPage(words, i);
  }

  // 完整 HTML 文档（用于 iframe srcdoc，CSS 完全隔离）
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${STYLES}</style>
</head>
<body style="margin:0;padding:0;display:flex;flex-direction:column;align-items:center;gap:12px;padding:12px 0;background:#e8e5df;">
  ${pages}
</body>
</html>`;
}

/**
 * 获取总页数
 */
export function getTotalPages(wordCount: number): number {
  return Math.ceil(wordCount / ROWS_PER_PAGE);
}

/**
 * 词汇默写纸生成工具 v5 — 参考图风格
 *
 * 布局：
 * - 标题「Vocabulary」左上角
 * - 4 列表格：黑色网格线（每个格子四边边框）
 * - 列顺序根据方向动态切换
 *   · 英→中 (en2cn): 序号 | WORD(英文已填) | MEANING(空白) | CHECK
 *   · 中→英 (cn2en): 序号 | MEANING(中文已填) | WORD(空白/首字母) | CHECK
 * - 每页 20 行
 * - 无 DATE、副标题、页脚
 * - CHECK 列 ★★★★★
 * - 首字母提示：中→英时 WORD 空白格显示英文首字母
 */

export type PrintFormat = "cn2en" | "en2cn";

export interface PrintWord {
  word: string;
  chinese: string;
  level?: string;
}

export interface PrintOptions {
  showFirstLetter?: boolean;
}

// ═══════════════════════════════
// 布局常量
// ═══════════════════════════════

const ROWS_PER_PAGE = 20;

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

/** 生成首字母提示如 "a_ _ _ _" */
function firstLetterHint(word: string): string {
  if (!word) return "";
  return word.charAt(0) + "_".repeat(Math.max(0, word.length - 1));
}

// ═══════════════════════════════
// 表头映射（顺序随方向变化）
// ═══════════════════════════════

/**
 * cn2en (中→英): 看中文写英文
 *   → 序号 | MEANING | WORD | CHECK
 *
 * en2cn (英→中): 看英文写中文
 *   → 序号 | WORD | MEANING | CHECK
 */
const HEADERS: Record<PrintFormat, [string, string, string, string]> = {
  cn2en: ["序号", "MEANING", "WORD", "CHECK"],
  en2cn: ["序号", "WORD", "MEANING", "CHECK"],
};

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
  height: 11.2mm;
  border: 1px solid #000;
  font-size: 11px;
  word-break: break-word;
}

/* 列宽 */
.col-no   { width: 10%; }
.col-a    { width: 30%; }
.col-b    { width: 30%; }
.col-check { width: 30%; }

/* 首字母提示 */
.letter-hint {
  color: #888;
  font-size: 10px;
}
`;

// ═══════════════════════════════
// 渲染
// ═══════════════════════════════

/** 渲染一页 */
function renderPage(
  words: PrintWord[],
  startIndex: number,
  format: PrintFormat,
  showHint: boolean
): string {
  const headers = HEADERS[format];

  let rowsHtml = "";
  for (let r = 0; r < ROWS_PER_PAGE; r++) {
    const wi = startIndex + r;
    const word: PrintWord | null = wi < words.length ? words[wi] : null;

    const num = word ? wi + 1 : "";

    // colA / colB 内容根据方向决定
    let colAContent = "";
    let colBContent = "";

    if (word) {
      if (format === "cn2en") {
        // 中→英: colA=MEANING(中文), colB=WORD(空白/首字母)
        colAContent = escapeHtml(word.chinese);
        colBContent = showHint
          ? `<span class="letter-hint">${escapeHtml(firstLetterHint(word.word))}</span>`
          : "";
      } else {
        // 英→中: colA=WORD(英文), colB=MEANING(空白)
        colAContent = escapeHtml(word.word);
        colBContent = "";
      }
    }

    rowsHtml += `
      <tr>
        <td class="col-no">${num}</td>
        <td class="col-a">${colAContent}</td>
        <td class="col-b">${colBContent}</td>
        <td class="col-check">${word ? "★★★★★" : ""}</td>
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
            <th>${headers[0]}</th>
            <th>${headers[1]}</th>
            <th>${headers[2]}</th>
            <th>${headers[3]}</th>
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
export function generatePrintHtml(
  words: PrintWord[],
  format: PrintFormat,
  options: PrintOptions = {}
): string {
  if (words.length === 0) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;}</style></head><body><div style="color:#888;font-size:14px;">未选择单词</div></body></html>`;
  }

  let pages = "";
  for (let i = 0; i < words.length; i += ROWS_PER_PAGE) {
    pages += renderPage(words, i, format, !!options.showFirstLetter);
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

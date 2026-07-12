/**
 * 词汇默写纸生成工具 v4 — 4 列表格排版
 *
 * 布局：
 * - 标题「单词默写纸」+ DATE 日期行
 * - 4 列表格：NO. | WORD | MEANING | CHECK
 * - 每页 20 行（20 词/页）
 * - CHECK 列固定 ★★★★★ 供学生自评
 * - 配色：背景 #EFECE6，线条 #312F2C（网站设计系统）
 *
 * generatePrintHtml() 返回纯内容 HTML（无 toolbar/script），
 * 由 PdfPreviewModal 组件负责预览+下载交互。
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

const FORMAT_LABEL: Record<PrintFormat, string> = {
  cn2en: "中→英",
  en2cn: "英→中",
};

export function getWordsPerPage(): number {
  return ROWS_PER_PAGE;
}

// ═══════════════════════════════
// 辅助
// ═══════════════════════════════

function escapeHtml(s: string): string {
  const m: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return s.replace(/[&<>"']/g, (c) => m[c] || c);
}

function hint(word: string): string {
  if (!word) return "";
  return word.charAt(0) + "_".repeat(Math.max(0, word.length - 1));
}

// ═══════════════════════════════
// CSS 样式
// ═══════════════════════════════

const STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }

.paper {
  width: 210mm;
  min-height: 297mm;
  background: #EFECE6;
  padding: 14mm 7mm 12mm 7mm;
  font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif;
  color: #312F2C;
  position: relative;
  outline: 3px dashed red;
}

/* ── 标题 ── */
.paper-title {
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 3px;
  margin-bottom: 3mm;
}

.paper-date {
  text-align: center;
  font-size: 10px;
  margin-bottom: 2mm;
  color: #5C5650;
}

.paper-subtitle {
  text-align: center;
  font-size: 9px;
  color: #8B817A;
  margin-bottom: 2mm;
}

.title-line {
  border: none;
  border-top: 1.2px solid #312F2C;
  margin-bottom: 4mm;
}

/* ── 表格 ── */
.word-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.word-table thead th {
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  padding: 2.5mm 2mm;
  border-top: 1.5px solid #312F2C;
  border-bottom: 1.5px solid #312F2C;
}

.word-table tbody td {
  text-align: center;
  vertical-align: middle;
  padding: 1.5mm 2mm;
  height: 10.5mm;
  border-bottom: 0.5px solid #C4BFB8;
  font-size: 10px;
  word-break: break-word;
}

/* 列宽 */
.col-no { width: 8%; }
.col-word { width: 25%; }
.col-meaning { width: 30%; }
.col-check { width: 37%; }

/* 列内文字（需高于 .word-table tbody td 的权重） */
.word-table td.col-word { font-size: 8px; }
.word-table td.col-check { font-size: 9px; letter-spacing: 0.5px; }

/* 首字母提示 */
.meaning-hint {
  color: #B5AFA9;
  font-size: 9px;
}

/* ── MEANING 书写横线 ── */
.write-line {
  display: block;
  width: 100%;
  height: 2px;
  background: #312F2C;
  margin-top: 1.5mm;
}

/* ── 页脚 ── */
.paper-footer {
  position: absolute;
  bottom: 8mm;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 8px;
  color: #B5AFA9;
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
  showHint: boolean,
  pageNum: number,
  totalPages: number
): string {
  let rowsHtml = "";
  for (let r = 0; r < ROWS_PER_PAGE; r++) {
    const wi = startIndex + r;
    const word: PrintWord | null = wi < words.length ? words[wi] : null;

    const num = word ? wi + 1 : "";
    const promptText = word
      ? format === "cn2en"
        ? word.chinese
        : word.word
      : "";

    let meaningContent = "";
    if (word && format === "cn2en" && showHint) {
      meaningContent = `<span class="meaning-hint">${escapeHtml(hint(word.word))}</span>`;
    }
    if (word) {
      meaningContent += '<div class="write-line"></div>';
    }

    rowsHtml += `
      <tr>
        <td class="col-no">${num}</td>
        <td class="col-word">${escapeHtml(promptText)}</td>
        <td class="col-meaning">${meaningContent}</td>
        <td class="col-check">${word ? "★★★★★" : ""}</td>
      </tr>`;
  }

  return `
    <div class="paper">
      <div class="paper-title">单 词 默 写 纸</div>
      <div class="paper-date">DATE: ____ / ____ / ____</div>
      <div class="paper-subtitle">${FORMAT_LABEL[format]}默写 · 共 ${words.length} 词</div>
      <hr class="title-line" />
      <table class="word-table">
        <colgroup>
          <col class="col-no" />
          <col class="col-word" />
          <col class="col-meaning" />
          <col class="col-check" />
        </colgroup>
        <thead>
          <tr>
            <th>NO.</th>
            <th>WORD</th>
            <th>MEANING</th>
            <th>CHECK</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="paper-footer">第 ${pageNum} / ${totalPages} 页</div>
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
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;}</style></head><body><div style="text-align:center;padding:60px;color:#8B817A;font-size:14px;">未选择单词</div></body></html>`;
  }

  const totalPages = Math.ceil(words.length / ROWS_PER_PAGE);

  let pages = "";
  for (let i = 0; i < words.length; i += ROWS_PER_PAGE) {
    pages += renderPage(
      words,
      i,
      format,
      !!options.showFirstLetter,
      Math.floor(i / ROWS_PER_PAGE) + 1,
      totalPages
    );
  }

  // 返回完整 HTML 文档（用于 iframe srcdoc，完全 CSS 隔离）
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${STYLES}</style>
  <style>
    /* === PDF打印补丁 v2 — 覆盖 STYLES 中的默认值 === */
    .paper {
      outline: 3px dashed red;
    }
    .word-table td.col-word {
      font-size: 8px;
    }
    .write-line {
      display: block;
      width: 100%;
      height: 2px;
      background: #312F2C;
      margin-top: 1.5mm;
    }
  </style>
</head>
<body style="margin:0;padding:0;display:flex;flex-direction:column;align-items:center;gap:16px;padding:16px 0;background:#e8e5df;">
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

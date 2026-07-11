/**
 * 词汇打印工具 v2 — 生成单词默写纸 HTML 并触发浏览器打印
 *
 * 支持两种翻译方向：
 * - cn2en: 中译英默写（看中文写英文）
 * - en2cn: 英译中默写（看英文写中文）
 *
 * 支持两种书写线样式：
 * - regular: 标准横线，4栏紧凑，约40词/A4页
 * - four-line-three-grid: 四线三格英语书写练习，2栏，约24词/A4页
 *
 * 干净布局，无页眉页脚，适合直接打印默写用。
 */

export type PrintFormat = "cn2en" | "en2cn";
export type LineStyle = "regular" | "four-line-three-grid";

export interface PrintWord {
  word: string;
  chinese: string;
  level?: string;
}

export interface PrintOptions {
  /** 是否显示首字母提示（仅 cn2en 有效） */
  showFirstLetter?: boolean;
}

// ══════════════════════════════════════
// 布局常量
// ══════════════════════════════════════

/** 标准横线：4栏，每栏约10行 = 40词/页 */
const REGULAR_COLUMNS = 4;
const REGULAR_PER_PAGE = 40;

/** 四线三格：2栏，每栏约12行 = 24词/页 */
const GRID_COLUMNS = 2;
const GRID_PER_PAGE = 24;

// ══════════════════════════════════════
// CSS 样式
// ══════════════════════════════════════

const PRINT_CSS = `
  @page {
    size: A4;
    margin: 10mm 10mm 10mm 10mm;
  }

  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-break {
      page-break-before: always;
    }
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Noto Sans SC", sans-serif;
    color: #312F2C;
    line-height: 1.3;
    font-size: 11px;
  }

  /* ── 通用词网格 ── */
  .word-grid {
    column-gap: 6mm;
    width: 100%;
  }

  .word-grid.cols-4 {
    column-count: 4;
  }

  .word-grid.cols-2 {
    column-count: 2;
    column-gap: 8mm;
  }

  /* ── 词项卡片 ── */
  .word-item {
    break-inside: avoid;
    margin-bottom: 2.5mm;
    display: flex;
    align-items: flex-start;
    gap: 1.5mm;
  }

  .word-item .item-num {
    font-size: 8px;
    color: #999;
    min-width: 10mm;
    text-align: right;
    padding-top: 0.5mm;
    flex-shrink: 0;
  }

  .word-item .item-body {
    flex: 1;
    min-width: 0;
  }

  .word-item .item-prompt {
    font-size: 11px;
    line-height: 1.4;
    margin-bottom: 1mm;
    word-break: break-all;
    overflow-wrap: break-word;
  }

  .word-item .item-prompt.bold {
    font-weight: 700;
  }

  /* ── 标准横线样式 ── */
  .writing-line {
    border-bottom: 1px solid #312F2C;
    height: 8mm;
    position: relative;
    display: flex;
    align-items: flex-end;
  }

  .writing-line .first-letter-hint {
    color: #aaa;
    font-size: 10px;
    font-weight: 400;
    padding-bottom: 1mm;
    padding-left: 0.5mm;
  }

  /* ── 四线三格样式 ── */
  .four-line-grid {
    height: 14mm;
    position: relative;
    margin-top: 1mm;
  }

  /* 第1线（顶线）- 实线 */
  .four-line-grid .line-top {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 0;
    border-top: 1px solid #312F2C;
  }

  /* 第2线（腰线）- 虚线 */
  .four-line-grid .line-waist {
    position: absolute;
    top: 33%;
    left: 0;
    right: 0;
    height: 0;
    border-top: 1px dashed #999;
  }

  /* 第3线（基线）- 实线 */
  .four-line-grid .line-base {
    position: absolute;
    top: 62%;
    left: 0;
    right: 0;
    height: 0;
    border-top: 1px solid #312F2C;
  }

  /* 第4线（底线）- 实线 */
  .four-line-grid .line-bottom {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 0;
    border-top: 1px solid #312F2C;
  }

  /* 四线三格的首字母提示 */
  .four-line-grid .first-letter-hint {
    position: absolute;
    top: 62%;
    left: 0.5mm;
    color: #aaa;
    font-size: 10px;
    font-weight: 400;
    line-height: 1;
  }

  /* ── 分页标记 ── */
  @media screen {
    .page-break {
      border-top: 2px dashed #ccc;
      margin: 5mm 0;
    }
  }
`;

// ══════════════════════════════════════
// 辅助函数
// ══════════════════════════════════════

function getFirstLetterHint(word: string): string {
  if (!word) return "";
  return word.charAt(0) + "_".repeat(Math.max(0, word.length - 1));
}

function escapeHtml(str: string): string {
  const chars: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return str.replace(/[&<>"']/g, (ch) => chars[ch] || ch);
}

/** 渲染一个词项（标准横线） */
function renderRegularItem(
  index: number,
  word: PrintWord,
  format: PrintFormat,
  showFirstLetter: boolean
): string {
  const promptText = format === "cn2en" ? word.chinese : word.word;
  const promptBold = format === "en2cn";

  let writingLine: string;
  if (format === "cn2en" && showFirstLetter) {
    const hint = escapeHtml(getFirstLetterHint(word.word));
    writingLine = `<div class="writing-line"><span class="first-letter-hint">${hint}</span></div>`;
  } else {
    writingLine = `<div class="writing-line"></div>`;
  }

  return `
    <div class="word-item">
      <span class="item-num">${index}</span>
      <div class="item-body">
        <div class="item-prompt${promptBold ? " bold" : ""}">${escapeHtml(promptText)}</div>
        ${writingLine}
      </div>
    </div>`;
}

/** 渲染一个词项（四线三格） */
function renderGridItem(
  index: number,
  word: PrintWord,
  format: PrintFormat,
  showFirstLetter: boolean
): string {
  const promptText = format === "cn2en" ? word.chinese : word.word;
  const promptBold = format === "en2cn";

  let hintHtml = "";
  if (format === "cn2en" && showFirstLetter) {
    hintHtml = `<span class="first-letter-hint">${escapeHtml(getFirstLetterHint(word.word))}</span>`;
  }

  return `
    <div class="word-item">
      <span class="item-num">${index}</span>
      <div class="item-body">
        <div class="item-prompt${promptBold ? " bold" : ""}">${escapeHtml(promptText)}</div>
        <div class="four-line-grid">
          <div class="line-top"></div>
          <div class="line-waist"></div>
          <div class="line-base"></div>
          <div class="line-bottom"></div>
          ${hintHtml}
        </div>
      </div>
    </div>`;
}

/** 渲染完整的词网格（含分页） */
function renderWordGrid(
  words: PrintWord[],
  format: PrintFormat,
  lineStyle: LineStyle,
  showFirstLetter: boolean
): string {
  if (words.length === 0) return "";

  const columns = lineStyle === "regular" ? REGULAR_COLUMNS : GRID_COLUMNS;
  const perPage = lineStyle === "regular" ? REGULAR_PER_PAGE : GRID_PER_PAGE;
  const colClass = lineStyle === "regular" ? "cols-4" : "cols-2";

  const renderFn = lineStyle === "regular" ? renderRegularItem : renderGridItem;

  let html = "";
  let wordIndex = 0;

  while (wordIndex < words.length) {
    if (wordIndex > 0) {
      html += '<div class="page-break"></div>\n';
    }

    html += `<div class="word-grid ${colClass}">\n`;

    const pageEnd = Math.min(wordIndex + perPage, words.length);
    for (let i = wordIndex; i < pageEnd; i++) {
      html += renderFn(i + 1, words[i], format, showFirstLetter);
    }

    html += "</div>\n";
    wordIndex = pageEnd;
  }

  return html;
}

// ══════════════════════════════════════
// 主入口
// ══════════════════════════════════════

/**
 * 生成完整的打印 HTML 文档
 */
export function generatePrintHtml(
  words: PrintWord[],
  format: PrintFormat,
  lineStyle: LineStyle,
  options: PrintOptions = {}
): string {
  const title = "英语单词默写纸";
  const bodyHtml = renderWordGrid(words, format, lineStyle, !!options.showFirstLetter);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  ${bodyHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;
}

/**
 * 打开新窗口并触发打印
 */
export function printVocab(
  words: PrintWord[],
  format: PrintFormat,
  lineStyle: LineStyle,
  options: PrintOptions = {}
): void {
  if (words.length === 0) return;

  const html = generatePrintHtml(words, format, lineStyle, options);
  const printWindow = window.open("", "_blank", "width=900,height=700");

  if (!printWindow) {
    alert("弹窗被浏览器拦截，请允许本站弹窗后重试");
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onafterprint = function () {
    printWindow.close();
  };
}

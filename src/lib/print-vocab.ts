/**
 * 词汇打印工具 — 生成单词默写纸 HTML 并触发浏览器打印
 *
 * 支持两种翻译方向：
 * - cn2en: 中译英默写（看中文写英文）
 * - en2cn: 英译中默写（看英文写中文）
 * 每种方向可选「两栏紧凑」模式节省纸张
 */

export type PrintFormat = "cn2en" | "en2cn";

export interface PrintOptions {
  /** 是否显示首字母提示（仅 cn2en 有效） */
  showFirstLetter?: boolean;
  /** 是否按等级分组 */
  groupByLevel?: boolean;
  /** 两栏紧凑模式 */
  compact?: boolean;
  /** 自定义标题 */
  title?: string;
}

interface WordEntry {
  word: string;
  chinese: string;
  level: string;
}

// ══════════════════════════════════════
// CSS 样式（内联，保证打印窗口独立可用）
// ══════════════════════════════════════

const PRINT_CSS = `
  @page {
    size: A4;
    margin: 12mm 15mm 15mm 15mm;
  }

  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Noto Sans SC", sans-serif;
    color: #1a1a1a;
    line-height: 1.4;
  }

  .print-header {
    text-align: center;
    margin-bottom: 6mm;
  }

  .print-header h1 {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 2px;
    margin-bottom: 3mm;
  }

  .print-header .meta {
    display: flex;
    justify-content: center;
    gap: 10mm;
    font-size: 12px;
    color: #555;
  }

  .print-header .meta span {
    display: inline-flex;
    align-items: center;
    gap: 1mm;
  }

  .print-header .meta .blank {
    display: inline-block;
    width: 40mm;
    border-bottom: 1px solid #333;
  }

  /* ── 单栏表格 ── */
  .table-wrapper {
    width: 100%;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  thead {
    display: table-header-group;
  }

  thead th {
    background: #f0f0f0;
    font-size: 12px;
    font-weight: 600;
    padding: 4mm 1mm;
    border: 1px solid #666;
    text-align: center;
    color: #333;
  }

  tbody td {
    border: 1px solid #bbb;
    padding: 2.5mm 1.5mm;
    font-size: 13px;
    vertical-align: middle;
  }

  tbody td.num {
    text-align: center;
    width: 8%;
    color: #888;
    font-size: 11px;
  }

  tbody td.word-col {
    width: 37%;
    font-weight: 600;
  }

  tbody td.cn-col {
    width: 37%;
  }

  tbody td.blank-col {
    width: 37%;
    color: #ccc;
    font-style: italic;
  }

  tbody td.check {
    text-align: center;
    width: 10%;
    font-size: 16px;
    color: #ccc;
  }

  tbody tr {
    page-break-inside: avoid;
  }

  .group-header td {
    background: #fafafa;
    font-weight: 700;
    font-size: 12px;
    text-align: center;
    padding: 2.5mm;
    color: #555;
    border: 1px solid #ccc;
  }

  .first-letter-hint {
    color: #aaa;
    font-weight: 400;
  }

  /* ── 页脚 ── */
  .print-footer {
    margin-top: 5mm;
    font-size: 12px;
    color: #555;
    text-align: center;
  }

  /* ── 两栏紧凑布局 ── */
  .compact-container {
    display: flex;
    gap: 6mm;
  }

  .compact-container .column {
    flex: 1;
    min-width: 0;
  }

  .compact-container table thead th {
    font-size: 11px;
    padding: 2.5mm 0.5mm;
  }

  .compact-container table tbody td {
    font-size: 11px;
    padding: 2mm 1mm;
  }

  .compact-container table tbody td.num {
    width: 10%;
  }

  .compact-container table tbody td.cn-col,
  .compact-container table tbody td.blank-col,
  .compact-container table tbody td.word-col {
    width: 45%;
  }

  .compact-container table tbody td.check {
    width: 0;
    display: none;
  }

  /* ── 打印时隐藏分页符之间的间隙 ── */
  @media print {
    .page-break-here {
      page-break-before: always;
    }
  }

  @media screen {
    .print-only {
      display: none;
    }
  }
`;

// ══════════════════════════════════════
// 辅助函数
// ══════════════════════════════════════

const LEVEL_LABELS: Record<string, string> = {
  "基础": "⭐ 基础词汇",
  "进阶": "⭐⭐ 进阶词汇",
  "高级": "⭐⭐⭐ 高级词汇",
};

function getFirstLetterHint(word: string): string {
  if (!word) return "";
  return word.charAt(0) + "_".repeat(Math.max(0, word.length - 1));
}

/** 转义 HTML 实体，防止生成的打印 HTML 被注入恶意脚本 */
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

/** 生成表格行 */
function renderRow(
  index: number,
  col1: string,
  col2: string,
  showCheck: boolean,
  isWordBold: boolean,
  firstLetter?: string
): string {
  const num = `<td class="num">${index}</td>`;
  const c1 = isWordBold
    ? `<td class="word-col">${col1}</td>`
    : `<td class="cn-col">${col1}</td>`;

  let c2: string;
  if (col2 === "" && firstLetter) {
    c2 = `<td class="blank-col"><span class="first-letter-hint">${firstLetter}</span></td>`;
  } else if (col2 === "") {
    c2 = `<td class="blank-col"></td>`;
  } else {
    c2 = `<td class="word-col">${col2}</td>`;
  }

  const check = showCheck ? `<td class="check">○</td>` : "";

  const cls = index % 5 === 0 && index > 0 ? ' style="border-bottom: 2px solid #888;"' : "";

  return `<tr${cls}>${num}${c1}${c2}${check}</tr>`;
}

/** 生成表头 */
function renderHeader(format: PrintFormat, showCheck: boolean, compact: boolean): string {
  const w1 = compact ? "44%" : "37%";
  const w2 = compact ? "44%" : "37%";
  const wNum = compact ? "12%" : "8%";
  const wCheck = compact ? "" : showCheck ? '<th style="width:10%">✓</th>' : "";

  if (format === "cn2en") {
    return `<thead><tr>
      <th style="width:${wNum}">序号</th>
      <th style="width:${w1}">中文释义</th>
      <th style="width:${w2}">英文默写</th>
      ${wCheck}
    </tr></thead>`;
  } else {
    return `<thead><tr>
      <th style="width:${wNum}">序号</th>
      <th style="width:${w1}">英文单词</th>
      <th style="width:${w2}">中文释义</th>
      ${wCheck}
    </tr></thead>`;
  }
}

/** 生成整张表格 */
function renderTable(
  words: WordEntry[],
  format: PrintFormat,
  options: PrintOptions,
  startIndex: number
): string {
  if (words.length === 0) return "";

  const showCheck = !options.compact;
  const header = renderHeader(format, showCheck, !!options.compact);

  let rows = "";
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const idx = startIndex + i + 1;

    let col1: string;
    let isWordBold: boolean;
    let hint: string | undefined;

    if (format === "en2cn") {
      col1 = escapeHtml(w.word);
      isWordBold = true;
    } else {
      col1 = escapeHtml(w.chinese);
      isWordBold = false;
      if (options.showFirstLetter) {
        hint = escapeHtml(getFirstLetterHint(w.word));
      }
    }

    rows += renderRow(idx, col1, "", showCheck, isWordBold, hint);
  }

  return `<table>${header}<tbody>${rows}</tbody></table>`;
}

/** 生成分组表格（按等级分组） */
function renderGroupedTable(
  words: WordEntry[],
  format: PrintFormat,
  options: PrintOptions
): string {
  const order = ["基础", "进阶", "高级"];
  const groups = new Map<string, WordEntry[]>();

  for (const w of words) {
    const level = w.level || "基础";
    if (!groups.has(level)) groups.set(level, []);
    groups.get(level)!.push(w);
  }

  const showCheck = !options.compact;

  let html = "";
  let globalIdx = 0;

  for (const level of order) {
    const g = groups.get(level);
    if (!g || g.length === 0) continue;
    groups.delete(level);

    const label = LEVEL_LABELS[level] || escapeHtml(level);
    const colspan = showCheck ? 4 : 3;
    html += `<tr class="group-header"><td colspan="${colspan}">${label}</td></tr>`;

    html += renderRowsFragment(g, format, options, globalIdx, showCheck);
    globalIdx += g.length;
  }

  for (const [, g] of groups) {
    html += renderRowsFragment(g, format, options, globalIdx, showCheck);
    globalIdx += g.length;
  }

  const header = renderHeader(format, showCheck, !!options.compact);
  return `<table>${header}<tbody>${html}</tbody></table>`;
}

/** 只渲染行片段（不含 table 和 thead） */
function renderRowsFragment(
  words: WordEntry[],
  format: PrintFormat,
  options: PrintOptions,
  startIndex: number,
  showCheck: boolean
): string {
  let rows = "";
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const idx = startIndex + i + 1;

    let col1: string;
    let isWordBold: boolean;
    let hint: string | undefined;

    if (format === "en2cn") {
      col1 = escapeHtml(w.word);
      isWordBold = true;
    } else {
      col1 = escapeHtml(w.chinese);
      isWordBold = false;
      if (options.showFirstLetter) {
        hint = escapeHtml(getFirstLetterHint(w.word));
      }
    }

    rows += renderRow(idx, col1, "", showCheck, isWordBold, hint);
  }
  return rows;
}

// ══════════════════════════════════════
// 主入口
// ══════════════════════════════════════

/**
 * 生成完整的打印 HTML 文档
 */
export function generatePrintHtml(
  words: WordEntry[],
  format: PrintFormat,
  options: PrintOptions = {}
): string {
  const isCompact = !!options.compact;
  const title = options.title || "英语单词默写纸";
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  let bodyHtml: string;

  if (isCompact) {
    // 两栏紧凑：左右各一半
    const mid = Math.ceil(words.length / 2);
    const leftWords = words.slice(0, mid);
    const rightWords = words.slice(mid);

    const leftTable = options.groupByLevel
      ? renderGroupedTable(leftWords, format, options)
      : renderTable(leftWords, format, options, 0);
    const rightTable = options.groupByLevel
      ? renderGroupedTable(rightWords, format, options)
      : renderTable(rightWords, format, options, mid);

    bodyHtml = `
      <div class="compact-container">
        <div class="column">${leftTable}</div>
        <div class="column">${rightTable}</div>
      </div>`;
  } else {
    bodyHtml = options.groupByLevel
      ? renderGroupedTable(words, format, options)
      : renderTable(words, format, options, 0);
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="print-header">
    <h1>📝 ${escapeHtml(title)}</h1>
    <div class="meta">
      <span>姓名：<span class="blank"></span></span>
      <span>日期：<span class="blank" style="width:30mm">${escapeHtml(dateStr)}</span></span>
      <span>用时：<span class="blank" style="width:25mm"></span></span>
    </div>
  </div>

  <div class="table-wrapper">
    ${bodyHtml}
  </div>

  <div class="print-footer">
    共 ${words.length} 个单词 &nbsp;|&nbsp; 正确率：___ / ${words.length} &nbsp;|&nbsp; 得分：______
  </div>

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
  words: WordEntry[],
  format: PrintFormat,
  options: PrintOptions = {}
): void {
  if (words.length === 0) return;

  const html = generatePrintHtml(words, format, options);
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

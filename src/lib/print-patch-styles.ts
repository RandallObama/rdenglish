/**
 * PDF 默写纸 CSS 补丁 — 独立文件，验证部署是否生效
 * 在 generatePrintHtml 的 STYLES 之后注入
 */
export const PATCH_STYLES = `
  /* === PDF打印补丁 v3 === */
  .paper {
    outline: 4px solid #FF0000 !important;
  }
  .word-table td.col-word {
    font-size: 7px !important;
    font-weight: 400 !important;
  }
  .write-line {
    display: block !important;
    width: 100% !important;
    height: 3px !important;
    background: #FF0000 !important;
    margin-top: 1.5mm !important;
  }
`;

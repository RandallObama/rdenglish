import type { GrammarNote } from "@/types";

/** 本质相同的语法点名称映射 — 将各种叫法统一为规范名称 */
const GRAMMAR_MERGE_RULES: Record<string, string> = {
  "时态不一致": "时态问题",
  "时态一致性": "时态问题",
  "时态错误": "时态问题",
  "时态混用": "时态问题",
  "时态混乱": "时态问题",
  "主谓不一致": "主谓一致问题",
  "主谓一致错误": "主谓一致问题",
  "主谓一致": "主谓一致问题",
  "冠词缺失": "冠词使用问题",
  "冠词多余": "冠词使用问题",
  "冠词误用": "冠词使用问题",
  "a/an误用": "冠词使用问题",
  "定冠词误用": "冠词使用问题",
  "名词单复数": "名词单复数问题",
  "单复数错误": "名词单复数问题",
  "单复数不一致": "名词单复数问题",
  "中式英语": "表达不够地道",
  "Chinglish表达": "表达不够地道",
  "Chinglish": "表达不够地道",
  "介词误用": "介词使用问题",
  "介词错误": "介词使用问题",
  "介词搭配错误": "介词使用问题",
  "拼写错误": "拼写问题",
  "拼写有误": "拼写问题",
  "标点错误": "标点问题",
  "标点使用不当": "标点问题",
};

/** 将语法点名称统一后去重 */
export function deduplicateGrammarNotes(notes: GrammarNote[]): GrammarNote[] {
  if (!notes || notes.length === 0) return notes;

  const seen = new Map<string, GrammarNote>();

  for (const note of notes) {
    const normalizedName = GRAMMAR_MERGE_RULES[note.point] || note.point;

    if (seen.has(normalizedName)) {
      // 合并：保留第一个，将当前 note 的 explanation 和 examples 合并进去
      const existing = seen.get(normalizedName)!;
      if (note.explanation && note.explanation !== existing.explanation) {
        existing.explanation = existing.explanation + "\n\n" + note.explanation;
      }
      if (note.examples && note.examples.length > 0) {
        const existingExamples = new Set(existing.examples);
        for (const ex of note.examples) {
          if (!existingExamples.has(ex)) {
            existing.examples.push(ex);
          }
        }
      }
    } else {
      seen.set(normalizedName, { ...note, point: normalizedName });
    }
  }

  return Array.from(seen.values());
}

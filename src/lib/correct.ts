import OpenAI from "openai";
import type { CorrectionResult, ExamType } from "@/types";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

const examStandards: Record<
  ExamType,
  { name: string; maxScore: number; criteria: string }
> = {
  middle: {
    name: "中考",
    maxScore: 25,
    criteria: `中考英语作文评分标准（满分25分）：
- 内容 (Content, 7分): 要点齐全，内容充实，逻辑连贯
- 结构 (Structure, 6分): 段落分明，衔接自然，过渡词使用正确
- 语法 (Grammar, 6分): 基础语法正确，时态/语态/主谓一致无大错
- 词汇 (Vocabulary, 6分): 词汇恰当，拼写正确，能使用基础搭配`,
  },
  high: {
    name: "高考",
    maxScore: 25,
    criteria: `高考英语作文评分标准（满分25分）：
- 内容 (Content, 7分): 覆盖所有要点，观点明确，详略得当
- 结构 (Structure, 6分): 篇章结构完整，逻辑层次清晰，有效使用衔接词
- 语法 (Grammar, 6分): 正确使用复合句、非谓语动词、从句等高级语法结构
- 词汇 (Vocabulary, 6分): 词汇丰富，使用高级词汇和地道搭配`,
  },
  cet4: {
    name: "四级",
    maxScore: 15,
    criteria: `四级作文评分标准（满分15分）：
- 内容 (Content, 4分): 切题，观点明确，论证充分
- 结构 (Structure, 4分): 结构完整（引言-正文-结论），过渡自然
- 语法 (Grammar, 4分): 句式多样化，复杂句使用正确
- 词汇 (Vocabulary, 3分): 词汇量充分，使用学术词汇和同义替换`,
  },
  cet6: {
    name: "六级",
    maxScore: 15,
    criteria: `六级作文评分标准（满分15分）：
- 内容 (Content, 4分): 观点深刻，论证有力，有独立见解
- 结构 (Structure, 4分): 逻辑严密，层次丰富，衔接手段多样
- 语法 (Grammar, 4分): 长难句驾驭能力强，语法错误极少
- 词汇 (Vocabulary, 3分): 学术词汇丰富，搭配地道，同义替换精准`,
  },
  ielts: {
    name: "雅思/托福",
    maxScore: 9,
    criteria: `雅思写作评分标准（满分9分）：
- 任务完成度 (Task Achievement, 2.5分): 完全回应题目，观点充分展开
- 连贯与衔接 (Coherence & Cohesion, 2.5分): 段落组织清晰，衔接手段运用自如
- 语法范围与准确性 (Grammatical Range, 2分): 灵活使用多种句式，极少错误
- 词汇资源 (Lexical Resource, 2分): 词汇广泛且精准，熟练使用搭配和习语`,
  },
  general: {
    name: "通用",
    maxScore: 100,
    criteria: `通用评分标准（满分100分）：
- 内容 (Content, 30分): 主题明确，内容充实，论证有力
- 结构 (Structure, 25分): 篇章完整，段落清晰，逻辑连贯
- 语法 (Grammar, 25分): 语法准确，句式多样
- 词汇 (Vocabulary, 20分): 词汇丰富，表达地道`,
  },
};

function makeCorrectSystemPrompt(standard: typeof examStandards[ExamType]) {
  return `你是一位资深英语阅卷老师，拥有15年${standard.name}阅卷经验。请你批改用户提交的英语作文。

## 评分标准
${standard.criteria}

## 批改要求

### 1. 综合评分
根据标准给出总分和各分项得分。

### 2. 逐句批注 (sentenceCorrections)
对每句话进行点评，包含：
- original: 原句
- revised: 改进建议（如无需修改则写原句）
- comment: 点评（指出优点或不足，用中文）

### 3. 语法问题 (grammarIssues)
找出作文中的语法问题，每个问题包含：
- point: 语法点名称（用中文）
- level: 难度级别
- function: 该语法点的功能
- structure: 正确结构公式
- explanation: 详细讲解
- examples: 正确例句（1-2个）
- commonMistakes: 常见类似错误 [{error, correction, explanation}]
- examTip: ${standard.name}考试提示

### 4. 词汇建议 (vocabSuggestions)
从作文中挑选4-6个可以用更好词汇替换或升级的地方给出建议（优先选最有提升空间的，覆盖不同词性），每个建议包含：
- word: 建议的词汇/短语
- chinese: 中文释义
- collocations: 常用搭配
- synonyms: 近义词对比
- level: 词汇等级
- usage: 用法说明
- examples: 例句
- commonErrors: 常见误用 [{error, correction, explanation}]
- examFocus: 考试关注点

### 5. 优化建议 (improvementSuggestions)
从整体层面给出3-5条具体的优化建议，每条建议包含：
- suggestion: 具体的修改建议（用中文，直接说怎么改）
- reason: 为什么建议这样改（用中文，解释背后的写作道理）

不要重复前面语法问题和词汇建议中已经指出的内容，而是从更高的角度给出建议，比如：
- 文章结构、段落衔接
- 论点展开和论证深度
- 语言风格的统一
- 开头结尾的优化
- 逻辑连贯性
避免过于空泛的建议如"多读多写"，每条建议都要具体可执行。

### 6. 总评 (overallComment)
用中文写一段总体评价（100-200字），包括优点、问题、改进建议。

## 输出格式
严格返回JSON（不要markdown代码块）：
{
  "totalScore": 分数,
  "maxScore": ${standard.maxScore},
  "scores": {"content": 分数, "structure": 分数, "grammar": 分数, "vocabulary": 分数},
  "sentenceCorrections": [{"original": "...", "revised": "...", "comment": "..."}],
  "grammarIssues": [语法问题数组],
  "vocabSuggestions": [词汇建议数组],
  "improvementSuggestions": [{"suggestion": "建议内容", "reason": "建议理由"}],
  "overallComment": "总评文本"
}`;
}

export async function correctEssay(
  essayText: string,
  examType: ExamType = "general"
): Promise<CorrectionResult> {
  const standard = examStandards[examType];
  const systemPrompt = makeCorrectSystemPrompt(standard);

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: essayText },
    ],
    temperature: 0.4,
    max_tokens: 8192,
  });

  const content = response.choices[0]?.message?.content || "";

  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr
      .replace(/```json?\s*\n?/g, "")
      .replace(/```\s*\n?/g, "");
  }

  try {
    return JSON.parse(jsonStr) as CorrectionResult;
  } catch {
    return {
      totalScore: 0,
      maxScore: standard.maxScore,
      scores: { content: 0, structure: 0, grammar: 0, vocabulary: 0 },
      sentenceCorrections: [],
      grammarIssues: [],
      vocabSuggestions: [],
      improvementSuggestions: [],
      overallComment: content,
    };
  }
}

/**
 * 流式批改 — 边生成边返回文本块，迭代结束时 return 完整的 CorrectionResult。
 * 用法：
 *   const iter = streamCorrectEssay(text, examType)[Symbol.asyncIterator]();
 *   let result: CorrectionResult;
 *   for await (const chunk of iter) { sendChunk(chunk); }
 *   // iter 的 return 值包含最终结果（通过 next() 获取）
 *
 * 在 API 层通常的做法是把迭代当生成器用。
 */
export async function* streamCorrectEssay(
  essayText: string,
  examType: ExamType = "general"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const standard = examStandards[examType];
  const systemPrompt = makeCorrectSystemPrompt(standard);

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: essayText },
    ],
    temperature: 0.4,
    max_tokens: 8192,
    stream: true,
  });

  let fullContent = "";
  for await (const chunk of response) {
    const delta = (chunk as unknown as Record<string, unknown>).choices as any[] | undefined;
    const content = delta?.[0]?.delta?.content as string | undefined;
    if (content) {
      fullContent += content;
      yield content;
    }
  }

  let jsonStr = fullContent.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr
      .replace(/```json?\s*\n?/g, "")
      .replace(/```\s*\n?/g, "");
  }

  try {
    return JSON.parse(jsonStr) as CorrectionResult;
  } catch {
    return {
      totalScore: 0,
      maxScore: standard.maxScore,
      scores: { content: 0, structure: 0, grammar: 0, vocabulary: 0 },
      sentenceCorrections: [],
      grammarIssues: [],
      vocabSuggestions: [],
      improvementSuggestions: [],
      overallComment: fullContent,
    };
  }
}

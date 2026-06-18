import { aiClient } from "@/lib/ai-client";
import type {
  CommonMistake,
  CommonError,
  GrammarNote,
  VocabNote,
  TranslationResult,
  WritingStyle,
  ExamType,
} from "@/types";

const examConfig: Record<
  ExamType,
  { name: string; focus: string; vocabularyLevel: string }
> = {
  middle: {
    name: "中考",
    focus: "中考英语重点考查基础时态、被动语态、宾语从句、状语从句、情态动词等基础语法。词汇以初中课标1600词为核心。关注基础拼写和简单搭配。",
    vocabularyLevel: "初中基础词汇",
  },
  high: {
    name: "高考",
    focus: "高考英语重点考查非谓语动词、名词性从句、定语从句、虚拟语气、倒装句等中高级语法。词汇以高中课标3500词为核心，注重词汇辨析和固定搭配。",
    vocabularyLevel: "高中核心词汇",
  },
  cet4: {
    name: "四级",
    focus: "四级考试重点考查复杂句分析、时态语态综合运用、从句嵌套、强调句等。词汇量要求约4500词，注重同义替换和搭配。",
    vocabularyLevel: "四级词汇",
  },
  cet6: {
    name: "六级",
    focus: "六级考试要求更高的语法综合运用能力，包括长难句分析、虚拟语气高级用法、倒装与省略等。词汇量要求约6000词，重视近义词辨析和学术搭配。",
    vocabularyLevel: "六级词汇",
  },
  ielts: {
    name: "雅思/托福",
    focus: "雅思托福注重学术英语能力，重点关注：名词化结构、学术表达中的被动语态、复杂后置定语、衔接手段(cohesion)等。词汇侧重学术场景和同义转述。",
    vocabularyLevel: "雅思/托福学术词汇",
  },
  general: {
    name: "通用",
    focus: "覆盖基础到高级的各类语法点，侧重实用性和地道表达。",
    vocabularyLevel: "通用核心词汇",
  },
  literary: {
    name: "文学批评",
    focus: "文学写作注重语言的艺术性和表现力，重点关注：修辞手法（隐喻、象征、反讽）、文学性词汇与意象营造、句式多样性与节奏感、叙事声音的一致性、展示而非讲述的写作原则。",
    vocabularyLevel: "文学写作核心词汇",
  },
};

const styleMap: Record<WritingStyle, string> = {
  academic: "学术英语",
  business: "商务英语",
  daily: "日常英语",
};

function makeTranslateSystemPrompt(exam: typeof examConfig[ExamType], styleName: string) {
  return `你是一位资深英语教育专家，拥有20年${exam.name}教学经验。用户给你中文文本，请你：

## 任务
1. 将中文翻译成地道的${styleName}
2. **分析翻译后的英文句子中使用的英语语法**（不是分析中文原文的语法）
3. **解读翻译中出现的英语词汇和短语**（不是分析中文词汇）

## 考试重点
${exam.focus}

## 语法分析要求（分析英文译文中的英语语法，每个语法点必须包含）
- point: 英语语法点名称（用中文写）
- level: 难度级别（"基础"/"进阶"/"高级"）
- function: 该语法在句中的表达功能和修辞效果（至少1句话）
- structure: 结构公式或句式模板
- explanation: 详细讲解，包含该语法的特点、使用场景、注意事项（至少3句话）
- examples: 提供2-3个英语例句
- commonMistakes: 列出2-3个学生常犯的错误，每个包含 error/correction/explanation
- examTip: 该语法点在${exam.name}考试中的注意要点（用中文解释）

## 词汇分析要求（分析英文译文中出现的英语词汇，每个词汇必须包含）
- word: 英文译文中的英语单词或短语（不要写中文词）
- chinese: 中文释义
- collocations: 2-3个常用搭配
- synonyms: 1-2个近义词并简述区别
- level: 词汇等级（"${exam.vocabularyLevel}"）
- usage: 详细用法说明（至少2句话）
- examples: 2个英语例句
- commonErrors: 1-2个常见误用案例，每个包含 error/correction/explanation
- examFocus: 该词在${exam.name}中的考查方式或易错点

## 输出格式
严格返回以下 JSON（不要 markdown 代码块）:
{
  "english": "翻译后的英文",
  "grammarNotes": [...],
  "vocabNotes": [...]
}

## 重要原则
- 语法点挑选2-4个最关键的即可，宁缺毋滥，每个深度分析
- 词汇挑选5-7个最有价值的，优先选考试高频词，覆盖不同难度层次
- 例句要自然地道，不要生造
- 讲解语言用中文，便于理解
- 只返回 JSON，不要其他文字`;
}

function parseAIJson(content: string): string {
  let s = content.trim();
  s = s.replace(/```json?\s*/gi, "").replace(/```\s*/g, "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  return s;
}

// ── 非流式版本 ──

export async function translateAndAnalyze(
  chineseText: string,
  style: WritingStyle = "daily",
  examType: ExamType = "general"
): Promise<TranslationResult> {
  const exam = examConfig[examType];
  const systemPrompt = makeTranslateSystemPrompt(exam, styleMap[style]);

  const response = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: chineseText },
    ],
    temperature: 0.8,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content || "";
  const jsonStr = parseAIJson(content);

  try {
    return JSON.parse(jsonStr) as TranslationResult;
  } catch (e) {
    console.error("translateAndAnalyze JSON parse error:", e, "\nRaw:", content);
    return {
      english: "翻译失败，请稍后重试",
      grammarNotes: [],
      vocabNotes: [],
    };
  }
}

// ── 流式版本 ──

export async function* streamTranslateAndAnalyze(
  chineseText: string,
  style: WritingStyle = "daily",
  examType: ExamType = "general"
): AsyncGenerator<string, TranslationResult, unknown> {
  const exam = examConfig[examType];
  const systemPrompt = makeTranslateSystemPrompt(exam, styleMap[style]);

  const stream = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: chineseText },
    ],
    temperature: 0.8,
    max_tokens: 4096,
    stream: true,
  });

  let fullContent = "";
  for await (const chunk of stream) {
    const delta = (chunk as unknown as Record<string, unknown>).choices as Array<{ delta?: { content?: string } }> | undefined;
    const content = delta?.[0]?.delta?.content;
    if (content) {
      fullContent += content;
      yield content;
    }
  }

  const jsonStr = parseAIJson(fullContent);
  try {
    return JSON.parse(jsonStr) as TranslationResult;
  } catch (e) {
    console.error("streamTranslateAndAnalyze JSON parse error:", e, "\nRaw:", fullContent);
    return {
      english: "翻译失败，请稍后重试",
      grammarNotes: [],
      vocabNotes: [],
    };
  }
}

// ── 非流式伴写 ──

export async function cowriteContinue(
  existingText: string,
  style: WritingStyle = "daily"
): Promise<{ suggestions: string[] }> {
  const styleName = styleMap[style];

  const systemPrompt = `你是一位专业的中文写作助手，擅长${styleName}写作。用户正在写一段中文，请你根据已有内容，生成自然的下一句话。

## 任务
1. 仔细分析用户已写文字的主题、语气、句式风格和逻辑走向
2. 生成 2 个不同的续写方向，每个 1-2 句话
3. 续写需要与上文保持逻辑连贯、风格一致、自然流畅

## 输出格式
严格返回以下 JSON（不要 markdown 代码块）:
{
  "suggestions": ["续写方向A的内容", "续写方向B的内容"]
}

## 重要原则
- 续写句子自然流畅
- 长度与用户上文的句子长度相匹配
- 只返回 JSON，不要其他文字`;

  const response = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `请根据以下内容生成续写：\n\n${existingText}` },
    ],
    temperature: 1.0,
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content || "";
  const jsonStr = parseAIJson(content);

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 2)
        : [],
    };
  } catch {
    const lines = content
      .split(/\n/)
      .map((l: string) => l.replace(/^\d+[\.\、\s]+/, "").trim())
      .filter((l: string) => l.length > 10);
    return { suggestions: lines.slice(0, 2) };
  }
}

// ── 流式伴写 ──

export async function* streamCowriteContinue(
  existingText: string,
  style: WritingStyle = "daily"
): AsyncGenerator<string, { suggestions: string[] }, unknown> {
  const styleName = styleMap[style];

  const systemPrompt = `你是一位专业的中文写作助手，擅长${styleName}写作。根据已有内容生成2个不同的续写方向，每个1-2句话。
只返回JSON: {"suggestions": ["方向A的内容", "方向B的内容"]}`;

  const stream = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `请根据以下内容生成续写：\n\n${existingText}` },
    ],
    temperature: 1.0,
    max_tokens: 1024,
    stream: true,
  });

  let fullContent = "";
  for await (const chunk of stream) {
    const delta = (chunk as unknown as Record<string, unknown>).choices as Array<{ delta?: { content?: string } }> | undefined;
    const content = delta?.[0]?.delta?.content;
    if (content) {
      fullContent += content;
      yield content;
    }
  }

  const jsonStr = parseAIJson(fullContent);
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 2)
        : [],
    };
  } catch {
    const lines = fullContent
      .split(/\n/)
      .map((l: string) => l.replace(/^\d+[\.\、\s]+/, "").trim())
      .filter((l: string) => l.length > 10);
    return { suggestions: lines.slice(0, 2) };
  }
}

// ── 英文伴写（非流式）──

export async function cowriteContinueEn(
  existingText: string,
  style: string = "daily"
): Promise<{ suggestions: string[] }> {
  const styleGuide: Record<string, string> = {
    daily: "自然的日常英语",
    academic: "正式的学术英语",
    business: "专业的商务英语",
    creative: "富有表现力的创意英语",
    persuasive: "有说服力的议论文英语",
  };

  const guide = styleGuide[style] || styleGuide.daily;

  const systemPrompt = `You are a professional English writing coach. The user is writing an English passage. Based on the existing text, generate 2 different natural continuations (1-2 sentences each) in ${guide} style.

Requirements:
1. Analyze the topic, tone, sentence style, and logical direction of the existing text
2. Generate 2 different continuation directions, each 1-2 sentences
3. Continuations must be logically coherent, stylistically consistent, and naturally flowing
4. Match the sentence length and complexity of the original

Output format (JSON only, no markdown):
{
  "suggestions": ["Continuation A", "Continuation B"]
}`;

  const response = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Please generate continuations for:\n\n${existingText}` },
    ],
    temperature: 1.0,
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content || "";
  const jsonStr = parseAIJson(content);

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 2)
        : [],
    };
  } catch {
    const lines = content
      .split(/\n/)
      .map((l: string) => l.replace(/^\d+[\.\、\s]+/, "").trim())
      .filter((l: string) => l.length > 10);
    return { suggestions: lines.slice(0, 2) };
  }
}

// ── 英文伴写（流式）──

export async function* streamCowriteContinueEn(
  existingText: string,
  style: string = "daily"
): AsyncGenerator<string, { suggestions: string[] }, unknown> {
  const styleGuide: Record<string, string> = {
    daily: "自然的日常英语",
    academic: "正式的学术英语",
    business: "专业的商务英语",
    creative: "富有表现力的创意英语",
    persuasive: "有说服力的议论文英语",
  };

  const guide = styleGuide[style] || styleGuide.daily;

  const systemPrompt = `You are a professional English writing coach. Based on the existing English text, generate 2 different continuations (1-2 sentences each) in ${guide} style.
Output only JSON: {"suggestions": ["Direction A", "Direction B"]}`;

  const stream = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate continuations for:\n${existingText}` },
    ],
    temperature: 1.0,
    max_tokens: 1024,
    stream: true,
  });

  let fullContent = "";
  for await (const chunk of stream) {
    const delta = (chunk as unknown as Record<string, unknown>).choices as Array<{ delta?: { content?: string } }> | undefined;
    const content = delta?.[0]?.delta?.content;
    if (content) {
      fullContent += content;
      yield content;
    }
  }

  const jsonStr = parseAIJson(fullContent);
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 2)
        : [],
    };
  } catch {
    const lines = fullContent
      .split(/\n/)
      .map((l: string) => l.replace(/^\d+[\.\、\s]+/, "").trim())
      .filter((l: string) => l.length > 10);
    return { suggestions: lines.slice(0, 2) };
  }
}

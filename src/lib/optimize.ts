import { aiClient } from "@/lib/ai-client";
import type {
  OptimizeResult,
  OptimizeStyle,
  ExamType,
  OptimizeIntensity,
  OptimizeMode,
} from "@/types";

// ═══════════════════════════════════════════════════════════
// 风格 & 考试配置
// ═══════════════════════════════════════════════════════════

const styleConfig: Record<OptimizeStyle, { name: string; guide: string }> = {
  daily: {
    name: "日常英语",
    guide: "语气自然亲切，用词生活化，句式简洁明快，避免过于正式或学术化。适合日常交流、博客、个人日记。",
  },
  academic: {
    name: "学术英语",
    guide: "语气正式客观，使用学术词汇和专业术语，句式严谨，引用规范。适合论文、报告、学术文章。避免口语化表达和缩写。使用名词化结构和被动语态增强客观性。",
  },
  business: {
    name: "商务英语",
    guide: "语气专业得体，用词精准，表达简洁有力。注重清晰度和说服力。适合邮件、提案、商业报告。使用主动语态为主，句式不宜过于复杂。",
  },
  creative: {
    name: "创意写作",
    guide: "语言生动形象，注重意象营造和感官细节。句式可以灵活多变，使用修辞手法（隐喻、拟人、排比等）增强表现力。遵循 Show, don't tell 原则。适合故事、散文、描述性写作。",
  },
  persuasive: {
    name: "议论文",
    guide: "逻辑严密，论点清晰，论证层层递进。使用过渡词明确逻辑关系，每段有明确的主题句。善用让步和反驳增强说服力。适合辩论、评论、观点文章。",
  },
};

const examConfig: Record<
  ExamType,
  { name: string; focus: string; vocabLevel: string }
> = {
  middle: {
    name: "中考",
    focus: "对标中考评分标准：基础时态语态正确、宾语从句和状语从句运用恰当、情态动词使用准确。词汇以初中课标1600词为核心。句式不宜过于复杂，确保基础语法正确。",
    vocabLevel: "初中基础词汇",
  },
  high: {
    name: "高考",
    focus: "对标高考评分标准：非谓语动词、名词性从句、定语从句、虚拟语气和倒装句等中高级语法需正确运用。词汇以高中课标3500词为核心。句式应有一定复杂度，适当使用分词短语、with复合结构等。",
    vocabLevel: "高中核心词汇",
  },
  cet4: {
    name: "四级",
    focus: "对标四级评分标准：复杂句分析正确、时态语态综合运用、从句嵌套合理、强调句使用恰当。词汇量约4500词，注重同义替换和地道的动宾搭配。",
    vocabLevel: "四级词汇",
  },
  cet6: {
    name: "六级",
    focus: "对标六级评分标准：长难句驾驭得当、虚拟语气高级用法正确、倒装省略合理自然。词汇量约6000词，重视学术搭配和近义词精准辨析。",
    vocabLevel: "六级词汇",
  },
  ielts: {
    name: "雅思/托福",
    focus: "对标雅思托福评分标准：名词化结构、被动语态在学术语境中使用得当、复杂后置定语正确、衔接手段(cohesion)丰富。词汇侧重学术场景和同义转述(paraphrasing)，避免重复。",
    vocabLevel: "雅思/托福学术词汇",
  },
  general: {
    name: "通用",
    focus: "覆盖基础到高级的各类语法点，侧重实用性和地道表达。句式多样但不刻意复杂化，以清晰表达为优先。",
    vocabLevel: "通用核心词汇",
  },
  literary: {
    name: "文学批评",
    focus: "注重语言的艺术性和表现力：修辞手法运用得当（隐喻、象征、反讽）、文学性词汇与意象营造、句式多样性有意图、叙事声音一致、Show-don't-tell 原则。",
    vocabLevel: "文学写作核心词汇",
  },
};

// ═══════════════════════════════════════════════════════════
// 优化力度配置
// ═══════════════════════════════════════════════════════════

const intensityConfig: Record<
  OptimizeIntensity,
  {
    name: string;
    scope: string;
    changeConstraint: string;
    improvementCount: string;
  }
> = {
  light: {
    name: "轻度优化",
    scope: `你只能做以下改动：
1. 纠正语法错误（时态、主谓一致、单复数、冠词等）
2. 修正拼写和标点错误
3. 替换明显不当的用词（如中式英语）为地道表达

你不能做以下改动：
- 不要改变句子结构
- 不要添加或删除任何内容
- 不要调整段落顺序
- 不要改变文章的论点和语气
- 除非必要，不要替换作者原有的词汇`,
    changeConstraint:
      "只改必要的语法错误和拼写问题，保持原文句子结构完全不变。改动越少越好。",
    improvementCount: "3-5",
  },
  medium: {
    name: "中度优化",
    scope: `你可以做以下改动：
1. 纠正所有语法和拼写错误
2. 升级词汇表达（替换平淡/重复的词汇为更精准地道的表达）
3. 适当增加句式多样性（合并/拆分句子，增加从句使用）
4. 改善逻辑衔接（添加/优化过渡词）
5. 修正明显的中式英语表达

你不能做以下改动：
- 不要大幅改变文章结构或段落组织
- 不要改变作者的论点和核心观点
- 不要添加新的论据或内容`,
    changeConstraint:
      "在保持原文结构和观点不变的前提下，提升表达质量。每个改动都应该有明确的教育意义。",
    improvementCount: "5-8",
  },
  deep: {
    name: "深度优化",
    scope: `你可以做全面的深度优化：
1. 纠正所有语法、拼写、标点错误
2. 全面升级词汇和表达，使用更精准、地道、有文采的语言
3. 重构句式，实现句式多样性和节奏变化
4. 加强逻辑结构：优化段落划分、主题句、过渡衔接、论证层次
5. 丰富内容论证：补充细节、数据支撑、举例说明（在不新增事实的前提下）
6. 优化开头和结尾的力量感
7. 消除所有中式英语痕迹

核心约束：保留作者的核心观点和写作意图，不要歪曲原意。`,
    changeConstraint:
      "大胆优化，让文章焕然一新。在保留核心观点和意图的前提下，从内容、结构、语言各层面全面提升。每个改动都要有充分的教育理由。",
    improvementCount: "8-12",
  },
};

// ═══════════════════════════════════════════════════════════
// Prompt 构建
// ═══════════════════════════════════════════════════════════

function makeOptimizeSystemPrompt(
  style: OptimizeStyle,
  examType: ExamType,
  intensity: OptimizeIntensity,
  mode: OptimizeMode
): string {
  const s = styleConfig[style];
  const e = examConfig[examType];
  const i = intensityConfig[intensity];

  let prompt = `你是一位资深英语写作导师，拥有 20 年教学经验。

# 任务
用户提交了一段英文文本，请你按照以下标准进行优化改写。

## 写作风格要求
${s.name}：${s.guide}

## 考试标准要求
${e.name}：${e.focus}

## 优化力度：${i.name}
${i.scope}

## 优化维度
从以下 5 个维度全面审视原文，但只做优化力度允许范围内的改动：

1. **内容 Content** — 论点是否充分？论证是否有深度？细节是否生动有力？
2. **语法 Grammar** — 纠正所有语法错误、提升句式多样性和复杂性
3. **词汇 Vocabulary** — 升级平淡词汇为精准地道的表达，实现同义替换避免重复，对标${e.vocabLevel}
4. **逻辑 Logic** — 改善句子间的因果关系、转折、递进、例证等逻辑关系，正确使用衔接手段
5. **结构 Structure** — 优化段落组织、开头结尾的力量感、过渡句的自然度

## 改进记录要求
记录你做的每个重要改动，控制在 ${i.improvementCount} 条以内。
每条必须包含：
- category: 改动所属维度
- original: 被改动的原文片段
- optimized: 优化后的版本
- reason: 改动的教育理由（用中文，至少 1 句话，能帮学生理解为什么要这样改）

## 语法分析要求
挑选 2-4 个优化过程中最值得学习的语法点，每个包含：
- point: 语法点名称（中文）
- level: 难度级别（"基础"/"进阶"/"高级"）
- function: 该语法在文中的表达功能
- structure: 结构公式或句式模板
- explanation: 详细讲解（至少 3 句话）
- examples: 2-3 个英语例句
- commonMistakes: 2-3 个学生常犯错误 [{error, correction, explanation}]
- examTip: 在${e.name}考试中的注意要点

## 词汇分析要求
挑选 3-5 个优化中使用到的高级词汇或地道表达，每个包含：
- word: 英文单词/短语
- chinese: 中文释义
- collocations: 2-3 个常用搭配
- synonyms: 1-2 个近义词并简述区别
- level: 词汇等级（"${e.vocabLevel}"）
- usage: 详细用法说明（至少 2 句话）
- examples: 2 个英语例句
- commonErrors: 1-2 个常见误用 [{error, correction, explanation}]
- examFocus: 在${e.name}中的考查方式

## 亮点总结
用一句简洁的中文总结本次优化的核心亮点（如："本次优化重点提升了逻辑衔接和学术词汇多样性，句式从 70% 简单句升级为 60% 复合句"）

`;

  // 片段模式额外指令
  if (mode === "fragment") {
    prompt += `## 片段优化模式 ⚠️ 重要

用户只选中了全文中的一段进行优化。你需要：
1. **只优化选中的片段**，不要改动上下文
2. **确保优化后的片段与前后文无缝衔接**：保持一致的时态、人称、语气、词汇风格和句式复杂度
3. **阅读上下文以理解语境**，但不要在 optimizedText 中返回上下文内容
4. 额外输出 transitionAnalysis：
   - beforeCoherence: 用中文说明优化后的片段如何与上文自然衔接（提到了哪些呼应点）
   - afterCoherence: 用中文说明优化后的片段如何为下文做铺垫

`;
  }

  prompt += `## 核心原则
- **保留作者原意**：不改变核心观点和写作意图
- **${i.changeConstraint}**
- **教育价值优先**：每个改动都要让学生学到东西
- **自然地道**：优化后的文字读起来像 native speaker 写的

## 输出格式
严格返回以下 JSON（不要 markdown 代码块）:
{
  "optimizedText": "优化后的英文文本",
  "improvements": [{ "category": "...", "original": "...", "optimized": "...", "reason": "..." }],
  "grammarNotes": [...],
  "vocabNotes": [...],
  "highlights": "亮点总结"
}
${mode === "fragment" ? '，额外包含 "transitionAnalysis": { "beforeCoherence": "...", "afterCoherence": "..." }' : ""}

只返回 JSON，不要其他文字。`;

  return prompt;
}

// ═══════════════════════════════════════════════════════════
// JSON 解析辅助
// ═══════════════════════════════════════════════════════════

function extractJson(raw: string): string {
  let s = raw.trim();
  s = s.replace(/```json?\s*/gi, "").replace(/```\s*/g, "");
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  return s;
}

// ═══════════════════════════════════════════════════════════
// 构建用户消息
// ═══════════════════════════════════════════════════════════

function buildUserMessage(
  text: string,
  mode: OptimizeMode,
  contextBefore?: string,
  contextAfter?: string
): string {
  if (mode === "fragment") {
    return `# 上文（仅用于理解语境，不要优化）
${contextBefore || "（无上文，这是文章开头）"}

# 需要优化的片段
${text}

# 下文（仅用于理解语境，不要优化）
${contextAfter || "（无下文，这是文章结尾）"}

请只优化【需要优化的片段】部分，确保与上下文衔接自然。`;
  }

  return text;
}

// ═══════════════════════════════════════════════════════════
// 非流式优化
// ═══════════════════════════════════════════════════════════

export async function optimizeEssay(
  text: string,
  style: OptimizeStyle = "daily",
  examType: ExamType = "general",
  intensity: OptimizeIntensity = "medium",
  mode: OptimizeMode = "full",
  contextBefore?: string,
  contextAfter?: string
): Promise<OptimizeResult> {
  const systemPrompt = makeOptimizeSystemPrompt(style, examType, intensity, mode);
  const userMessage = buildUserMessage(text, mode, contextBefore, contextAfter);

  const response = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.6,
    max_tokens: 16384,
  });

  const raw = response.choices[0]?.message?.content || "";
  const jsonStr = extractJson(raw);

  try {
    const parsed = JSON.parse(jsonStr) as OptimizeResult;
    // 如果 AI 没有返回优化后文本，回退到原文
    if (!parsed.optimizedText || parsed.optimizedText.trim().length === 0) {
      parsed.optimizedText = text;
    }
    return parsed;
  } catch (e) {
    console.error("optimizeEssay JSON parse error:", e, "\nRaw:", raw);
    return {
      optimizedText: text,
      improvements: [],
      grammarNotes: [],
      vocabNotes: [],
      highlights: "AI 返回格式异常，请稍后重试。如持续出现，请尝试缩短文本或更换标准。",
    };
  }
}

// ═══════════════════════════════════════════════════════════
// 流式优化
// ═══════════════════════════════════════════════════════════

export async function* streamOptimizeEssay(
  text: string,
  style: OptimizeStyle = "daily",
  examType: ExamType = "general",
  intensity: OptimizeIntensity = "medium",
  mode: OptimizeMode = "full",
  contextBefore?: string,
  contextAfter?: string
): AsyncGenerator<string, OptimizeResult, unknown> {
  const systemPrompt = makeOptimizeSystemPrompt(style, examType, intensity, mode);
  const userMessage = buildUserMessage(text, mode, contextBefore, contextAfter);

  const stream = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.6,
    max_tokens: 16384,
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

  const jsonStr = extractJson(fullContent);
  try {
    const parsed = JSON.parse(jsonStr) as OptimizeResult;
    if (!parsed.optimizedText || parsed.optimizedText.trim().length === 0) {
      parsed.optimizedText = text;
    }
    return parsed;
  } catch (e) {
    console.error("streamOptimizeEssay JSON parse error:", e, "\nRaw:", fullContent);
    return {
      optimizedText: text,
      improvements: [],
      grammarNotes: [],
      vocabNotes: [],
      highlights: "AI 返回格式异常，请稍后重试。如持续出现，请尝试缩短文本或更换标准。",
    };
  }
}

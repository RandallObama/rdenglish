import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
});

interface CommonMistake {
  error: string;
  correction: string;
  explanation: string;
}

interface CommonError {
  error: string;
  correction: string;
  explanation: string;
}

interface GrammarNote {
  point: string;
  level: string;
  function: string;
  structure: string;
  explanation: string;
  examples: string[];
  commonMistakes: CommonMistake[];
  examTip?: string;
}

interface VocabNote {
  word: string;
  chinese: string;
  collocations: string[];
  synonyms: string[];
  level: string;
  usage: string;
  examples: string[];
  commonErrors?: CommonError[];
  examFocus?: string;
}

interface TranslationResult {
  english: string;
  grammarNotes: GrammarNote[];
  vocabNotes: VocabNote[];
}

type ExamType = "middle" | "high" | "cet4" | "cet6" | "ielts" | "general";
type WritingStyle = "academic" | "business" | "daily";

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
};

const styleMap: Record<WritingStyle, string> = {
  academic: "学术英语",
  business: "商务英语",
  daily: "日常英语",
};

export async function translateAndAnalyze(
  chineseText: string,
  style: WritingStyle = "daily",
  examType: ExamType = "general"
): Promise<TranslationResult> {
  const exam = examConfig[examType];

  const systemPrompt = `你是一位资深英语教育专家，拥有20年${exam.name}教学经验。用户给你中文文本，请你：

## 任务
1. 将中文翻译成地道的${styleMap[style]}
2. **分析翻译后的英文句子中使用的英语语法**（不是分析中文原文的语法）
3. **解读翻译中出现的英语词汇和短语**（不是分析中文词汇）

## 考试重点
${exam.focus}

## ⚠️ 关键提醒
- 语法分析的对象是**英文译文**中的英语语法现象
- 词汇分析的对象是**英文译文**中出现的英语单词和短语
- 千万不要分析中文原文的语法和词汇
- 所有例句必须是英语句子

## 语法分析要求（分析英文译文中的英语语法，每个语法点必须包含）
- point: 英语语法点名称（如"主谓一致""现在完成时""定语从句"等，用中文写）
- level: 难度级别（"基础"/"进阶"/"高级"）
- function: 该语法在句中的表达功能和修辞效果（至少1句话）
- structure: 结构公式或句式模板，如 "主语 + have/has + 过去分词 + ..."
- explanation: 详细讲解，包含该语法的特点、使用场景、注意事项（至少3句话）
- examples: 提供2-3个英语例句
- commonMistakes: 列出2-3个学生常犯的错误，每个错误必须包含 error(错误句子)、correction(正确句子)、explanation(为什么错，用中文解释)
- examTip: 该语法点在${exam.name}考试中的注意要点（用中文解释）

## 词汇分析要求（分析英文译文中出现的英语词汇，每个词汇必须包含）
- word: 英文译文中的英语单词或短语（不要写中文词）
- chinese: 中文释义
- collocations: 2-3个常用搭配（如 "take measures", "play a role in"）
- synonyms: 1-2个近义词并简述区别
- level: 词汇等级（"${exam.vocabularyLevel}"）
- usage: 详细用法说明，包括适用场景、语体风格、感情色彩（至少2句话）
- examples: 2个英语例句展示不同用法
- commonErrors: 1-2个该词的常见误用案例，每个包含 error(错误用法句子)、correction(正确用法句子)、explanation(为什么是错的，中文解释)
- examFocus: 该词在${exam.name}中的考查方式或易错点

## 输出格式
严格返回以下 JSON（不要 markdown 代码块）:
{
  "english": "翻译后的英文",
  "grammarNotes": [
    {
      "point": "现在完成时",
      "level": "进阶",
      "function": "表示过去动作对现在的影响",
      "structure": "主语 + have/has + 过去分词",
      "explanation": "现在完成时用于连接过去和现在...",
      "examples": ["I have finished my homework.", "She has lived here since 2020."],
      "commonMistakes": [
        {
          "error": "I have saw the movie yesterday.",
          "correction": "I saw the movie yesterday.",
          "explanation": "有具体过去时间(yesterday)时不能用现在完成时，要用一般过去时。"
        }
      ],
      "examTip": "高考常考现在完成时与一般过去时的区别，注意时间状语。"
    }
  ],
  "vocabNotes": [
    {
      "word": "increasingly",
      "chinese": "越来越多地；日益",
      "collocations": ["increasingly important", "increasingly popular"],
      "synonyms": ["more and more (更口语化)", "growingly (较少用)"],
      "level": "四级词汇",
      "usage": "increasingly 是副词，用于修饰形容词或动词，表示程度逐渐增加。多用于书面语和正式文体。",
      "examples": ["Online shopping has become increasingly popular.", "She grew increasingly frustrated with the delay."],
      "commonErrors": [
        {
          "error": "It is increasingly more important.",
          "correction": "It is increasingly important.",
          "explanation": "increasingly 已经含有'越来越'的意思，不能再与 more 连用，这会造成语义重复。"
        }
      ],
      "examFocus": "四级阅读中经常出现，注意与 more and more 的同义替换。"
    }
  ]
}

## 重要原则
- 语法点挑选2-4个最关键的即可，宁缺毋滥，每个深度分析
- 词汇挑选5-7个最有价值的，优先选考试高频词，覆盖不同难度层次
- 例句要自然地道，不要生造
- 讲解语言用中文，便于理解
- 只返回 JSON，不要其他文字`;

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: chineseText },
    ],
    temperature: 0.8,
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
    return JSON.parse(jsonStr) as TranslationResult;
  } catch {
    return {
      english: content,
      grammarNotes: [],
      vocabNotes: [],
    };
  }
}

/**
 * 伴写续写：根据用户已写的中文内容生成续写建议
 */
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

## 续写方向建议（2 个方向各选不同角度）：
- **方向A**：顺承递进 — 沿着上文的思路继续深入或展开
- **方向B**：补充拓展 — 从另一个角度补充论证，或举例说明

## 风格约束
当前写作风格为「${styleName}」，请确保续写符合该风格：
- 日常英语风格对应中文"日常口语化表达，自然亲切"
- 学术英语风格对应中文"严谨规范的论述，用词正式"
- 商务英语风格对应中文"简洁专业的表达，逻辑清晰"

## 输出格式
严格返回以下 JSON（不要 markdown 代码块）:
{
  "suggestions": ["续写方向A的内容", "续写方向B的内容"]
}

## 重要原则
- 续写句子自然流畅，不像是 AI 生成的
- 长度与用户上文的句子长度相匹配
- 不要重复用户已有的内容
- 不要添加总结性或结束性语句（如"总而言之"）
- 只返回 JSON，不要其他文字`;

  const response = await client.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `请根据以下内容生成续写：\n\n${existingText}` },
    ],
    temperature: 1.0,
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content || "";

  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr
      .replace(/```json?\s*\n?/g, "")
      .replace(/```\s*\n?/g, "");
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 2)
        : [],
    };
  } catch {
    // 解析失败时，尝试按行分割作为 fallback
    const lines = content
      .split(/\n/)
      .map((l: string) => l.replace(/^\d+[\.\、\s]+/, "").trim())
      .filter((l: string) => l.length > 10);
    return { suggestions: lines.slice(0, 2) };
  }
}

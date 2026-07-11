/**
 * 每日5词 — AI 逻辑层
 * 负责任务：用户画像推断、词汇生成、造句评价、场景模拟
 */

import { aiClient } from "@/lib/ai-client";
import type { ExamType, WordItem, SentenceEvaluationResult, ScenarioTurnResult } from "@/types";
import type { SSEEvent } from "@/lib/stream";

// ═══════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════
// 话题池（20+ 领域，确保多样性）
// ═══════════════════════════════════════════════════════════

const TOPIC_POOL = [
  "科技与创新", "环境保护与气候变化", "校园与教育", "职业发展与职场",
  "健康与运动", "旅行与文化交流", "美食与烹饪", "时尚与设计",
  "音乐与表演艺术", "电影与影视创作", "社交媒体与数字生活",
  "心理健康与情感", "学习方法与认知科学", "金融与个人理财",
  "体育竞技与团队合作", "太空探索与天文学", "海洋生态与生物多样性",
  "古代文明与考古", "人工智能与伦理", "电子商务与消费趋势",
  "城市规划与建筑", "气候气象与自然灾害", "志愿服务与社会公益",
  "未来趋势与科幻", "家庭关系与代际沟通",
];

/** 完全随机挑选话题 */
function pickTopic(): string {
  return TOPIC_POOL[Math.floor(Math.random() * TOPIC_POOL.length)]!;
}

// ═══════════════════════════════════════════════════════════
// 随机参数池
// ═══════════════════════════════════════════════════════════

const EXAM_TYPES: ExamType[] = ["middle", "high", "cet4", "cet6", "ielts"];
const DIFFICULTIES = ["easy", "medium", "hard"];

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "初级（中考/基础）",
  medium: "中级（高考/CET4）",
  hard: "高级（CET6/雅思/托福）",
};

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ═══════════════════════════════════════════════════════════
// 1. getRandomProfile — 完全随机生成用户画像（不依赖历史记录）
// ═══════════════════════════════════════════════════════════

export interface UserExamProfile {
  examType: ExamType;
  difficulty: string;
}

export function getRandomProfile(): UserExamProfile {
  const examType = randomPick(EXAM_TYPES);
  const difficulty = randomPick(DIFFICULTIES);
  return { examType, difficulty };
}

// ═══════════════════════════════════════════════════════════
// 2. generateWords — 生成同话题 5 个词
// ═══════════════════════════════════════════════════════════

function makeGeneratePrompt(
  topic: string,
  examType: string,
  difficulty: string
): string {
  const diffLabel = DIFFICULTY_LABELS[difficulty] || "中级（高考/CET4）";

  return `你是一位资深英语教师和考试专家，拥有15年英语教学经验。

请围绕话题「${topic}」生成 5 个英语词汇，供学生学习和练习。

## 要求
- 5 个词必须在话题「${topic}」下语义相关
- 难度适配 **${diffLabel}** 级别
- 选词必须 **实用、常用**，不能是生僻词或专业术语
- 每个单词给出常用搭配和完整例句
- 词汇之间最好有内在联系（如同义/反义/词根关联/场景共现）

## 每个词请提供
- word: 单词本身
- chinese: 中文释义
- partOfSpeech: 词性（verb / noun / adjective / adverb / phrase）
- definition: 简短英语定义
- collocations: 3 个常用搭配（词组形式）
- usage: 用法说明（中文，1-2 句话，讲清什么时候用、怎么用）
- example: 一句完整的英语例句，展示该词的自然用法
- etymology: 词源讲解（中文，1-3句话），包含该词的词根（root）、词缀（prefix/suffix）分析，以及相关的同根词举例。例如："pedestrian — ped-（脚）+ -ian（人），同根词：pedal（踏板）、expedite（加速，ex-=向外+ped-=脚→迈步向前）"

## 输出格式（纯 JSON，不要 markdown 代码块）
{
  "topic": "子话题名称（可在主话题下细化）",
  "words": [
    {
      "word": "单词",
      "chinese": "中文释义",
      "partOfSpeech": "词性",
      "definition": "英语定义",
      "collocations": ["搭配1", "搭配2", "搭配3"],
      "usage": "用法说明（中文）",
      "example": "完整英语例句",
      "etymology": "词源讲解（中文）"
    }
  ],
  "difficulty": "${difficulty}"
}`;
}

export async function generateWords(
  topic: string | undefined,
  examType: string,
  difficulty: string
): Promise<{ topic: string; words: WordItem[]; difficulty: string }> {
  const selectedTopic = topic && topic !== "auto" ? topic : pickTopic();

  const systemPrompt = makeGeneratePrompt(selectedTopic, examType, difficulty);

  const response = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `请围绕「${selectedTopic}」生成 5 个英语词汇。` },
    ],
    temperature: 0.8,
    max_tokens: 4096,
  });

  const content = response.choices[0]?.message?.content || "";
  const jsonStr = parseAIJson(content);

  let result: { topic: string; words: WordItem[]; difficulty: string };
  try {
    result = JSON.parse(jsonStr);
  } catch {
    throw new Error(`AI 词汇生成返回格式异常：${content.slice(0, 300)}`);
  }

  // 校验
  if (!result.words || !Array.isArray(result.words) || result.words.length < 5) {
    throw new Error(`AI 未生成足够的词汇（期望 5 个，实际 ${result.words?.length || 0} 个）`);
  }

  // 只取前 5 个
  result.words = result.words.slice(0, 5);

  return {
    topic: result.topic || selectedTopic,
    words: result.words,
    difficulty: result.difficulty || difficulty,
  };
}

// ═══════════════════════════════════════════════════════════
// 2b. streamGenerateWords — 流式版本，逐 chunk 推送
// ═══════════════════════════════════════════════════════════

export async function* streamGenerateWords(
  topic: string | undefined,
  examType: string,
  difficulty: string
): AsyncGenerator<SSEEvent, { topic: string; words: WordItem[]; difficulty: string }, void> {
  const selectedTopic = topic && topic !== "auto" ? topic : pickTopic();
  const systemPrompt = makeGeneratePrompt(selectedTopic, examType, difficulty);

  const stream = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `请围绕「${selectedTopic}」生成 5 个英语词汇。` },
    ],
    temperature: 0.8,
    max_tokens: 4096,
    stream: true,
  });

  let fullContent = "";

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullContent += delta;
      yield { type: "chunk", content: delta };
    }
  }

  const jsonStr = parseAIJson(fullContent);

  let result: { topic: string; words: WordItem[]; difficulty: string };
  try {
    result = JSON.parse(jsonStr);
  } catch {
    throw new Error(`AI 词汇生成返回格式异常：${fullContent.slice(0, 300)}`);
  }

  if (!result.words || !Array.isArray(result.words) || result.words.length < 5) {
    throw new Error(`AI 未生成足够的词汇（期望 5 个，实际 ${result.words?.length || 0} 个）`);
  }

  result.words = result.words.slice(0, 5);

  return {
    topic: result.topic || selectedTopic,
    words: result.words,
    difficulty: result.difficulty || difficulty,
  };
}

// ═══════════════════════════════════════════════════════════
// 3. regenerateWordsSameTopic — 同话题换难度
// ═══════════════════════════════════════════════════════════

export async function regenerateWordsSameTopic(
  topic: string,
  newDifficulty: string,
  examType: string
): Promise<{ topic: string; words: WordItem[]; difficulty: string }> {
  return generateWords(topic, examType, newDifficulty);
}

// ═══════════════════════════════════════════════════════════
// 4. evaluateSentence — 评价用户造句
// ═══════════════════════════════════════════════════════════

function makeEvaluatePrompt(
  word: string,
  chinese: string,
  collocations: string[],
  example: string
): string {
  return `你是一位耐心的英语老师。学生正在练习使用目标词汇造句，请评价学生的句子。

## 目标词汇
- 单词：${word}
- 中文释义：${chinese}
- 常用搭配：${collocations.join("、")}
- 参考例句：${example}

## 评价维度
1. **语义正确性**：句子用这个词表达的意思是否正确、贴切
2. **语法正确性**：句子有没有语法错误
3. **自然度**：句子是否自然地道，像不像母语者会说的话
4. **创意加分**：如果句子有画面感、有深度、有趣或构思巧妙，给额外加分

## 🔴 重要规则（必须遵守）
- **严禁建议用更高级的词汇替换目标词。** 学生就是在练习「${word}」这个词，你只需评价句子本身用得好不好。
- **不要推荐任何同义词、近义词或所谓"更好的词"。**
- 分数为 1-5 整数。
- 评语用中文，2-4 句话，鼓励为主。

## 输出格式（纯 JSON，不要 markdown 代码块）
{
  "score": 4,
  "stars": 4,
  "semanticCorrect": true,
  "grammarCorrect": true,
  "naturalness": "natural",
  "comment": "简短评语（中文）",
  "suggestedImprovement": "改进建议或\"已经很好了\"",
  "creativeBonus": false
}`;
}

export async function evaluateSentence(
  word: string,
  wordInfo: { chinese: string; collocations: string[]; example: string },
  sentence: string
): Promise<SentenceEvaluationResult> {
  const systemPrompt = makeEvaluatePrompt(
    word,
    wordInfo.chinese,
    wordInfo.collocations,
    wordInfo.example
  );

  const response = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: sentence },
    ],
    temperature: 0.1,
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content || "";
  const jsonStr = parseAIJson(content);

  let result: SentenceEvaluationResult;
  try {
    result = JSON.parse(jsonStr) as SentenceEvaluationResult;
  } catch {
    throw new Error(`AI 造句评价返回格式异常：${content.slice(0, 300)}`);
  }

  // 确保分数在有效范围内
  result.score = Math.max(1, Math.min(5, result.score || 3));
  result.stars = result.score;

  return result;
}

// ═══════════════════════════════════════════════════════════
// 4b. streamEvaluateSentence — 流式版本
// ═══════════════════════════════════════════════════════════

export async function* streamEvaluateSentence(
  word: string,
  wordInfo: { chinese: string; collocations: string[]; example: string },
  sentence: string
): AsyncGenerator<SSEEvent, SentenceEvaluationResult, void> {
  const systemPrompt = makeEvaluatePrompt(
    word,
    wordInfo.chinese,
    wordInfo.collocations,
    wordInfo.example
  );

  const stream = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: sentence },
    ],
    temperature: 0.1,
    max_tokens: 1024,
    stream: true,
  });

  let fullContent = "";

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullContent += delta;
      yield { type: "chunk", content: delta };
    }
  }

  const jsonStr = parseAIJson(fullContent);

  let result: SentenceEvaluationResult;
  try {
    result = JSON.parse(jsonStr) as SentenceEvaluationResult;
  } catch {
    throw new Error(`AI 造句评价返回格式异常：${fullContent.slice(0, 300)}`);
  }

  result.score = Math.max(1, Math.min(5, result.score || 3));
  result.stars = result.score;

  return result;
}

// ═══════════════════════════════════════════════════════════
// 5. startScenario — 生成场景 + AI 首轮发言
// ═══════════════════════════════════════════════════════════

function makeScenarioStartPrompt(
  topic: string,
  words: WordItem[]
): string {
  const wordListText = words
    .map((w, i) => `${i + 1}. **${w.word}**（${w.chinese}）— ${w.usage}`)
    .join("\n");

  return `你是一位英语口语陪练，非常热情、耐心、鼓励学生。

## 背景
学生今天学习了话题「${topic}」下的 5 个英语单词。现在需要创建一个真实的对话场景，让学生在对话中 **自然地使用这些词汇**。

## 必须使用的 5 个目标词汇
${wordListText}

## 你的任务
1. **创造一个与话题相关的真实场景**，设定你的角色和场景背景
2. **发出第一句对话**，设置场景并用一个问题开启对话
3. **明牌引导第一个词**：在对话中直接提示学生使用第一个目标词

## 角色和场景设计原则
- 角色要具体（如：咖啡师、面试官、医生、队友、同学、旅伴）
- 场景要贴近真实生活
- 语气友好、自然、鼓励
- 第一轮对话不要超过 3 句话
- 引导方式示例："Can you tell me more? Maybe use the word '${words[0]?.word}' to describe it?"

## 输出格式（纯 JSON，不要 markdown 代码块）
{
  "role": "ai",
  "content": "你的第一轮发言（设置场景 + 提问 + 明牌引导第一个词）",
  "usedWords": [],
  "allUsedWords": [],
  "completed": false
}`;
}

export async function startScenario(
  topic: string,
  words: WordItem[]
): Promise<ScenarioTurnResult> {
  const systemPrompt = makeScenarioStartPrompt(topic, words);

  const response = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `请为话题「${topic}」创建一个英语对话场景，引导我使用这些词汇。` },
    ],
    temperature: 0.8,
    max_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content || "";
  const jsonStr = parseAIJson(content);

  let result: ScenarioTurnResult;
  try {
    result = JSON.parse(jsonStr) as ScenarioTurnResult;
  } catch {
    // 如果 JSON 解析失败，降级为纯文本
    result = {
      role: "ai",
      content: content.slice(0, 500) || "Let's start our conversation!",
      usedWords: [],
      allUsedWords: [],
      completed: false,
    };
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
// 5b. streamStartScenario — 流式版本
// ═══════════════════════════════════════════════════════════

export async function* streamStartScenario(
  topic: string,
  words: WordItem[]
): AsyncGenerator<SSEEvent, ScenarioTurnResult, void> {
  const systemPrompt = makeScenarioStartPrompt(topic, words);

  const stream = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `请为话题「${topic}」创建一个英语对话场景，引导我使用这些词汇。` },
    ],
    temperature: 0.8,
    max_tokens: 2048,
    stream: true,
  });

  let fullContent = "";

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullContent += delta;
      yield { type: "chunk", content: delta };
    }
  }

  const jsonStr = parseAIJson(fullContent);

  let result: ScenarioTurnResult;
  try {
    result = JSON.parse(jsonStr) as ScenarioTurnResult;
  } catch {
    result = {
      role: "ai",
      content: fullContent.slice(0, 500) || "Let's start our conversation!",
      usedWords: [],
      allUsedWords: [],
      completed: false,
    };
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
// 6. continueScenario — 场景对话推进
// ═══════════════════════════════════════════════════════════

function makeScenarioContinuePrompt(
  topic: string,
  words: WordItem[],
  usedWordsList: string[],
  unusedWordsList: string[]
): string {
  const unusedWords = words.filter((w) => !usedWordsList.includes(w.word));
  const nextTarget = unusedWords[0];

  return `你是一位英语口语陪练，正在和学生进行对话练习。

## 背景
- 话题：${topic}
- 学生今天学了 5 个词，需要在对话中全部用上

## 还未使用的词汇
${unusedWords.map((w) => `- **${w.word}**（${w.chinese}）：${w.usage}`).join("\n")}

## 已使用的词汇：${usedWordsList.length > 0 ? usedWordsList.join("、") : "无"}

## 当前目标
引导学生使用 **${nextTarget?.word || "剩余词汇"}**

## 规则
1. **明牌引导**：直接提示学生用目标词，如 "Try using the word '${nextTarget?.word}' to describe your feeling"
2. 如果学生正确使用了目标词，给予积极肯定，然后引导下一个词
3. 如果学生还没用上，继续用不同方式提示
4. 每次回复 2-4 句话，保持对话流畅
5. **一旦全部 5 个词都用上了，立即生成回顾总结**

## 输出格式（纯 JSON，不要 markdown 代码块）
{
  "role": "ai",
  "content": "你的回复内容",
  "usedWords": ["本回合新使用的词汇"],
  "allUsedWords": ["所有已使用词汇的完整列表"],
  "completed": false,
  "review": null
}

如果全部 5 个词都用上了，completed 设为 true，并在 review 中给出简短的综合回顾（中文，3-5 句话，总结学生在对话中运用词汇的表现，指出亮点和可改进之处）。`;
}

export async function continueScenario(
  topic: string,
  words: WordItem[],
  history: ScenarioTurnResult[],
  usedWordsSet: string[]
): Promise<ScenarioTurnResult> {
  const allWords = words.map((w) => w.word);
  const unusedWordsList = allWords.filter((w) => !usedWordsSet.includes(w));

  // 安全兜底：如果全部已使用，直接返回完成
  if (unusedWordsList.length === 0) {
    return {
      role: "ai",
      content:
        "🎉 Amazing! You've successfully used all 5 words in our conversation! Let me give you a quick review of your performance.",
      usedWords: [],
      allUsedWords: usedWordsSet,
      completed: true,
      review:
        "恭喜你完成了全部 5 个词汇的场景练习！你在对话中自然地运用了这些词汇，展现了很好的语言能力。建议你可以再次回顾这些词汇，尝试在更多不同场景中使用它们。",
    };
  }

  const systemPrompt = makeScenarioContinuePrompt(topic, words, usedWordsSet, unusedWordsList);

  // 构建对话历史摘要
  const historySummary = history
    .map((t) => `[${t.role === "ai" ? "AI" : "学生"}]: ${t.content}`)
    .join("\n");

  const response = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `对话历史：\n${historySummary}\n\n请根据上述对话继续推进，引导学生使用剩余的目标词汇。` },
    ],
    temperature: 0.7,
    max_tokens: 2048,
  });

  const content = response.choices[0]?.message?.content || "";
  const jsonStr = parseAIJson(content);

  let result: ScenarioTurnResult;
  try {
    result = JSON.parse(jsonStr) as ScenarioTurnResult;
  } catch {
    result = {
      role: "ai",
      content: content.slice(0, 500) || "Let me think... Can you try again?",
      usedWords: [],
      allUsedWords: usedWordsSet,
      completed: unusedWordsList.length <= 1,
    };
  }

  // 确保 allUsedWords 正确
  if (unusedWordsList.length === 0) {
    result.completed = true;
    result.allUsedWords = allWords;
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
// 6b. streamContinueScenario — 流式版本
// ═══════════════════════════════════════════════════════════

export async function* streamContinueScenario(
  topic: string,
  words: WordItem[],
  history: ScenarioTurnResult[],
  usedWordsSet: string[]
): AsyncGenerator<SSEEvent, ScenarioTurnResult, void> {
  const allWords = words.map((w) => w.word);
  const unusedWordsList = allWords.filter((w) => !usedWordsSet.includes(w));

  if (unusedWordsList.length === 0) {
    const doneResult: ScenarioTurnResult = {
      role: "ai",
      content: "🎉 Amazing! You've successfully used all 5 words!",
      usedWords: [],
      allUsedWords: usedWordsSet,
      completed: true,
      review: "恭喜你完成了全部 5 个词汇的场景练习！",
    };
    yield { type: "chunk", content: doneResult.content };
    return doneResult;
  }

  const systemPrompt = makeScenarioContinuePrompt(topic, words, usedWordsSet, unusedWordsList);
  const historySummary = history
    .map((t) => `[${t.role === "ai" ? "AI" : "学生"}]: ${t.content}`)
    .join("\n");

  const stream = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `对话历史：\n${historySummary}\n\n请根据上述对话继续推进，引导学生使用剩余的目标词汇。` },
    ],
    temperature: 0.7,
    max_tokens: 2048,
    stream: true,
  });

  let fullContent = "";

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullContent += delta;
      yield { type: "chunk", content: delta };
    }
  }

  const jsonStr = parseAIJson(fullContent);

  let result: ScenarioTurnResult;
  try {
    result = JSON.parse(jsonStr) as ScenarioTurnResult;
  } catch {
    result = {
      role: "ai",
      content: fullContent.slice(0, 500) || "Let me think... Can you try again?",
      usedWords: [],
      allUsedWords: usedWordsSet,
      completed: unusedWordsList.length <= 1,
    };
  }

  if (unusedWordsList.length === 0) {
    result.completed = true;
    result.allUsedWords = allWords;
  }

  return result;
}

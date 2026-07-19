/**
 * 周末挑战题目生成 —— 用 DeepSeek 生成真题风格的写作题目。
 */

import { aiClient } from "@/lib/ai-client";
import { prisma } from "@/lib/prisma";

// ── 话题池 ──
const TOPICS_EASY = [
  "校园生活",
  "科技影响",
  "环境保护",
  "社会热点",
  "人生哲理",
  "教育学习",
];

const TOPICS_HARD = [
  "社会议题",
  "教育公平",
  "科技伦理",
  "环境保护与经济发展",
  "全球化与文化认同",
  "政府政策与个人责任",
];

function pickTopic(topics: string[]): string {
  return topics[Math.floor(Math.random() * topics.length)];
}

/** 生成一道挑战题目 */
export async function generateChallenge(
  difficulty: "easy" | "hard"
): Promise<{
  topic: string;
  prompt: string;
  examType: "cet4" | "ielts";
  wordLimit: number;
  timeLimit: number;
}> {
  const isEasy = difficulty === "easy";
  const examType = isEasy ? "cet4" : "ielts";
  const topic = pickTopic(isEasy ? TOPICS_EASY : TOPICS_HARD);

  const systemPrompt = isEasy
    ? makeEasyPrompt()
    : makeHardPrompt();

  const userMessage = `话题：${topic}

请生成一道完整的写作题目。只输出 JSON，不要任何其他内容。`;

  const response = await aiClient.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.8,
    max_tokens: 1024,
  });

  const raw = response.choices[0]?.message?.content || "";
  const jsonStr = extractJson(raw);

  try {
    const parsed = JSON.parse(jsonStr) as { prompt: string };
    return {
      topic,
      prompt: parsed.prompt,
      examType,
      wordLimit: isEasy ? 150 : 250,
      timeLimit: isEasy ? 30 : 40,
    };
  } catch (e) {
    console.error("generateChallenge JSON parse error:", e, "\nRaw[truncated]:", raw.slice(0, 200));
    // 兜底：返回一个基础题目
    return {
      topic,
      prompt: isEasy
        ? `For this part, you are allowed 30 minutes to write a short essay on the topic: "${topic}". You should write at least 120 words but no more than 150 words.`
        : `Write an essay of at least 250 words on the following topic related to "${topic}". Give reasons for your answer and include any relevant examples from your own knowledge or experience.`,
      examType,
      wordLimit: isEasy ? 150 : 250,
      timeLimit: isEasy ? 30 : 40,
    };
  }
}

/** 简单难度 — CET-4 风格 */
function makeEasyPrompt(): string {
  return `你是一位资深大学英语四级考试出题人。请生成一道四级写作真题风格的题目。

## 要求

- 话题偏校园生活、科技影响、环境保护、社会热点、人生哲理或教育学习
- 120-150 词
- 30 分钟
- 题目应包含明确的写作指令和要点提示
- 题目格式参照 CET-4 真题风格：以 "For this part, you are allowed 30 minutes to write..." 开头
- 语言简洁，指令清晰

## 输出格式（纯 JSON）

{
  "prompt": "完整的写作题目文本"
}`;
}

/** 困难难度 — 雅思风格 */
function makeHardPrompt(): string {
  return `你是一位资深雅思考试出题人。请生成一道雅思 Writing Task 2 风格的题目。

## 要求

- 话题偏社会议题、教育、科技伦理、环境、全球化或政府政策
- 250+ 词
- 40 分钟
- 题目应涉及观点讨论、利弊分析或问题解决方案
- 题目格式参照雅思真题风格：陈述一个观点或现象，要求讨论双方观点并给出自己的看法
- 题目要有思辨深度，不能太浅显

## 输出格式（纯 JSON）

{
  "prompt": "完整的写作题目文本"
}`;
}

/** 从 AI 返回值中提取 JSON */
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

/**
 * 生成下周末的全部 4 道题目（周六 easy+hard，周日 easy+hard），
 * 存入数据库，状态 pending_review。
 */
export async function generateWeekendChallenges(
  saturdayDate: string,
  sundayDate: string
): Promise<number> {
  const challenges = [
    { date: saturdayDate, difficulty: "easy" as const },
    { date: saturdayDate, difficulty: "hard" as const },
    { date: sundayDate, difficulty: "easy" as const },
    { date: sundayDate, difficulty: "hard" as const },
  ];

  let count = 0;
  for (const ch of challenges) {
    // 检查是否已存在
    const existing = await prisma.weekendChallenge.findUnique({
      where: { date_difficulty: { date: ch.date, difficulty: ch.difficulty } },
    });
    if (existing) continue;

    const generated = await generateChallenge(ch.difficulty);

    await prisma.weekendChallenge.create({
      data: {
        date: ch.date,
        difficulty: ch.difficulty,
        examType: generated.examType,
        topic: generated.topic,
        prompt: generated.prompt,
        wordLimit: generated.wordLimit,
        timeLimit: generated.timeLimit,
        status: "pending_review",
        source: "ai",
      },
    });
    count++;
  }

  return count;
}

/**
 * 获取下周六和周日的日期字符串。
 * 如果今天是周六，则返回明天（周日）+ 下周六。
 */
export function getNextWeekendDates(): { saturday: string; sunday: string } {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun

  // 下一个周六
  const daysUntilSaturday = 6 - dayOfWeek;
  const saturday = new Date(today);
  if (daysUntilSaturday <= 0) {
    // 今天就是周六或周日 → 取下周
    saturday.setDate(today.getDate() + daysUntilSaturday + 7);
  } else {
    saturday.setDate(today.getDate() + daysUntilSaturday);
  }

  const sunday = new Date(saturday);
  sunday.setDate(saturday.getDate() + 1);

  return {
    saturday: formatDate(saturday),
    sunday: formatDate(sunday),
  };
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

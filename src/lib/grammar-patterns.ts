import { aiClient } from "@/lib/ai-client";
import type { CommonMistake, GrammarExercise } from "@/types";

// ── 趋势计算 ──

/**
 * 根据日期数组计算错误趋势
 * - up: 后半段出现次数 ≥ 前半段 × 1.5（正在恶化）
 * - down: 后半段出现次数 ≤ 前半段 × 0.5（正在改善）
 * - stable: 其余情况
 */
export function computeTrend(dates: string[]): "up" | "down" | "stable" {
  if (dates.length < 3) return "stable";

  const sorted = [...dates].sort(); // 按时间升序
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const firstCount = firstHalf.length;
  const secondCount = secondHalf.length;

  if (secondCount >= firstCount * 1.5) return "up";
  if (secondCount <= firstCount * 0.5) return "down";
  return "stable";
}

// ── JSON 提取 ──

function extractJson(raw: string): string {
  let s = raw.trim();
  // 去掉 markdown 代码块包裹
  s = s.replace(/```json?\s*/gi, "").replace(/```\s*/g, "");
  // 从第一个 { 到最后一个 } 截取
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  return s;
}

// ── 练习题生成 ──

const EXERCISE_SYSTEM_PROMPT = `你是一位经验丰富的高中/大学英语语法老师。用户会给你几个学生常犯的语法点（用中文描述），请你为每个语法点生成针对性的练习题。

## 任务
对每个语法点，生成 3 道练习题。每道题可以是以下两种类型之一：
1. "fill-blank" — 填空题：给出不完整的英文句子，让学生填入正确的词或短语
2. "error-correction" — 改错题：给出一个包含语法错误的英文句子，让学生找出并改正

## 要求
- 题目难度匹配语法点的难度级别（基础/进阶/高级）
- 每道题必须包含一个明确的正确答案和详细的中文解析
- 解析要解释为什么这个答案正确，并指出学生容易犯的错误
- 题目场景尽量贴近考试（中考/高考/四级/六级/雅思）或日常实用场景
- 不要出过于简单或过于生僻的题目
- 每个语法点至少要有 1 道填空和 1 道改错，混合出题

## 输出格式
严格返回 JSON（不要 markdown 代码块）：
{
  "exercises": [
    {
      "type": "fill-blank",
      "question": "完整的英语句子，用 ____ 表示填空位置",
      "answer": "正确答案",
      "explanation": "详细中文解析，解释为什么这个答案正确",
      "point": "对应的语法点名称"
    },
    {
      "type": "error-correction",
      "question": "包含语法错误的英语句子",
      "answer": "改正后的正确句子",
      "explanation": "指出错误原因并解释正确用法",
      "point": "对应的语法点名称"
    }
  ]
}`;

export async function generateExercises(
  points: string[]
): Promise<GrammarExercise[]> {
  if (!points.length) return [];

  const userContent = `请为以下语法点生成练习题：${points.join("、")}
要求：每个语法点 3 道题，混合填空题和改错题。`;

  try {
    const response = await aiClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: EXERCISE_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message?.content || "";
    const jsonStr = extractJson(content);

    const parsed = JSON.parse(jsonStr) as { exercises: GrammarExercise[] };
    return parsed.exercises || [];
  } catch (e) {
    console.error("generateExercises error:", e);
    return [];
  }
}

// ── 聚合辅助 ──

interface RawPatternData {
  dates: string[];
  levels: Set<string>;
  mistakes: CommonMistake[];
}

/**
 * 从 Correction.grammarIssues 构建聚合 Map
 */
export function buildPatternMap(
  corrections: { grammarIssues: string; createdAt: Date }[]
): Map<string, RawPatternData> {
  const map = new Map<string, RawPatternData>();

  for (const record of corrections) {
    let issues: { point?: string; level?: string; commonMistakes?: CommonMistake[] }[] = [];

    try {
      const raw = record.grammarIssues;
      if (raw && raw.trim()) {
        issues = JSON.parse(raw);
      }
    } catch {
      console.warn("Skipping malformed grammarIssues in correction");
      continue;
    }

    const dateStr = record.createdAt.toISOString();

    for (const issue of issues) {
      const point = (issue.point || "").trim();
      if (!point) continue;

      const existing = map.get(point) || {
        dates: [],
        levels: new Set<string>(),
        mistakes: [],
      };

      existing.dates.push(dateStr);
      if (issue.level) existing.levels.add(issue.level);

      // 收集典型错误示例（最多 3 条）
      if (issue.commonMistakes && existing.mistakes.length < 3) {
        for (const m of issue.commonMistakes) {
          if (existing.mistakes.length >= 3) break;
          existing.mistakes.push(m);
        }
      }

      map.set(point, existing);
    }
  }

  return map;
}

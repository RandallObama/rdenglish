import { aiClient } from "@/lib/ai-client";
import type { ReportData } from "@/types";

const INSIGHTS_SYSTEM_PROMPT = `你是一位专业、亲切的英语学习导师。用户会给你一份他/她近期的英语学习数据报告，请你根据数据生成一份个性化的学习总结和建议。

## 报告数据说明
- translationStats: 翻译练习统计（总数、按风格分布、每日次数）
- correctionStats: 作文批改统计（总数、平均分、分数趋势、按考试类型分布）
- grammarPatterns: 语法薄弱点分析（哪个语法点错了几次、趋势是改善还是恶化）
- vocabGrowth: 词汇积累统计（新增词汇数、新增语法笔记数）

## 写作要求
1. **语气亲切鼓励**：像一位关心学生的老师，先肯定进步，再指出不足
2. **数据分析准确**：引用具体数字（如"本周翻译了 12 次"），不要编造数据
3. **具体可操作的建议**：针对薄弱点给出实际的学习建议（如"建议每天做 3 道虚拟语气练习题"）
4. **关注趋势**：如果某个语法点 trend 是 "up"（恶化中），要特别提醒；如果是 "down"（改善中），要表扬
5. **长度控制**：200-400 字中文，结构清晰

## 输出格式
用 Markdown 格式输出，包含以下小节：
### 📊 总体表现
### 🎯 亮点与进步
### ⚠️ 需要关注
### 💡 学习建议`;

/**
 * 解析 JSON 响应，去除 markdown 代码块包裹
 */
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
 * 调用 DeepSeek 生成个性化学习总结
 */
export async function generateReportInsights(reportData: ReportData): Promise<string> {
  // 筛选关键数据发给 AI，避免 token 过长
  const summary = {
    period: {
      type: reportData.period.type,
      startDate: reportData.period.startDate,
      endDate: reportData.period.endDate,
    },
    translation: {
      total: reportData.translationStats.total,
      byStyle: reportData.translationStats.byStyle,
    },
    correction: {
      total: reportData.correctionStats.total,
      averageScore: reportData.correctionStats.averageScore,
      byExamType: reportData.correctionStats.byExamType,
    },
    grammarPatterns: reportData.grammarPatterns.slice(0, 10).map((p) => ({
      point: p.point,
      count: p.count,
      trend: p.trend,
      levels: p.levels,
    })),
    totalGrammarIssues: reportData.totalGrammarIssues,
    vocabGrowth: {
      newWords: reportData.vocabGrowth.newWords,
      newGrammar: reportData.vocabGrowth.newGrammar,
    },
  };

  const userContent = `以下是我的英语学习数据报告（${summary.period.type === "week" ? "本周" : "本月"}），请帮我分析并给出建议：\n\n${JSON.stringify(summary, null, 2)}`;

  try {
    const response = await aiClient.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: INSIGHTS_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.5,
      max_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || "";
    return content.trim();
  } catch (e) {
    console.error("generateReportInsights error:", e);
    throw new Error("AI 总结生成失败，请稍后重试");
  }
}

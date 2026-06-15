import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { consumeUsage } from "@/lib/rate-limit";
import { generateReportInsights } from "@/lib/ai-insights";
import type { ReportData } from "@/types";

// ── POST: AI 学习总结（消耗每日配额 1 次） ──

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const { reportData } = body as { reportData?: ReportData };

    if (!reportData || !reportData.period) {
      return NextResponse.json(
        { error: "请提供完整的学习报告数据" },
        { status: 400 }
      );
    }

    // 消耗每日配额
    const usage = await consumeUsage(userId);
    if (!usage.allowed) {
      return NextResponse.json(
        { error: "今日免费次数已用完" },
        { status: 429 }
      );
    }

    // 调用 AI 生成学习总结
    const insights = await generateReportInsights(reportData);

    return NextResponse.json({
      insights,
      remaining: usage.remaining,
    });
  } catch (error) {
    console.error("Report insights generation error:", error);
    return NextResponse.json(
      { error: "AI 总结生成失败，请稍后重试" },
      { status: 500 }
    );
  }
}

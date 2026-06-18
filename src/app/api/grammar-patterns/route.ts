import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { consumeUsage, checkAiRpm } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { generateExercises, computeTrend, buildPatternMap } from "@/lib/grammar-patterns";
import type { GrammarPattern, GrammarPatternAnalysis } from "@/types";

// ── GET: 错误模式分析（只读，不消耗配额） ──

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // 查所有批改记录，只取 grammmarIssues 和 createdAt
    const corrections = await prisma.correction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        grammarIssues: true,
        createdAt: true,
      },
    });

    // 聚合语法点
    const patternMap = buildPatternMap(corrections);

    // 转换 Map → GrammarPattern[]
    const patterns: GrammarPattern[] = [];

    for (const [point, data] of patternMap) {
      const sortedDates = [...data.dates].sort();
      const trend = computeTrend(sortedDates);
      const firstOccurred = sortedDates[0];
      const lastOccurred = sortedDates[sortedDates.length - 1];
      const firstMs = new Date(firstOccurred).getTime();
      const lastMs = new Date(lastOccurred).getTime();
      const totalSpan = Math.max(0, Math.ceil((lastMs - firstMs) / (1000 * 60 * 60 * 24)));

      patterns.push({
        point,
        count: data.dates.length,
        firstOccurred,
        lastOccurred,
        trend,
        totalSpan,
        avgPerMonth:
          totalSpan > 0
            ? Math.round((data.dates.length / (totalSpan / 30)) * 10) / 10
            : data.dates.length,
        levels: [...data.levels],
        sampleMistakes: data.mistakes,
      });
    }

    // 按出现次数降序
    patterns.sort((a, b) => b.count - a.count);

    // 汇总
    const totalIssues = patterns.reduce((sum, p) => sum + p.count, 0);
    const top = patterns[0] || null;

    const analysis: GrammarPatternAnalysis = {
      patterns,
      totalCorrections: corrections.length,
      totalIssues,
      uniquePoints: patterns.length,
      topPattern: top?.point || null,
      topPatternCount: top?.count || 0,
    };

    return NextResponse.json(analysis, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Grammar patterns analysis error:", error);
    return NextResponse.json(
      { error: "分析出错，请稍后重试" },
      { status: 500 }
    );
  }
}

// ── POST: 生成练习题（消耗每日配额） ──

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;

  // 每分钟 AI 请求节流（所有用户，含 Pro）
  const rpm = checkAiRpm(userId);
  if (!rpm.allowed) {
    return NextResponse.json(
      { error: `请求过于频繁，请 ${rpm.retryAfter} 秒后再试` },
      { status: 429, headers: { "Retry-After": String(rpm.retryAfter) } }
    );
  }

  try {
    const body = await request.json();
    const { points } = body as { points?: string[] };

    if (!Array.isArray(points) || points.length === 0) {
      return NextResponse.json(
        { error: "请选择至少一个语法点" },
        { status: 400 }
      );
    }

    // 限制最多 5 个，防止滥用
    const validPoints = points
      .filter((p) => typeof p === "string" && p.trim().length > 0)
      .slice(0, 5);

    if (validPoints.length === 0) {
      return NextResponse.json(
        { error: "请选择有效的语法点" },
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

    // 调用 AI 生成练习题
    const exercises = await generateExercises(validPoints);

    if (!exercises || exercises.length === 0) {
      return NextResponse.json(
        { error: "生成失败，请稍后重试" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exercises,
      remaining: usage.remaining,
    });
  } catch (error) {
    console.error("Exercise generation error:", error);
    return NextResponse.json(
      { error: "生成出错，请稍后重试" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildReportAggregation } from "@/lib/report-aggregator";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
} from "date-fns";
import type { ReportPeriodType } from "@/types";

// ── GET: 学习报告数据聚合（只读，不消耗配额） ──

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const periodParam = searchParams.get("period") || "week";
  const periodType: ReportPeriodType = ["week", "month", "custom"].includes(periodParam)
    ? (periodParam as ReportPeriodType)
    : "week";

  // 计算日期范围
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (periodType) {
    case "week":
      startDate = startOfWeek(now, { weekStartsOn: 1 }); // 周一
      endDate = endOfWeek(now, { weekStartsOn: 1 });     // 周日
      break;
    case "month":
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case "custom": {
      const startParam = searchParams.get("startDate");
      const endParam = searchParams.get("endDate");
      if (!startParam || !endParam) {
        return NextResponse.json(
          { error: "自定义日期范围需要提供 startDate 和 endDate" },
          { status: 400 }
        );
      }
      startDate = parseISO(startParam);
      endDate = parseISO(endParam);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "日期格式无效，请使用 ISO 格式" },
          { status: 400 }
        );
      }
      break;
    }
    default:
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
  }

  // 把 endDate 调整到当天的 23:59:59
  endDate.setHours(23, 59, 59, 999);

  try {
    // 并行查询所有数据源
    const [writings, corrections, savedWords, savedGrammars] = await Promise.all([
      prisma.writing.findMany({
        where: {
          userId,
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: "asc" },
        select: { style: true, createdAt: true },
      }),
      prisma.correction.findMany({
        where: {
          userId,
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: "asc" },
        select: {
          totalScore: true,
          maxScore: true,
          grammarIssues: true,
          examType: true,
          createdAt: true,
        },
      }),
      prisma.savedWord.findMany({
        where: {
          userId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true },
      }),
      prisma.savedGrammar.findMany({
        where: {
          userId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true },
      }),
    ]);

    const reportData = buildReportAggregation({
      writings,
      corrections,
      savedWords,
      savedGrammars,
      startDate,
      endDate,
      periodType,
    });

    return NextResponse.json(reportData, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    console.error("Report aggregation error:", error);
    return NextResponse.json(
      { error: "报告生成出错，请稍后重试" },
      { status: 500 }
    );
  }
}

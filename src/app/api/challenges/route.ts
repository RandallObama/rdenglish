/**
 * GET /api/challenges — 获取挑战列表
 *
 * 参数：?weekend=2026-06-28（默认取本周六）
 * 返回该周末两天挑战（每天 easy+hard，共 4 道），只返 status=approved（惰性兜底）
 * 同时返回当前用户的提交记录
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);

  // 取指定周六的日期
  const weekendParam = searchParams.get("weekend");
  const saturday = weekendParam || getThisSaturday();

  // 周日 = 周六 + 1
  const sunday = addDays(saturday, 1);

  // 惰性兜底：如果日期已到且仍有 pending_review 的题，自动通过
  const today = getToday();
  if (saturday <= today) {
    await prisma.weekendChallenge.updateMany({
      where: { date: saturday, status: "pending_review" },
      data: { status: "approved" },
    });
  }
  if (sunday <= today) {
    await prisma.weekendChallenge.updateMany({
      where: { date: sunday, status: "pending_review" },
      data: { status: "approved" },
    });
  }

  // 获取挑战
  const challenges = await prisma.weekendChallenge.findMany({
    where: {
      date: { in: [saturday, sunday] },
      status: "approved",
    },
    orderBy: [{ date: "asc" }, { difficulty: "asc" }],
  });

  // 获取当前用户的提交
  const challengeIds = challenges.map((c) => c.id);
  const submissions =
    challengeIds.length > 0
      ? await prisma.challengeSubmission.findMany({
          where: {
            userId,
            challengeId: { in: challengeIds },
          },
          select: {
            id: true,
            challengeId: true,
            score: true,
            maxScore: true,
            wordCount: true,
            timeSpent: true,
            createdAt: true,
          },
        })
      : [];

  // 按 challengeId 建立索引
  const submissionMap: Record<string, typeof submissions[number]> = {};
  for (const s of submissions) {
    submissionMap[s.challengeId] = s;
  }

  return NextResponse.json(
    {
      saturday,
      sunday,
      challenges: challenges.map((c) => ({
        id: c.id,
        date: c.date,
        difficulty: c.difficulty,
        topic: c.topic,
        prompt: c.prompt,
        wordLimit: c.wordLimit,
        timeLimit: c.timeLimit,
        submission: submissionMap[c.id] || null,
      })),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    }
  );
}

// ── 辅助函数 ──

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getThisSaturday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const daysUntilSaturday = 6 - dayOfWeek;

  const saturday = new Date(today);
  if (daysUntilSaturday > 0) {
    // 今天还没到周六 → 取本周六
    saturday.setDate(today.getDate() + daysUntilSaturday);
  } else if (daysUntilSaturday < 0) {
    // 周日 → 取昨天（本周六）
    saturday.setDate(today.getDate() + daysUntilSaturday);
  }
  // daysUntilSaturday === 0 → 今天就是周六

  return saturday.toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * GET /api/vocab/daily/status — 获取今日会话状态
 * 用于页面加载时恢复进度
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;
  const today = new Date().toISOString().slice(0, 10);

  // 自动迁移：确保 Turso 上有 dictationState 列
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "DailyWordSession" ADD COLUMN "dictationState" TEXT`
  ).catch(() => {});

  // 自动迁移：确保 Turso 上有 topicChangeCount 列
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "DailyWordSession" ADD COLUMN "topicChangeCount" INTEGER NOT NULL DEFAULT 0`
  ).catch(() => {});

  const sessionRecord = await prisma.dailyWordSession.findUnique({
    where: { userId_date: { userId, date: today } },
    include: { practices: { orderBy: { wordIndex: "asc" } } },
  });

  if (!sessionRecord) {
    return NextResponse.json({ hasSession: false });
  }

  return NextResponse.json({
    hasSession: true,
    session: {
      id: sessionRecord.id,
      date: sessionRecord.date,
      topic: sessionRecord.topic,
      examType: sessionRecord.examType,
      difficulty: sessionRecord.difficulty,
      status: sessionRecord.status,
      currentWordIndex: sessionRecord.currentWordIndex,
      words: JSON.parse(sessionRecord.words),
      scenarioMessages: sessionRecord.scenarioMessages
        ? JSON.parse(sessionRecord.scenarioMessages)
        : undefined,
      dictationState: sessionRecord.dictationState
        ? JSON.parse(sessionRecord.dictationState)
        : undefined,
      usageConsumed: sessionRecord.usageConsumed,
      topicChangeCount: sessionRecord.topicChangeCount ?? 0,
      practices: sessionRecord.practices.map((p) => ({
        wordIndex: p.wordIndex,
        score: p.aiScore || 0,
        completed: p.userSentence !== null && p.aiScore !== null,
      })),
    },
  });
}

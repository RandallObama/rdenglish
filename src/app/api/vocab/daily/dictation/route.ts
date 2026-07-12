/**
 * PUT /api/vocab/daily/dictation — 保存默写进度 / 标记默写完成
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json();
  const { sessionId, dictationState, completed } = body || {};

  // 自动迁移：确保 Turso 上有 dictationState 列
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "DailyWordSession" ADD COLUMN "dictationState" TEXT`
  ).catch(() => {});

  if (!sessionId) {
    return NextResponse.json({ error: "缺少 sessionId" }, { status: 400 });
  }

  // 验证会话所有权
  const vocabSession = await prisma.dailyWordSession.findUnique({
    where: { id: sessionId },
  });

  if (!vocabSession || vocabSession.userId !== userId) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  // 构建更新数据
  const updateData: Record<string, unknown> = {};

  if (dictationState) {
    updateData.dictationState = JSON.stringify(dictationState);
    // 自动将状态转为 "dictation"（覆盖跳过场景等场景）
    if (
      ["generated", "scenario_ready", "scenario"].includes(vocabSession.status)
    ) {
      updateData.status = "dictation";
    }
  }

  if (completed) {
    updateData.status = "completed";
  }

  await prisma.dailyWordSession.update({
    where: { id: sessionId },
    data: updateData,
  });

  return NextResponse.json({ ok: true });
}

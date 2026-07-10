/**
 * POST /api/vocab/daily/scenario — 启动/推进场景模拟
 * action: "start" | "respond"
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkAiRpm } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { startScenario, continueScenario } from "@/lib/vocab-daily";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;

  // 每分钟 AI 请求节流
  const rpm = checkAiRpm(userId);
  if (!rpm.allowed) {
    return NextResponse.json(
      { error: `请求过于频繁，请 ${rpm.retryAfter} 秒后再试` },
      { status: 429, headers: { "Retry-After": String(rpm.retryAfter) } }
    );
  }

  const body = await request.json();
  const { sessionId, action, message, usedWords: newUsedWords } = body || {};

  if (!sessionId || !action || !["start", "respond"].includes(action)) {
    return NextResponse.json(
      { error: "缺少必要参数（sessionId, action）" },
      { status: 400 }
    );
  }

  // 查询 session
  const vocabSession = await prisma.dailyWordSession.findUnique({
    where: { id: sessionId },
  });

  if (!vocabSession || vocabSession.userId !== userId) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  const words = JSON.parse(vocabSession.words);
  const existingMessages: Array<{ role: string; content: string; usedWords: string[] }> =
    vocabSession.scenarioMessages ? JSON.parse(vocabSession.scenarioMessages) : [];

  try {
    let result;

    if (action === "start") {
      result = await startScenario(vocabSession.topic, words);
      existingMessages.push(result);
    } else {
      // respond — 先记录用户消息
      const userTurn = {
        role: "user",
        content: message || "",
        usedWords: newUsedWords || [],
      };
      existingMessages.push(userTurn);

      // 获取已使用的全部词汇
      const usedWordsSet = new Set<string>();
      existingMessages.forEach((m: any) => {
        (m.usedWords || []).forEach((w: string) => usedWordsSet.add(w));
      });

      result = await continueScenario(
        vocabSession.topic,
        words,
        existingMessages as any,
        Array.from(usedWordsSet)
      );
      existingMessages.push(result);
    }

    // 保存到 session
    await prisma.dailyWordSession.update({
      where: { id: sessionId },
      data: {
        scenarioMessages: JSON.stringify(existingMessages),
        status: result.completed ? "completed" : "scenario",
      },
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[vocab-daily/scenario] Error:", err);
    return NextResponse.json(
      { error: err?.message || "场景模拟失败，请稍后重试" },
      { status: 500 }
    );
  }
}

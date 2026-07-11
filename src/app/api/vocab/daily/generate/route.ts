/**
 * POST /api/vocab/daily/generate — 生成/调整每日 5 词
 * action: "generate" | "adjust"
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkAiRpm } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  getRandomProfile,
  generateWords,
  regenerateWordsSameTopic,
} from "@/lib/vocab-daily";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;
  const today = new Date().toISOString().slice(0, 10);

  // 每分钟 AI 请求节流
  const rpm = checkAiRpm(userId);
  if (!rpm.allowed) {
    return NextResponse.json(
      { error: `请求过于频繁，请 ${rpm.retryAfter} 秒后再试` },
      { status: 429, headers: { "Retry-After": String(rpm.retryAfter) } }
    );
  }

  const body = await request.json();
  const { action, topic: requestTopic, difficulty: requestDifficulty } = body || {};

  if (!action || !["generate", "adjust"].includes(action)) {
    return NextResponse.json(
      { error: "请指定 action（generate 或 adjust）" },
      { status: 400 }
    );
  }

  try {
    // 完全随机生成用户画像（不依赖历史批改记录）
    const profile = getRandomProfile();

    let topic: string;
    let difficulty: string;
    let words;

    if (action === "adjust") {
      // 同话题换难度 — 需要从现有 session 获取话题
      if (!requestDifficulty) {
        return NextResponse.json({ error: "请指定新难度" }, { status: 400 });
      }

      const existingSession = await prisma.dailyWordSession.findUnique({
        where: { userId_date: { userId, date: today } },
      });

      topic = existingSession?.topic || requestTopic || "日常对话";
      difficulty = requestDifficulty;

      words = await regenerateWordsSameTopic(topic, difficulty, profile.examType);
    } else {
      // 全新生成 — 完全随机话题和难度
      topic = "auto";
      difficulty = profile.difficulty;

      words = await generateWords(topic, profile.examType, difficulty);
    }

    // 保存/更新 session
    const sessionRecord = await prisma.dailyWordSession.upsert({
      where: { userId_date: { userId, date: today } },
      create: {
        userId,
        date: today,
        topic: words.topic,
        examType: profile.examType,
        difficulty: words.difficulty,
        words: JSON.stringify(words.words),
        status: "generated",
      },
      update: {
        topic: words.topic,
        difficulty: words.difficulty,
        words: JSON.stringify(words.words),
        status: "generated",
        currentWordIndex: 0,
        scenarioMessages: null,
      },
    });

    return NextResponse.json({
      sessionId: sessionRecord.id,
      topic: words.topic,
      difficulty: words.difficulty,
      examType: profile.examType,
      words: words.words,
    });
  } catch (err: any) {
    console.error("[vocab-daily/generate] Error:", err);
    return NextResponse.json(
      { error: err?.message || "生成词汇失败，请稍后重试" },
      { status: 500 }
    );
  }
}

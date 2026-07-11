/**
 * POST /api/vocab/daily/generate — 生成/调整每日 5 词（generate 模式 SSE 流式）
 * action: "generate" | "adjust"
 */

import { auth } from "@/lib/auth";
import { checkAiRpm } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  getRandomProfile,
  streamGenerateWords,
  regenerateWordsSameTopic,
} from "@/lib/vocab-daily";
import { createSSEResponse } from "@/lib/stream";
import type { WordItem } from "@/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "请先登录" }), { status: 401 });
  }

  const userId = session.user.id;
  const today = new Date().toISOString().slice(0, 10);

  // 每分钟 AI 请求节流
  const rpm = checkAiRpm(userId);
  if (!rpm.allowed) {
    return new Response(
      JSON.stringify({ error: `请求过于频繁，请 ${rpm.retryAfter} 秒后再试` }),
      { status: 429, headers: { "Retry-After": String(rpm.retryAfter) } }
    );
  }

  const body = await request.json();
  const { action, topic: requestTopic, difficulty: requestDifficulty } = body || {};

  if (!action || !["generate", "adjust"].includes(action)) {
    return new Response(
      JSON.stringify({ error: "请指定 action（generate 或 adjust）" }),
      { status: 400 }
    );
  }

  const profile = getRandomProfile();

  // adjust 模式：同话题换难度（非流式，数据量小）
  if (action === "adjust") {
    if (!requestDifficulty) {
      return new Response(
        JSON.stringify({ error: "请指定新难度" }),
        { status: 400 }
      );
    }

    try {
      const existingSession = await prisma.dailyWordSession.findUnique({
        where: { userId_date: { userId, date: today } },
      });

      const topic = existingSession?.topic || requestTopic || "日常对话";
      const difficulty = requestDifficulty;
      const words = await regenerateWordsSameTopic(topic, difficulty, profile.examType);

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

      return new Response(
        JSON.stringify({
          sessionId: sessionRecord.id,
          topic: words.topic,
          difficulty: words.difficulty,
          examType: profile.examType,
          words: words.words,
        }),
        { status: 200 }
      );
    } catch (err: any) {
      console.error("[vocab-daily/generate] Error:", err);
      return new Response(
        JSON.stringify({ error: err?.message || "调整词汇失败" }),
        { status: 500 }
      );
    }
  }

  // generate 模式：SSE 流式返回
  return createSSEResponse(async (send) => {
    const iter = streamGenerateWords("auto", profile.examType, profile.difficulty);

    let finalResult: { topic: string; words: WordItem[]; difficulty: string } | undefined;

    try {
      // 消费异步生成器：推送 chunk 事件，捕获最终 return 值
      let next = await iter.next();
      while (!next.done) {
        if (next.value.type === "chunk") send(next.value);
        next = await iter.next();
      }
      finalResult = next.value;

      if (!finalResult || !finalResult.words || finalResult.words.length < 5) {
        throw new Error("词汇生成失败：AI 未返回足够词汇");
      }

      // 保存到数据库
      const sessionRecord = await prisma.dailyWordSession.upsert({
        where: { userId_date: { userId, date: today } },
        create: {
          userId,
          date: today,
          topic: finalResult.topic,
          examType: profile.examType,
          difficulty: finalResult.difficulty,
          words: JSON.stringify(finalResult.words),
          status: "generated",
        },
        update: {
          topic: finalResult.topic,
          difficulty: finalResult.difficulty,
          words: JSON.stringify(finalResult.words),
          status: "generated",
          currentWordIndex: 0,
          scenarioMessages: null,
        },
      });

      send({
        type: "done",
        result: {
          sessionId: sessionRecord.id,
          topic: finalResult.topic,
          difficulty: finalResult.difficulty,
          examType: profile.examType,
          words: finalResult.words,
        },
      });
    } catch (err: any) {
      console.error("[vocab-daily/generate] SSE Error:", err);
      send({ type: "error", message: err?.message || "生成词汇失败，请稍后重试" });
    }
  });
}

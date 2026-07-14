/**
 * POST /api/vocab/daily/generate — 生成/调整每日 5 词（generate 模式 SSE 流式）
 * action: "generate" | "adjust"
 */

import { auth } from "@/lib/auth";
import { checkAiRpm } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  getRandomProfile,
  getProfileFromLevel,
  streamGenerateWords,
  regenerateWordsSameTopic,
  pickTopicExcluding,
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

  if (!action || !["generate", "adjust", "change_topic"].includes(action)) {
    return new Response(
      JSON.stringify({ error: "请指定 action（generate、adjust 或 change_topic）" }),
      { status: 400 }
    );
  }

  // 读取用户英语水平，有则用水平映射，无则随机
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { englishLevel: true },
  });
  const profile = user?.englishLevel
    ? getProfileFromLevel(user.englishLevel)
    : getRandomProfile();

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
          dictationState: null,
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

  // change_topic 模式：换话题保持同难度（SSE 流式）
  if (action === "change_topic") {
    // Turso 自动迁移：确保 topicChangeCount 列存在
    try {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE DailyWordSession ADD COLUMN topicChangeCount INTEGER NOT NULL DEFAULT 0`
      );
    } catch (_) { /* 列已存在 */ }

    const existingSession = await prisma.dailyWordSession.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    if (!existingSession) {
      return new Response(
        JSON.stringify({ error: "还没有生成词汇，请先生成" }),
        { status: 400 }
      );
    }

    const currentCount = existingSession.topicChangeCount ?? 0;
    if (currentCount >= 3) {
      return new Response(
        JSON.stringify({ error: "今日换话题次数已用完（每日 3 次）" }),
        { status: 429 }
      );
    }

    const currentTopic = existingSession.topic;
    const currentDifficulty = existingSession.difficulty;
    const newTopic = pickTopicExcluding(currentTopic);

    return createSSEResponse(async (send) => {
      const iter = streamGenerateWords(newTopic, profile.examType, currentDifficulty);

      let finalResult: { topic: string; words: WordItem[]; difficulty: string } | undefined;

      try {
        let next = await iter.next();
        while (!next.done) {
          if (next.value.type === "chunk") send(next.value);
          next = await iter.next();
        }
        finalResult = next.value;

        if (!finalResult || !finalResult.words || finalResult.words.length < 5) {
          throw new Error("词汇生成失败：AI 未返回足够词汇");
        }

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
            topicChangeCount: 1,
          },
          update: {
            topic: finalResult.topic,
            words: JSON.stringify(finalResult.words),
            status: "generated",
            currentWordIndex: 0,
            scenarioMessages: null,
            dictationState: null,
            topicChangeCount: currentCount + 1,
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
            topicChangeCount: currentCount + 1,
          },
        });
      } catch (err: any) {
        console.error("[vocab-daily/generate] change_topic SSE Error:", err);
        send({ type: "error", message: err?.message || "换话题失败，请稍后重试" });
      }
    });
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
          dictationState: null,
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

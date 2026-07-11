/**
 * POST /api/vocab/daily/practice — 提交造句，AI 评价（SSE 流式）
 */

import { auth } from "@/lib/auth";
import { consumeUsage, checkAiRpm } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { streamEvaluateSentence } from "@/lib/vocab-daily";
import { createSSEResponse } from "@/lib/stream";

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
  const { sessionId, wordIndex, sentence } = body || {};

  if (!sessionId || wordIndex === undefined || !sentence?.trim()) {
    return new Response(
      JSON.stringify({ error: "缺少必要参数（sessionId, wordIndex, sentence）" }),
      { status: 400 }
    );
  }

  // 查询 session
  const vocabSession = await prisma.dailyWordSession.findUnique({
    where: { id: sessionId },
  });

  if (!vocabSession || vocabSession.userId !== userId) {
    return new Response(JSON.stringify({ error: "会话不存在" }), { status: 404 });
  }

  // 第一次提交造句时消耗使用额度
  if (!vocabSession.usageConsumed) {
    const usage = await consumeUsage(userId);
    if (!usage.allowed) {
      return new Response(
        JSON.stringify({ error: `今日免费次数已用完（${usage.limit} 次）。明天再来吧！` }),
        { status: 429 }
      );
    }
    await prisma.dailyWordSession.update({
      where: { id: sessionId },
      data: { usageConsumed: true },
    });
  }

  const words = JSON.parse(vocabSession.words);

  if (wordIndex < 0 || wordIndex >= words.length) {
    return new Response(
      JSON.stringify({ error: `无效的单词索引：${wordIndex}` }),
      { status: 400 }
    );
  }

  const currentWord = words[wordIndex];
  if (!currentWord) {
    return new Response(JSON.stringify({ error: "找不到目标单词" }), { status: 400 });
  }

  // 使用 SSE 流式返回评价
  return createSSEResponse(async (send) => {
    try {
      const iter = streamEvaluateSentence(
        currentWord.word,
        {
          chinese: currentWord.chinese,
          collocations: currentWord.collocations || [],
          example: currentWord.example || "",
        },
        sentence.trim()
      );

      let next = await iter.next();
      while (!next.done) {
        if (next.value.type === "chunk") send(next.value);
        next = await iter.next();
      }
      const evaluation = next.value;

      if (!evaluation) {
        throw new Error("评价失败");
      }

      // 保存练习记录
      const existingPractice = await prisma.wordPractice.findFirst({
        where: { sessionId, wordIndex },
      });

      if (existingPractice) {
        await prisma.wordPractice.update({
          where: { id: existingPractice.id },
          data: {
            userSentence: sentence.trim(),
            aiScore: evaluation.score,
            aiComment: evaluation.comment,
            naturalness: evaluation.naturalness,
            grammarOk: evaluation.grammarCorrect,
            fullResponse: JSON.stringify(evaluation),
          },
        });
      } else {
        await prisma.wordPractice.create({
          data: {
            sessionId,
            word: currentWord.word,
            wordIndex,
            userSentence: sentence.trim(),
            aiScore: evaluation.score,
            aiComment: evaluation.comment,
            naturalness: evaluation.naturalness,
            grammarOk: evaluation.grammarCorrect,
            fullResponse: JSON.stringify(evaluation),
          },
        });
      }

      // 更新 session 进度
      const isLastWord = wordIndex >= 4;
      await prisma.dailyWordSession.update({
        where: { id: sessionId },
        data: {
          currentWordIndex: wordIndex,
          status: isLastWord ? "scenario_ready" : "practicing",
        },
      });

      send({
        type: "done",
        result: {
          ...evaluation,
          isLastWord,
          nextWordIndex: isLastWord ? null : wordIndex + 1,
        },
      });
    } catch (err: any) {
      console.error("[vocab-daily/practice] SSE Error:", err);
      send({ type: "error", message: err?.message || "评价失败，请稍后重试" });
    }
  });
}

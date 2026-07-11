/**
 * POST /api/vocab/daily/scenario — 启动/推进场景模拟（SSE 流式）
 * action: "start" | "respond"
 */

import { auth } from "@/lib/auth";
import { checkAiRpm } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { streamStartScenario, streamContinueScenario } from "@/lib/vocab-daily";
import { createSSEResponse } from "@/lib/stream";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "请先登录" }), { status: 401 });
  }

  const userId = session.user.id;

  // 每分钟 AI 请求节流
  const rpm = checkAiRpm(userId);
  if (!rpm.allowed) {
    return new Response(
      JSON.stringify({ error: `请求过于频繁，请 ${rpm.retryAfter} 秒后再试` }),
      { status: 429, headers: { "Retry-After": String(rpm.retryAfter) } }
    );
  }

  const body = await request.json();
  const { sessionId, action, message, usedWords: newUsedWords } = body || {};

  if (!sessionId || !action || !["start", "respond"].includes(action)) {
    return new Response(
      JSON.stringify({ error: "缺少必要参数（sessionId, action）" }),
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

  const words = JSON.parse(vocabSession.words);
  const existingMessages: Array<{ role: string; content: string; usedWords: string[] }> =
    vocabSession.scenarioMessages ? JSON.parse(vocabSession.scenarioMessages) : [];

  // 使用 SSE 流式返回场景对话
  return createSSEResponse(async (send) => {
    try {
      let result;

      if (action === "start") {
        const iter = streamStartScenario(vocabSession.topic, words);

        let next = await iter.next();
        while (!next.done) {
          if (next.value.type === "chunk") send(next.value);
          next = await iter.next();
        }
        result = next.value;
        existingMessages.push(result);
      } else {
        // respond — 先记录用户消息
        const userTurn = {
          role: "user",
          content: message || "",
          usedWords: newUsedWords || [],
        };
        existingMessages.push(userTurn);

        // 获取已使用的全部词汇（只信任 AI 判定，用户消息中的 usedWords 不做为权威来源）
        const usedWordsSet = new Set<string>();
        existingMessages.forEach((m: any) => {
          if (m.role === "ai") {
            (m.usedWords || []).forEach((w: string) => usedWordsSet.add(w));
          }
        });

        const iter = streamContinueScenario(
          vocabSession.topic,
          words,
          existingMessages as any,
          Array.from(usedWordsSet)
        );

        let next = await iter.next();
        while (!next.done) {
          if (next.value.type === "chunk") send(next.value);
          next = await iter.next();
        }
        result = next.value;
        existingMessages.push(result);
      }

      if (!result) {
        throw new Error("场景对话生成失败");
      }

      // 保存到 session
      await prisma.dailyWordSession.update({
        where: { id: sessionId },
        data: {
          scenarioMessages: JSON.stringify(existingMessages),
          status: result.completed ? "completed" : "scenario",
        },
      });

      send({ type: "done", result });
    } catch (err: any) {
      console.error("[vocab-daily/scenario] SSE Error:", err);
      send({ type: "error", message: err?.message || "场景模拟失败，请稍后重试" });
    }
  });
}

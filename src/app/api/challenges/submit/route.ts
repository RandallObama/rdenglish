/**
 * POST /api/challenges/submit — 提交作文进行批改
 *
 * Body: { challengeId, content, timeSpent }
 * SSE 返回流式批改结果，复用 streamCorrectEssay()
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { streamCorrectEssay } from "@/lib/correct";
import { consumeUsage, checkAiRpm } from "@/lib/rate-limit";
import { createSSEResponse } from "@/lib/stream";
import type { CorrectionResult } from "@/types";

export const maxDuration = 180;

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

  // 消耗每日免费次数
  const usage = await consumeUsage(userId);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: "今日免费次数已用完" },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { challengeId, content, timeSpent } = body;

    if (!challengeId) {
      return NextResponse.json({ error: "缺少挑战 ID" }, { status: 400 });
    }

    if (!content || typeof content !== "string" || content.trim().length < 10) {
      return NextResponse.json(
        { error: "作文内容太短，请至少写 10 个字符" },
        { status: 400 }
      );
    }

    // 校验挑战存在且已 approved
    const challenge = await prisma.weekendChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge || challenge.status !== "approved") {
      return NextResponse.json(
        { error: "挑战不存在或已过期" },
        { status: 404 }
      );
    }

    // 检查是否已提交
    const existing = await prisma.challengeSubmission.findUnique({
      where: {
        userId_challengeId: { userId, challengeId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "你已经提交过这道题了" },
        { status: 409 }
      );
    }

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const examType = challenge.examType as "cet4" | "ielts";

    // ── 流式路径 ──
    return createSSEResponse(async (send) => {
      const iter = streamCorrectEssay(content.trim(), examType);
      let result: CorrectionResult | null = null;

      const gen = iter[Symbol.asyncIterator]();
      while (true) {
        const { value, done } = await gen.next();
        if (done) {
          result = value as CorrectionResult;
          break;
        }
        send({ type: "chunk", content: value as string });
      }

      if (!result) {
        send({ type: "error", message: "AI 返回为空" });
        return;
      }

      // 保存提交
      const saved = await prisma.challengeSubmission.create({
        data: {
          userId,
          challengeId,
          content: content.trim(),
          score: result.totalScore,
          maxScore: result.maxScore,
          scores: JSON.stringify(result.scores),
          feedback: JSON.stringify(result),
          wordCount,
          timeSpent: timeSpent || null,
        },
      });

      send({
        type: "done",
        result: {
          id: saved.id,
          challengeId,
          score: result.totalScore,
          maxScore: result.maxScore,
          scores: result.scores,
          sentenceCorrections: result.sentenceCorrections,
          grammarIssues: result.grammarIssues,
          vocabSuggestions: result.vocabSuggestions,
          improvementSuggestions: result.improvementSuggestions,
          overallComment: result.overallComment,
          scoringRationale: result.scoringRationale,
          wordCount,
          timeSpent: timeSpent || null,
          remaining: usage.remaining,
        },
        remaining: usage.remaining,
      });
    });
  } catch (error) {
    console.error("Challenge submit error:", error);
    return NextResponse.json(
      { error: "批改出错，请稍后重试" },
      { status: 500 }
    );
  }
}

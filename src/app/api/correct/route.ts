import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { correctEssay, streamCorrectEssay } from "@/lib/correct";
import { consumeUsage } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createSSEResponse } from "@/lib/stream";
import type { ExamType } from "@/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;
  const usage = await consumeUsage(userId);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: "今日免费次数已用完" },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { essay, examType = "general", stream = true } = body;

    if (!essay || typeof essay !== "string" || essay.trim().length === 0) {
      return NextResponse.json({ error: "请输入作文内容" }, { status: 400 });
    }

    if (essay.length > 5000) {
      return NextResponse.json({ error: "作文过长，请限制在5000字以内" }, { status: 400 });
    }

    const validExamTypes: ExamType[] = [
      "middle", "high", "cet4", "cet6", "ielts", "general",
    ];
    const safeExamType = validExamTypes.includes(examType as ExamType)
      ? (examType as ExamType)
      : "general";

    // ── 流式路径 ──
    if (stream) {
      return createSSEResponse(async (send) => {
        const iter = streamCorrectEssay(essay.trim(), safeExamType);
        let result: Awaited<ReturnType<typeof correctEssay>> | null = null;

        const gen = iter[Symbol.asyncIterator]();
        while (true) {
          const { value, done } = await gen.next();
          if (done) {
            result = value as Awaited<ReturnType<typeof correctEssay>>;
            break;
          }
          send({ type: "chunk", content: value as string });
        }

        if (!result) {
          send({ type: "error", message: "AI 返回为空" });
          return;
        }

        await prisma.correction.create({
          data: {
            userId: userId,
            essayText: essay.trim(),
            examType: safeExamType,
            totalScore: result.totalScore,
            maxScore: result.maxScore,
            scores: JSON.stringify(result.scores),
            sentenceCorrections: JSON.stringify(result.sentenceCorrections),
            grammarIssues: JSON.stringify(result.grammarIssues),
            vocabSuggestions: JSON.stringify(result.vocabSuggestions),
            improvementSuggestions: JSON.stringify(result.improvementSuggestions),
            overallComment: result.overallComment,
          },
        });

        send({
          type: "done",
          result: { ...result, remaining: usage.remaining },
          remaining: usage.remaining,
        });
      });
    }

    // ── 非流式兼容路径 ──
    const result = await correctEssay(essay.trim(), safeExamType);

    await prisma.correction.create({
      data: {
        userId: userId,
        essayText: essay.trim(),
        examType: safeExamType,
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        scores: JSON.stringify(result.scores),
        sentenceCorrections: JSON.stringify(result.sentenceCorrections),
        grammarIssues: JSON.stringify(result.grammarIssues),
        vocabSuggestions: JSON.stringify(result.vocabSuggestions),
        improvementSuggestions: JSON.stringify(result.improvementSuggestions),
        overallComment: result.overallComment,
      },
    });

    return NextResponse.json({ ...result, remaining: usage.remaining });
  } catch (error) {
    console.error("Correction error:", error);
    return NextResponse.json(
      { error: "批改出错，请稍后重试" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(30, Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10)));
  const skip = (page - 1) * pageSize;

  const [corrections, total] = await Promise.all([
    prisma.correction.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        essayText: true,
        examType: true,
        totalScore: true,
        scores: true,
        sentenceCorrections: true,
        grammarIssues: true,
        vocabSuggestions: true,
        improvementSuggestions: true,
        overallComment: true,
        createdAt: true,
      },
      skip,
      take: pageSize,
    }),
    prisma.correction.count({
      where: { userId: userId },
    }),
  ]);

  return NextResponse.json(
    {
      items: corrections.map((c) => ({
        ...c,
        scores: c.scores ? JSON.parse(c.scores) : null,
        sentenceCorrections: c.sentenceCorrections ? JSON.parse(c.sentenceCorrections) : [],
        grammarIssues: c.grammarIssues ? JSON.parse(c.grammarIssues) : [],
        vocabSuggestions: c.vocabSuggestions ? JSON.parse(c.vocabSuggestions) : [],
        improvementSuggestions: c.improvementSuggestions ? JSON.parse(c.improvementSuggestions) : [],
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=30",
      },
    }
  );
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { correctEssay } from "@/lib/correct";
import { checkUsage, incrementUsage } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import type { ExamType } from "@/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { remaining } = await checkUsage(session.user.id);
  if (remaining <= 0) {
    return NextResponse.json(
      { error: "今日免费次数已用完" },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { essay, examType = "general" } = body;

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

    const result = await correctEssay(essay.trim(), safeExamType);

    // 存数据库
    await prisma.correction.create({
      data: {
        userId: session.user.id,
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

    await incrementUsage(session.user.id);
    const { remaining: newRemaining } = await checkUsage(session.user.id);

    return NextResponse.json({ ...result, remaining: newRemaining });
  } catch (error) {
    console.error("Correction error:", error);
    return NextResponse.json(
      { error: "批改出错，请稍后重试" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const corrections = await prisma.correction.findMany({
    where: { userId: session.user.id },
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
    take: 30,
  });

  return NextResponse.json(
    corrections.map((c) => ({
      ...c,
      scores: c.scores ? JSON.parse(c.scores) : null,
      sentenceCorrections: c.sentenceCorrections ? JSON.parse(c.sentenceCorrections) : [],
      grammarIssues: c.grammarIssues ? JSON.parse(c.grammarIssues) : [],
      vocabSuggestions: c.vocabSuggestions ? JSON.parse(c.vocabSuggestions) : [],
      improvementSuggestions: c.improvementSuggestions ? JSON.parse(c.improvementSuggestions) : [],
    }))
  );
}

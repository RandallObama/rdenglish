/**
 * GET /api/challenges/submissions/[id] — 获取单条提交的完整详情（含 feedback）
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;

  const submission = await prisma.challengeSubmission.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      challengeId: true,
      content: true,
      score: true,
      maxScore: true,
      scores: true,
      feedback: true,
      wordCount: true,
      timeSpent: true,
      createdAt: true,
      challenge: {
        select: {
          date: true,
          difficulty: true,
          topic: true,
          prompt: true,
          wordLimit: true,
          timeLimit: true,
        },
      },
    },
  });

  if (!submission || submission.userId !== session.user.id) {
    return NextResponse.json({ error: "提交不存在" }, { status: 404 });
  }

  return NextResponse.json(
    {
      ...submission,
      scores: submission.scores ? JSON.parse(submission.scores) : null,
      feedback: submission.feedback ? JSON.parse(submission.feedback) : null,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    }
  );
}

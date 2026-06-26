/**
 * GET /api/challenges/submissions — 获取当前用户的历史提交
 *
 * 参数：?page=1&pageSize=10
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const [submissions, total] = await Promise.all([
    prisma.challengeSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        challengeId: true,
        score: true,
        maxScore: true,
        scores: true,
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
      skip,
      take: pageSize,
    }),
    prisma.challengeSubmission.count({ where: { userId } }),
  ]);

  return NextResponse.json(
    {
      items: submissions.map((s) => ({
        ...s,
        scores: s.scores ? JSON.parse(s.scores) : null,
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

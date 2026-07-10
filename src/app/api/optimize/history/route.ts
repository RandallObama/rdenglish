import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

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

  const [optimizations, total] = await Promise.all([
    prisma.optimization.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        originalText: true,
        optimizedText: true,
        style: true,
        examType: true,
        intensity: true,
        mode: true,
        improvements: true,
        grammarNotes: true,
        vocabNotes: true,
        highlights: true,
        transitionAnalysis: true,
        createdAt: true,
      },
      skip,
      take: pageSize,
    }),
    prisma.optimization.count({
      where: { userId: userId },
    }),
  ]);

  return NextResponse.json(
    {
      items: optimizations.map((o) => ({
        ...o,
        improvements: safeJsonParse(o.improvements, []),
        grammarNotes: safeJsonParse(o.grammarNotes, []),
        vocabNotes: safeJsonParse(o.vocabNotes, []),
        transitionAnalysis: safeJsonParse(o.transitionAnalysis, null),
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

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

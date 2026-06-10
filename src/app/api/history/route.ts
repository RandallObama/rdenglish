import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_HEADER = { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" };

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
  const skip = (page - 1) * pageSize;

  const [writings, total] = await Promise.all([
    prisma.writing.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sourceText: true,
        resultText: true,
        style: true,
        grammarNotes: true,
        vocabNotes: true,
        createdAt: true,
      },
      skip,
      take: pageSize,
    }),
    prisma.writing.count({
      where: { userId: session.user.id },
    }),
  ]);

  return NextResponse.json(
    {
      items: writings.map((w) => ({
        ...w,
        grammarNotes: w.grammarNotes ? JSON.parse(w.grammarNotes) : [],
        vocabNotes: w.vocabNotes ? JSON.parse(w.vocabNotes) : [],
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    { headers: CACHE_HEADER }
  );
}

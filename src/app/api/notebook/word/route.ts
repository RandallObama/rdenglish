import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_HEADER = { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const words = await prisma.savedWord.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(
    words.map((w) => ({
      id: w.id,
      word: w.word,
      chinese: w.chinese,
      collocations: w.collocations ? JSON.parse(w.collocations) : [],
      synonyms: w.synonyms ? JSON.parse(w.synonyms) : [],
      level: w.level || "",
      usage: w.usage || "",
      examples: w.examples ? JSON.parse(w.examples) : [],
      commonErrors: w.commonErrors ? JSON.parse(w.commonErrors) : [],
      examFocus: w.examFocus || "",
      source: w.source,
      createdAt: w.createdAt.toISOString(),
    })),
    { headers: CACHE_HEADER }
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = await request.json();
  const { word, chinese, source = "translate" } = body;

  if (!word) {
    return NextResponse.json({ error: "缺少单词" }, { status: 400 });
  }

  // 检查是否已收藏
  const existing = await prisma.savedWord.findFirst({
    where: { userId: session.user.id, word },
  });

  if (existing) {
    return NextResponse.json({ error: "该单词已收藏" }, { status: 409 });
  }

  const saved = await prisma.savedWord.create({
    data: {
      userId: session.user.id,
      word,
      chinese: chinese || "",
      collocations: body.collocations ? JSON.stringify(body.collocations) : null,
      synonyms: body.synonyms ? JSON.stringify(body.synonyms) : null,
      level: body.level || "",
      usage: body.usage || "",
      examples: body.examples ? JSON.stringify(body.examples) : null,
      commonErrors: body.commonErrors ? JSON.stringify(body.commonErrors) : null,
      examFocus: body.examFocus || "",
      source,
    },
  });

  return NextResponse.json({ id: saved.id, success: true });
}

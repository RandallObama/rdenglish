import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_HEADER = { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const items = await prisma.savedGrammar.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(
    items.map((g) => ({
      id: g.id,
      point: g.point,
      level: g.level || "",
      function: g.function || "",
      structure: g.structure || "",
      explanation: g.explanation || "",
      examples: g.examples ? JSON.parse(g.examples) : [],
      commonMistakes: g.commonMistakes ? JSON.parse(g.commonMistakes) : [],
      examTip: g.examTip || "",
      source: g.source,
      createdAt: g.createdAt.toISOString(),
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
  const { point, source = "translate" } = body;

  if (!point) {
    return NextResponse.json({ error: "缺少语法点名称" }, { status: 400 });
  }

  // 检查是否已收藏
  const existing = await prisma.savedGrammar.findFirst({
    where: { userId: session.user.id, point },
  });

  if (existing) {
    return NextResponse.json({ error: "该语法点已收藏" }, { status: 409 });
  }

  const saved = await prisma.savedGrammar.create({
    data: {
      userId: session.user.id,
      point,
      level: body.level || "",
      function: body.function || "",
      structure: body.structure || "",
      explanation: body.explanation || "",
      examples: body.examples ? JSON.stringify(body.examples) : null,
      commonMistakes: body.commonMistakes
        ? JSON.stringify(body.commonMistakes)
        : null,
      examTip: body.examTip || "",
      source,
    },
  });

  return NextResponse.json({ id: saved.id, success: true });
}

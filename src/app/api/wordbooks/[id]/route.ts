import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_HEADER = { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" };

/** 获取单词本详情（含单词列表和成员列表） */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  // 验证用户是成员
  const membership = await prisma.wordbookMember.findUnique({
    where: { wordbookId_userId: { wordbookId: id, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "无权访问该单词本" }, { status: 403 });
  }

  const wordbook = await prisma.wordbook.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
      members: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      },
      words: {
        include: { addedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { members: true, words: true } },
    },
  });

  if (!wordbook) {
    return NextResponse.json({ error: "单词本不存在" }, { status: 404 });
  }

  return NextResponse.json(
    {
      id: wordbook.id,
      name: wordbook.name,
      creatorId: wordbook.creatorId,
      creatorName: wordbook.creator.name,
      memberCount: wordbook._count.members,
      wordCount: wordbook._count.words,
      isOwner: wordbook.creatorId === userId,
      createdAt: wordbook.createdAt.toISOString(),
      words: wordbook.words.map((w) => ({
        id: w.id,
        word: w.word,
        chinese: w.chinese,
        phoneticUK: w.phoneticUK,
        phoneticUS: w.phoneticUS,
        level: w.level,
        usage: w.usage,
        addedById: w.addedById,
        addedByName: w.addedBy.name,
        createdAt: w.createdAt.toISOString(),
      })),
      members: wordbook.members.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    },
    { headers: CACHE_HEADER }
  );
}

/** 删除单词本（仅 owner） */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  const wordbook = await prisma.wordbook.findUnique({ where: { id } });
  if (!wordbook) {
    return NextResponse.json({ error: "单词本不存在" }, { status: 404 });
  }
  if (wordbook.creatorId !== userId) {
    return NextResponse.json({ error: "只有创建者可以删除单词本" }, { status: 403 });
  }

  await prisma.wordbook.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

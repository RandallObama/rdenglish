import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_HEADER = { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" };

/** 获取我的单词本列表（我创建的 + 我加入的） */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;

  // 获取我创建的单词本
  const owned = await prisma.wordbook.findMany({
    where: { creatorId: userId },
    include: {
      creator: { select: { id: true, name: true } },
      _count: { select: { members: true, words: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // 获取我加入的单词本（非我创建的）
  const memberships = await prisma.wordbookMember.findMany({
    where: { userId, role: "editor" }, // owner 也算 member 且 role=owner
    include: {
      wordbook: {
        include: {
          creator: { select: { id: true, name: true } },
          _count: { select: { members: true, words: true } },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  // 合并去重：我已经创建的单词本不需要在 memberships 里再出现
  const ownedIds = new Set(owned.map((w) => w.id));
  const joined = memberships
    .filter((m) => !ownedIds.has(m.wordbook.id))
    .map((m) => m.wordbook);

  const all = [...owned, ...joined].map((wb) => ({
    id: wb.id,
    name: wb.name,
    creatorId: wb.creatorId,
    creatorName: wb.creator.name,
    memberCount: wb._count.members,
    wordCount: wb._count.words,
    isOwner: wb.creatorId === userId,
    createdAt: wb.createdAt.toISOString(),
  }));

  return NextResponse.json({ wordbooks: all }, { headers: CACHE_HEADER });
}

/** 创建新单词本 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;
  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const { name } = body;
  if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 30) {
    return NextResponse.json({ error: "单词本名称需要 2-30 个字" }, { status: 400 });
  }

  const wordbook = await prisma.wordbook.create({
    data: {
      name: name.trim(),
      creatorId: userId,
      members: {
        create: { userId, role: "owner" },
      },
    },
  });

  return NextResponse.json({ id: wordbook.id, success: true });
}

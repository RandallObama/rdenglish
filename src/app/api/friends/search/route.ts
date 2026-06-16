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
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 1 || q.length > 50) {
    return NextResponse.json({ error: "搜索关键词无效" }, { status: 400 });
  }

  const userId = session.user.id;

  // 查找名称包含搜索词的用户（排除自己、排除 name 为空的）
  const nameMatches = await prisma.user.findMany({
    where: {
      name: { contains: q },
      id: { not: userId },
    },
    select: { id: true, name: true },
    take: 20,
  });

  // 查找当前用户已有的好友关系
  const existingRelations = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: userId },
        { addresseeId: userId },
      ],
      status: { in: ["pending", "accepted"] },
    },
    select: { requesterId: true, addresseeId: true },
  });

  const relatedUserIds = new Set<string>();
  for (const rel of existingRelations) {
    if (rel.requesterId === userId) relatedUserIds.add(rel.addresseeId);
    if (rel.addresseeId === userId) relatedUserIds.add(rel.requesterId);
  }

  // 过滤掉已有关系和 name 为空的用户
  const users = nameMatches
    .filter((u) => !relatedUserIds.has(u.id) && u.name)
    .map((u) => ({ id: u.id, name: u.name as string }));

  return NextResponse.json({ users }, { headers: CACHE_HEADER });
}

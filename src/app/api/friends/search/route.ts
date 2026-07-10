import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkFriendRateLimit } from "@/lib/rate-limit-friend";

const CACHE_HEADER = { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" };

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2 || q.length > 50) {
    return NextResponse.json({ error: "搜索关键词需 2-50 个字符" }, { status: 400 });
  }

  const userId = session.user.id;

  // 频率限制（与好友请求共享计数器）
  const limit = await checkFriendRateLimit(userId);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "搜索太频繁，请稍后再试" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // 查找名称包含搜索词的用户（排除自己、排除 name 为空的）
  const nameMatches = await prisma.user.findMany({
    where: {
      name: { contains: q },
      id: { not: userId },
    },
    select: { id: true, name: true },
    take: 20,
  });

  // 查找当前用户已有的所有好友关系（含 pending/accepted）
  const existingRelations = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: userId },
        { addresseeId: userId },
      ],
      status: { in: ["pending", "accepted"] },
    },
    select: { requesterId: true, addresseeId: true, status: true },
  });

  const relatedUserIds = new Set<string>();
  for (const rel of existingRelations) {
    if (rel.requesterId === userId) relatedUserIds.add(rel.addresseeId);
    if (rel.addresseeId === userId) relatedUserIds.add(rel.requesterId);
  }

  // 单独查询被当前用户拉黑 / 拉黑当前用户的用户，显式排除
  const blockedRelations = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: userId, status: "blocked" },
        { addresseeId: userId, status: "blocked" },
      ],
    },
    select: { requesterId: true, addresseeId: true },
  });

  const blockedUserIds = new Set<string>();
  for (const rel of blockedRelations) {
    if (rel.requesterId === userId) blockedUserIds.add(rel.addresseeId);
    if (rel.addresseeId === userId) blockedUserIds.add(rel.requesterId);
  }

  // 过滤掉已有关系、黑名单用户和 name 为空的用户
  const users = nameMatches
    .filter((u) => !relatedUserIds.has(u.id) && !blockedUserIds.has(u.id) && u.name)
    .map((u) => ({ id: u.id, name: u.name as string }));

  return NextResponse.json({ users }, { headers: CACHE_HEADER });
}

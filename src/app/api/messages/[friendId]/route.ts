import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_HEADER = { "Cache-Control": "private, max-age=3, stale-while-revalidate=5" };

/** 获取与指定好友的消息历史（游标分页） */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ friendId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;
  const { friendId } = await params;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 50);

  // 验证是好友关系
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: userId, addresseeId: friendId },
        { requesterId: friendId, addresseeId: userId },
      ],
    },
  });
  if (!friendship) {
    return NextResponse.json({ error: "只能查看好友的消息" }, { status: 403 });
  }

  const where: Record<string, unknown> = {
    OR: [
      { senderId: userId, receiverId: friendId },
      { senderId: friendId, receiverId: userId },
    ],
  };

  if (cursor) {
    (where as Record<string, unknown>).createdAt = { lt: new Date(cursor) };
  }

  const messages = await prisma.message.findMany({
    where: where as any,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = messages.length > limit;
  const items = messages.slice(0, limit).map((m) => ({
    id: m.id,
    senderId: m.senderId,
    receiverId: m.receiverId,
    content: m.content,
    contentType: m.contentType,
    contentId: m.contentId,
    read: m.read,
    createdAt: m.createdAt.toISOString(),
  }));

  // 倒序返回（最旧的在前）
  items.reverse();

  return NextResponse.json({ messages: items, hasMore }, { headers: CACHE_HEADER });
}

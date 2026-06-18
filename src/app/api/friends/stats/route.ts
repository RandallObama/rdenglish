import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_HEADER = { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" };

/** 获取好友统计（好友数、待处理请求数、未读消息数） */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = session.user.id;

    const [totalFriends, pendingRequests, unreadMessages] = await Promise.all([
      prisma.friendship.count({
        where: {
          status: "accepted",
          OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
      }),
      prisma.friendship.count({
        where: { addresseeId: userId, status: "pending" },
      }),
      prisma.message.count({
        where: { receiverId: userId, read: false },
      }),
    ]);

    return NextResponse.json(
      { totalFriends, pendingRequests, unreadMessages },
      { headers: CACHE_HEADER }
    );
  } catch (e) {
    console.error("GET /api/friends/stats error:", e);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

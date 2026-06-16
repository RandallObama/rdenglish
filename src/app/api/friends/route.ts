import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_HEADER = { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;

  // 查询所有已接受的好友关系（双向）
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { requesterId: userId },
        { addresseeId: userId },
      ],
      status: "accepted",
    },
    include: {
      requester: { select: { id: true, name: true } },
      addressee: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const friends = friendships.map((f) => {
    const isRequester = f.requesterId === userId;
    const friend = isRequester ? f.addressee : f.requester;
    return {
      id: f.id,
      friendId: friend.id,
      name: friend.name,
      addedAt: f.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({ friends }, { headers: CACHE_HEADER });
}

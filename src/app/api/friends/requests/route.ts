import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkFriendRateLimit } from "@/lib/rate-limit-friend";

const CACHE_HEADER = { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" };

/** 获取好友请求列表 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "incoming";
  const userId = session.user.id;

  if (type === "incoming") {
    // 别人发给我的
    const requests = await prisma.friendship.findMany({
      where: { addresseeId: userId, status: "pending" },
      include: { requester: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    const items = requests.map((r) => ({
      id: r.id,
      requesterId: r.requesterId,
      requesterName: r.requester.name,
      addresseeId: r.addresseeId,
      addresseeName: null,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ requests: items }, { headers: CACHE_HEADER });
  }

  // outgoing：我发给别人的
  const requests = await prisma.friendship.findMany({
    where: { requesterId: userId, status: "pending" },
    include: { addressee: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const items = requests.map((r) => ({
    id: r.id,
    requesterId: r.requesterId,
    requesterName: null,
    addresseeId: r.addresseeId,
    addresseeName: r.addressee.name,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ requests: items }, { headers: CACHE_HEADER });
}

/** 发送好友请求 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;
  let body: { addresseeId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const { addresseeId } = body;

  if (!addresseeId || typeof addresseeId !== "string") {
    return NextResponse.json({ error: "缺少目标用户" }, { status: 400 });
  }

  // 不能加自己
  if (addresseeId === userId) {
    return NextResponse.json({ error: "不能添加自己为好友" }, { status: 400 });
  }

  // 频率限制（数据库持久化，防 serverless 冷启动绕过）
  const limit = await checkFriendRateLimit(userId);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "操作太频繁，请稍后再试" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // 检查目标用户是否存在
  const targetUser = await prisma.user.findUnique({
    where: { id: addresseeId },
    select: { id: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  // 检查是否已有关系
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId },
        { requesterId: addresseeId, addresseeId: userId },
      ],
    },
  });

  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json({ error: "已经是好友了" }, { status: 409 });
    }
    if (existing.status === "pending") {
      // 如果对方已向我发请求而我还没处理，则对方请求已存在
      if (existing.requesterId === addresseeId) {
        return NextResponse.json({ error: "对方已向你发送好友请求，请去处理" }, { status: 409 });
      }
      return NextResponse.json({ error: "已发送过好友请求，请等待对方处理" }, { status: 409 });
    }
  }

  const friendship = await prisma.friendship.create({
    data: {
      requesterId: userId,
      addresseeId,
      status: "pending",
    },
  });

  return NextResponse.json({ id: friendship.id, success: true });
}

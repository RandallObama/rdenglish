import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_HEADER = { "Cache-Control": "private, max-age=5, stale-while-revalidate=10" };

/** 获取会话列表（去重好友 + 最后消息 + 未读数） */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;

  // 获取用户参与的所有消息，按时间倒序
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // 内存中去重：每个好友只保留最新一条消息
  const conversationMap = new Map<
    string,
    { friendId: string; lastMessage: string; lastMessageAt: string; unreadCount: number }
  >();

  const unreadCounts = new Map<string, number>();
  // 预计算每个伙伴的未读数
  for (const m of messages) {
    if (m.receiverId === userId && !m.read) {
      const partner = m.senderId;
      unreadCounts.set(partner, (unreadCounts.get(partner) || 0) + 1);
    }
  }

  for (const m of messages) {
    const partner = m.senderId === userId ? m.receiverId : m.senderId;
    if (!conversationMap.has(partner)) {
      conversationMap.set(partner, {
        friendId: partner,
        lastMessage: m.content.length > 50 ? m.content.slice(0, 50) + "…" : m.content,
        lastMessageAt: m.createdAt.toISOString(),
        unreadCount: unreadCounts.get(partner) || 0,
      });
    }
  }

  // 查询好友名称
  const friendIds = Array.from(conversationMap.keys());
  let friendNames: Record<string, string | null> = {};
  if (friendIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: friendIds } },
      select: { id: true, name: true },
    });
    friendNames = Object.fromEntries(users.map((u) => [u.id, u.name]));
  }

  const conversations = Array.from(conversationMap.values())
    .map((c) => ({
      ...c,
      friendName: friendNames[c.friendId] ?? null,
    }))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return NextResponse.json({ conversations, totalUnread }, { headers: CACHE_HEADER });
}

/** 发送消息 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;
  let body: { receiverId?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const { receiverId, content } = body;

  if (!receiverId || typeof receiverId !== "string") {
    return NextResponse.json({ error: "缺少接收者" }, { status: 400 });
  }
  if (receiverId === userId) {
    return NextResponse.json({ error: "不能给自己发消息" }, { status: 400 });
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "消息内容不能为空" }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: "消息不能超过2000字" }, { status: 400 });
  }

  // 验证是好友关系
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { requesterId: userId, addresseeId: receiverId },
        { requesterId: receiverId, addresseeId: userId },
      ],
    },
  });
  if (!friendship) {
    return NextResponse.json({ error: "只能给好友发消息" }, { status: 403 });
  }

  const message = await prisma.message.create({
    data: {
      senderId: userId,
      receiverId,
      content: content.trim(),
    },
  });

  return NextResponse.json({ id: message.id, success: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CACHE_HEADER = { "Cache-Control": "private, max-age=10, stale-while-revalidate=30" };

/** 获取分享内容列表（收件箱或已发送） */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const direction = searchParams.get("direction") || "inbox";
  const userId = session.user.id;

  if (direction === "inbox") {
    const items = await prisma.sharedContent.findMany({
      where: { receiverId: userId },
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const mapped = items.map((item) => ({
      id: item.id,
      senderId: item.senderId,
      senderName: item.sender.name,
      receiverId: item.receiverId,
      receiverName: item.receiver.name,
      contentType: item.contentType,
      contentId: item.contentId,
      message: item.message,
      read: item.read,
      createdAt: item.createdAt.toISOString(),
    }));

    return NextResponse.json({ items: mapped }, { headers: CACHE_HEADER });
  }

  // sent：已发送
  const items = await prisma.sharedContent.findMany({
    where: { senderId: userId },
    include: {
      sender: { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const mapped = items.map((item) => ({
    id: item.id,
    senderId: item.senderId,
    senderName: item.sender.name,
    receiverId: item.receiverId,
    receiverName: item.receiver.name,
    contentType: item.contentType,
    contentId: item.contentId,
    message: item.message,
    read: item.read,
    createdAt: item.createdAt.toISOString(),
  }));

  return NextResponse.json({ items: mapped }, { headers: CACHE_HEADER });
}

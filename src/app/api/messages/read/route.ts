import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 标记来自某好友的所有消息为已读 */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;
  let body: { friendId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const { friendId } = body;
  if (!friendId || typeof friendId !== "string") {
    return NextResponse.json({ error: "缺少好友ID" }, { status: 400 });
  }

  const result = await prisma.message.updateMany({
    where: {
      senderId: friendId,
      receiverId: userId,
      read: false,
    },
    data: { read: true },
  });

  return NextResponse.json({ success: true, count: result.count });
}

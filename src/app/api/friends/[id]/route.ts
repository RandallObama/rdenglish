import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  // 只允许关系参与者删除
  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship) {
    return NextResponse.json({ error: "好友关系不存在" }, { status: 404 });
  }
  if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  // 同时删除双向的分享记录
  await prisma.$transaction([
    prisma.sharedContent.deleteMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId },
          { senderId: friendship.requesterId === userId ? friendship.addresseeId : friendship.requesterId, receiverId: userId },
        ],
      },
    }),
    prisma.friendship.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}

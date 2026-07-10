import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 邀请好友加入单词本 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: wordbookId } = await params;
  const userId = session.user.id;

  // 验证当前用户是单词本成员
  const membership = await prisma.wordbookMember.findUnique({
    where: { wordbookId_userId: { wordbookId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  let body: { friendId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const { friendId } = body;
  if (!friendId || typeof friendId !== "string") {
    return NextResponse.json({ error: "缺少好友 ID" }, { status: 400 });
  }

  // 验证是好友
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
    return NextResponse.json({ error: "只能邀请好友" }, { status: 403 });
  }

  // 原子化加入：利用数据库唯一约束避免竞态
  // @@unique([wordbookId, userId]) 保证不会重复添加
  try {
    await prisma.wordbookMember.create({
      data: {
        wordbookId,
        userId: friendId,
        role: "editor",
      },
    });
  } catch (error: unknown) {
    // P2002 = Prisma unique constraint violation
    if (error instanceof Error && (error as any)?.code === "P2002") {
      return NextResponse.json({ error: "该好友已在单词本中" }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}

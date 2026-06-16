import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 处理好友请求：接受或拒绝 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const { action } = body;

  if (!action || !["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "无效的操作" }, { status: 400 });
  }

  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship) {
    return NextResponse.json({ error: "好友请求不存在" }, { status: 404 });
  }

  if (friendship.status !== "pending") {
    return NextResponse.json({ error: "该请求已处理" }, { status: 409 });
  }

  if (action === "accept") {
    // 只有接收者可以接受
    if (friendship.addresseeId !== userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    await prisma.friendship.update({
      where: { id },
      data: { status: "accepted" },
    });
    return NextResponse.json({ success: true, status: "accepted" });
  }

  // reject：接收者拒绝（删除记录，允许重新发送）
  if (action === "reject") {
    // 接收者可以拒绝，发送者也可以取消（撤回）
    if (friendship.addresseeId !== userId && friendship.requesterId !== userId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }
    await prisma.friendship.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}

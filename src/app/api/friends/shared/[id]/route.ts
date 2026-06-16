import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 标记分享内容为已读 */
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

  const shared = await prisma.sharedContent.findUnique({ where: { id } });
  if (!shared) {
    return NextResponse.json({ error: "分享内容不存在" }, { status: 404 });
  }

  // 只有接收者可以标记已读
  if (shared.receiverId !== userId) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  await prisma.sharedContent.update({
    where: { id },
    data: { read: true },
  });

  return NextResponse.json({ success: true });
}

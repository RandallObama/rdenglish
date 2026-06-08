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

  const item = await prisma.savedWord.findUnique({ where: { id } });

  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  await prisma.savedWord.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

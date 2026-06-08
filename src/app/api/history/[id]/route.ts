import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id } = await params;

  const writing = await prisma.writing.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!writing || writing.userId !== session.user.id) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  await prisma.writing.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

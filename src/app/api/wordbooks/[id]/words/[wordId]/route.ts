import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 删除单词本中的单词 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; wordId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { id: wordbookId, wordId } = await params;
  const userId = session.user.id;

  // 验证是成员
  const membership = await prisma.wordbookMember.findUnique({
    where: { wordbookId_userId: { wordbookId, userId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  const word = await prisma.wordbookWord.findUnique({ where: { id: wordId } });
  if (!word || word.wordbookId !== wordbookId) {
    return NextResponse.json({ error: "单词不存在" }, { status: 404 });
  }

  // 只能删除自己添加的，或 owner 可删除任意
  const wordbook = await prisma.wordbook.findUnique({ where: { id: wordbookId } });
  if (word.addedById !== userId && wordbook?.creatorId !== userId) {
    return NextResponse.json({ error: "只能删除自己添加的单词" }, { status: 403 });
  }

  await prisma.wordbookWord.delete({ where: { id: wordId } });

  return NextResponse.json({ success: true });
}

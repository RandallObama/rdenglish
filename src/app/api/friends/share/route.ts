import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_CONTENT_TYPES = ["writing", "correction", "savedWord", "savedGrammar"] as const;

/** 分享内容给好友 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;
  let body: {
    receiverId?: string;
    contentType?: string;
    contentId?: string;
    message?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式无效" }, { status: 400 });
  }

  const { receiverId, contentType, contentId, message } = body;

  if (!receiverId || typeof receiverId !== "string") {
    return NextResponse.json({ error: "缺少目标好友" }, { status: 400 });
  }
  if (!contentType || !VALID_CONTENT_TYPES.includes(contentType as typeof VALID_CONTENT_TYPES[number])) {
    return NextResponse.json({ error: "无效的分享类型" }, { status: 400 });
  }
  if (!contentId || typeof contentId !== "string") {
    return NextResponse.json({ error: "缺少分享内容" }, { status: 400 });
  }
  if (message && message.length > 200) {
    return NextResponse.json({ error: "留言不能超过200字" }, { status: 400 });
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
    return NextResponse.json({ error: "只能分享给好友" }, { status: 403 });
  }

  // 验证内容存在且属于当前用户（所有权校验）
  let contentExists = false;
  switch (contentType) {
    case "writing":
      const writing = await prisma.writing.findUnique({ where: { id: contentId } });
      contentExists = !!writing && writing.userId === userId;
      break;
    case "correction":
      const correction = await prisma.correction.findUnique({ where: { id: contentId } });
      contentExists = !!correction && correction.userId === userId;
      break;
    case "savedWord":
      const word = await prisma.savedWord.findUnique({ where: { id: contentId } });
      contentExists = !!word && word.userId === userId;
      break;
    case "savedGrammar":
      const grammar = await prisma.savedGrammar.findUnique({ where: { id: contentId } });
      contentExists = !!grammar && grammar.userId === userId;
      break;
  }

  if (!contentExists) {
    return NextResponse.json({ error: "分享内容不存在" }, { status: 404 });
  }

  const shared = await prisma.sharedContent.create({
    data: {
      senderId: userId,
      receiverId,
      contentType,
      contentId,
      message: message || null,
    },
  });

  return NextResponse.json({ id: shared.id, success: true });
}

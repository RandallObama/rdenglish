import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 获取分享内容详情 */
export async function GET(
  _request: Request,
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

  // 只有发送者或接收者可以查看
  if (shared.senderId !== userId && shared.receiverId !== userId) {
    return NextResponse.json({ error: "无权查看" }, { status: 403 });
  }

  // 根据类型获取实际内容
  let content: Record<string, unknown> | null = null;
  switch (shared.contentType) {
    case "writing": {
      const w = await prisma.writing.findUnique({ where: { id: shared.contentId } });
      if (w) {
        content = { sourceText: w.sourceText, resultText: w.resultText };
      }
      break;
    }
    case "correction": {
      const c = await prisma.correction.findUnique({ where: { id: shared.contentId } });
      if (c) {
        content = { essayText: c.essayText, totalScore: c.totalScore, maxScore: c.maxScore, overallComment: c.overallComment };
      }
      break;
    }
    case "savedWord": {
      const w = await prisma.savedWord.findUnique({ where: { id: shared.contentId } });
      if (w) {
        content = {
          word: w.word, chinese: w.chinese, level: w.level, usage: w.usage,
          collocations: w.collocations ? JSON.parse(w.collocations) : [],
          synonyms: w.synonyms ? JSON.parse(w.synonyms) : [],
          examples: w.examples ? JSON.parse(w.examples) : [],
          commonErrors: w.commonErrors ? JSON.parse(w.commonErrors) : [],
          examFocus: w.examFocus,
        };
      }
      break;
    }
    case "savedGrammar": {
      const g = await prisma.savedGrammar.findUnique({ where: { id: shared.contentId } });
      if (g) {
        content = {
          point: g.point, level: g.level, function: g.function,
          structure: g.structure, explanation: g.explanation,
          examples: g.examples ? JSON.parse(g.examples) : [],
          commonMistakes: g.commonMistakes ? JSON.parse(g.commonMistakes) : [],
          examTip: g.examTip,
        };
      }
      break;
    }
  }

  if (!content) {
    return NextResponse.json({ error: "原内容已被删除" }, { status: 404 });
  }

  return NextResponse.json({
    contentType: shared.contentType,
    content,
    message: shared.message,
    senderName: (await prisma.user.findUnique({ where: { id: shared.senderId }, select: { name: true } }))?.name || "未知",
    createdAt: shared.createdAt.toISOString(),
  });
}

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

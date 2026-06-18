import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 获取消息关联的分享内容详情 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("id");

    if (!messageId) {
      return NextResponse.json({ error: "缺少消息ID" }, { status: 400 });
    }

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      return NextResponse.json({ error: "消息不存在" }, { status: 404 });
    }

    // 只有发送者或接收者可以查看
    if (message.senderId !== userId && message.receiverId !== userId) {
      return NextResponse.json({ error: "无权查看" }, { status: 403 });
    }

    if (!message.contentType || !message.contentId) {
      return NextResponse.json({ error: "该消息不包含分享内容" }, { status: 400 });
    }

    // 根据类型获取实际内容
    let content: Record<string, unknown> | null = null;
    switch (message.contentType) {
      case "writing": {
        const w = await prisma.writing.findUnique({ where: { id: message.contentId } });
        if (w) {
          content = { sourceText: w.sourceText, resultText: w.resultText };
        }
        break;
      }
      case "correction": {
        const c = await prisma.correction.findUnique({ where: { id: message.contentId } });
        if (c) {
          content = { essayText: c.essayText, totalScore: c.totalScore, maxScore: c.maxScore, overallComment: c.overallComment };
        }
        break;
      }
      case "savedWord": {
        const w = await prisma.savedWord.findUnique({ where: { id: message.contentId } });
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
        const g = await prisma.savedGrammar.findUnique({ where: { id: message.contentId } });
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

    return NextResponse.json({ contentType: message.contentType, content });
  } catch (e) {
    console.error("GET /api/messages/content error:", e);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

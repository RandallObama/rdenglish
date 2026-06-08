import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { translateAndAnalyze } from "@/lib/deepseek";
import { checkUsage, incrementUsage } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import type { ExamType, WritingStyle } from "@/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { remaining } = await checkUsage(session.user.id);
  if (remaining <= 0) {
    return NextResponse.json(
      { error: "今日免费次数已用完，请升级到 Pro 版" },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const {
      text,
      style = "daily",
      examType = "general",
    } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "请输入文本" }, { status: 400 });
    }

    if (text.length > 2000) {
      return NextResponse.json(
        { error: "文本过长，请限制在 2000 字以内" },
        { status: 400 }
      );
    }

    const validStyles: WritingStyle[] = ["academic", "business", "daily"];
    const validExamTypes: ExamType[] = [
      "middle", "high", "cet4", "cet6", "ielts", "general",
    ];

    const safeStyle = validStyles.includes(style as WritingStyle)
      ? (style as WritingStyle)
      : "daily";
    const safeExamType = validExamTypes.includes(examType as ExamType)
      ? (examType as ExamType)
      : "general";

    const result = await translateAndAnalyze(
      text.trim(),
      safeStyle,
      safeExamType
    );

    // 保存到历史记录
    const writing = await prisma.writing.create({
      data: {
        userId: session.user.id,
        sourceText: text.trim(),
        resultText: result.english,
        style: safeStyle,
        examType: safeExamType,
        grammarNotes: JSON.stringify(result.grammarNotes),
        vocabNotes: JSON.stringify(result.vocabNotes),
      },
    });

    await incrementUsage(session.user.id);

    const { remaining: newRemaining } = await checkUsage(session.user.id);

    return NextResponse.json({
      id: writing.id,
      ...result,
      remaining: newRemaining,
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "翻译出错，请稍后重试" },
      { status: 500 }
    );
  }
}

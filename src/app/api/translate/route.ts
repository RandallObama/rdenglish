import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { translateAndAnalyze, streamTranslateAndAnalyze } from "@/lib/deepseek";
import { consumeUsage, checkAiRpm } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createSSEResponse } from "@/lib/stream";
import type { ExamType, WritingStyle } from "@/types";

// Vercel Hobby 最大 60s，Pro 可达 300s
export const maxDuration = 180;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const userId = session.user.id;

  // 每分钟 AI 请求节流（所有用户，含 Pro）
  const rpm = checkAiRpm(userId);
  if (!rpm.allowed) {
    return NextResponse.json(
      { error: `请求过于频繁，请 ${rpm.retryAfter} 秒后再试` },
      { status: 429, headers: { "Retry-After": String(rpm.retryAfter) } }
    );
  }

  const usage = await consumeUsage(userId);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: "今日免费次数已用完，请升级到 Pro 版" },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { text, style = "daily", examType = "general", stream = true } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "请输入文本" }, { status: 400 });
    }

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 1200) {
      return NextResponse.json(
        { error: "文本过长，请限制在 1200 词以内" },
        { status: 400 }
      );
    }

    const validStyles: WritingStyle[] = ["academic", "business", "daily"];
    const validExamTypes: ExamType[] = [
      "middle", "high", "cet4", "cet6", "ielts", "general", "literary",
    ];

    const safeStyle = validStyles.includes(style as WritingStyle)
      ? (style as WritingStyle)
      : "daily";
    const safeExamType = validExamTypes.includes(examType as ExamType)
      ? (examType as ExamType)
      : "general";

    // ── 流式路径：SSE 实时推送 AI 生成文本 ──
    if (stream) {
      return createSSEResponse(async (send) => {
        const iter = streamTranslateAndAnalyze(text.trim(), safeStyle, safeExamType);
        let result: Awaited<ReturnType<typeof translateAndAnalyze>> | null = null;

        // 消费生成器：逐块发送，获取最终 return 值
        const gen = iter[Symbol.asyncIterator]();
        while (true) {
          const { value, done } = await gen.next();
          if (done) {
            result = value as Awaited<ReturnType<typeof translateAndAnalyze>>;
            break;
          }
          send({ type: "chunk", content: value as string });
        }

        if (!result) {
          send({ type: "error", message: "AI 返回为空" });
          return;
        }

        // 保存到数据库
        const writing = await prisma.writing.create({
          data: {
            userId: userId,
            sourceText: text.trim(),
            resultText: result.english,
            style: safeStyle,
            examType: safeExamType,
            grammarNotes: JSON.stringify(result.grammarNotes),
            vocabNotes: JSON.stringify(result.vocabNotes),
          },
        });

        send({
          type: "done",
          result: { id: writing.id, ...result, remaining: usage.remaining },
          remaining: usage.remaining,
        });
      });
    }

    // ── 兼容旧非流式路径 ──
    const result = await translateAndAnalyze(text.trim(), safeStyle, safeExamType);

    const writing = await prisma.writing.create({
      data: {
        userId: userId,
        sourceText: text.trim(),
        resultText: result.english,
        style: safeStyle,
        examType: safeExamType,
        grammarNotes: JSON.stringify(result.grammarNotes),
        vocabNotes: JSON.stringify(result.vocabNotes),
      },
    });

    return NextResponse.json({
      id: writing.id,
      ...result,
      remaining: usage.remaining,
    });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "翻译出错，请稍后重试" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { optimizeEssay, streamOptimizeEssay } from "@/lib/optimize";
import { consumeUsage, checkAiRpm } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { createSSEResponse } from "@/lib/stream";
import type { ExamType, OptimizeStyle, OptimizeIntensity, OptimizeMode } from "@/types";

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
    const {
      text,
      style = "daily",
      examType = "general",
      intensity = "medium",
      mode = "full",
      contextBefore,
      contextAfter,
      stream = true,
    } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "请输入英文文本" }, { status: 400 });
    }

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 1200) {
      return NextResponse.json(
        { error: "文本过长，请限制在 1200 词以内" },
        { status: 400 }
      );
    }

    const validStyles: OptimizeStyle[] = [
      "daily", "academic", "business", "creative", "persuasive",
    ];
    const validExamTypes: ExamType[] = [
      "middle", "high", "cet4", "cet6", "ielts", "general", "literary",
    ];
    const validIntensities: OptimizeIntensity[] = ["light", "medium", "deep"];
    const validModes: OptimizeMode[] = ["full", "fragment"];

    const safeStyle = validStyles.includes(style as OptimizeStyle)
      ? (style as OptimizeStyle)
      : "daily";
    const safeExamType = validExamTypes.includes(examType as ExamType)
      ? (examType as ExamType)
      : "general";
    const safeIntensity = validIntensities.includes(intensity as OptimizeIntensity)
      ? (intensity as OptimizeIntensity)
      : "medium";
    const safeMode = validModes.includes(mode as OptimizeMode)
      ? (mode as OptimizeMode)
      : "full";

    // 片段模式校验上下文
    const safeContextBefore =
      safeMode === "fragment" && typeof contextBefore === "string"
        ? contextBefore.slice(0, 3000)
        : undefined;
    const safeContextAfter =
      safeMode === "fragment" && typeof contextAfter === "string"
        ? contextAfter.slice(0, 3000)
        : undefined;

    // ── 流式路径 ──
    if (stream) {
      return createSSEResponse(async (send) => {
        const iter = streamOptimizeEssay(
          text.trim(),
          safeStyle,
          safeExamType,
          safeIntensity,
          safeMode,
          safeContextBefore,
          safeContextAfter
        );
        let result: Awaited<ReturnType<typeof optimizeEssay>> | null = null;

        const gen = iter[Symbol.asyncIterator]();
        while (true) {
          const { value, done } = await gen.next();
          if (done) {
            result = value as Awaited<ReturnType<typeof optimizeEssay>>;
            break;
          }
          send({ type: "chunk", content: value as string });
        }

        if (!result) {
          send({ type: "error", message: "AI 返回为空，请尝试缩短文本或更换选项后重试" });
          return;
        }

        // 保存到数据库（保存失败不影响结果返回）
        let optimizationId = "";
        try {
          const optimization = await prisma.optimization.create({
            data: {
              userId: userId,
              originalText: text.trim(),
              optimizedText: result.optimizedText,
              style: safeStyle,
              examType: safeExamType,
              intensity: safeIntensity,
              mode: safeMode,
              improvements: JSON.stringify(result.improvements),
              grammarNotes: result.grammarNotes.length > 0
                ? JSON.stringify(result.grammarNotes)
                : null,
              vocabNotes: result.vocabNotes.length > 0
                ? JSON.stringify(result.vocabNotes)
                : null,
              highlights: result.highlights || "",
              transitionAnalysis: result.transitionAnalysis
                ? JSON.stringify(result.transitionAnalysis)
                : null,
              contextBefore: safeContextBefore || null,
              contextAfter: safeContextAfter || null,
            },
          });
          optimizationId = optimization.id;
        } catch (dbErr) {
          console.error("Optimization DB save error:", dbErr);
          // 数据库保存失败不阻塞用户查看结果
        }

        send({
          type: "done",
          result: { id: optimizationId, ...result, remaining: usage.remaining },
          remaining: usage.remaining,
        });
      });
    }

    // ── 非流式兼容路径 ──
    const result = await optimizeEssay(
      text.trim(),
      safeStyle,
      safeExamType,
      safeIntensity,
      safeMode,
      safeContextBefore,
      safeContextAfter
    );

    // 保存到数据库（保存失败不影响结果返回）
    let optimizationId = "";
    try {
      const optimization = await prisma.optimization.create({
        data: {
          userId: userId,
          originalText: text.trim(),
          optimizedText: result.optimizedText,
          style: safeStyle,
          examType: safeExamType,
          intensity: safeIntensity,
          mode: safeMode,
          improvements: JSON.stringify(result.improvements),
          grammarNotes: result.grammarNotes.length > 0
            ? JSON.stringify(result.grammarNotes)
            : null,
          vocabNotes: result.vocabNotes.length > 0
            ? JSON.stringify(result.vocabNotes)
            : null,
          highlights: result.highlights || "",
          transitionAnalysis: result.transitionAnalysis
            ? JSON.stringify(result.transitionAnalysis)
            : null,
          contextBefore: safeContextBefore || null,
          contextAfter: safeContextAfter || null,
        },
      });
      optimizationId = optimization.id;
    } catch (dbErr) {
      console.error("Optimization DB save error:", dbErr);
    }

    return NextResponse.json({
      id: optimizationId,
      ...result,
      remaining: usage.remaining,
    });
  } catch (error) {
    const err = error as Error & { status?: number; code?: string };
    console.error("Optimization error:", {
      message: err.message,
      status: err.status,
      code: err.code,
      stack: err.stack?.slice(0, 500),
    });

    // 区分 DeepSeek API 特定错误
    const code = err.code || "";
    const msg = err.message || "";
    if (err.status === 401) {
      return NextResponse.json(
        { error: "AI 服务鉴权失败，请检查 API Key 是否正确或余额是否充足" },
        { status: 500 }
      );
    }
    if (err.status === 429 || code === "rate_limit_exceeded") {
      return NextResponse.json(
        { error: "AI 服务繁忙，请稍后重试" },
        { status: 503 }
      );
    }
    if (msg.includes("timeout") || msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED")) {
      return NextResponse.json(
        { error: "AI 服务连接超时，请稍后重试" },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "优化出错，请稍后重试" },
      { status: 500 }
    );
  }
}

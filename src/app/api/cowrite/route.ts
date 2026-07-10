import { auth } from "@/lib/auth";
import { cowriteContinue, streamCowriteContinue, cowriteContinueEn, streamCowriteContinueEn } from "@/lib/deepseek";
import { consumeUsage, checkAiRpm } from "@/lib/rate-limit";
import { createSSEResponse } from "@/lib/stream";
import { prisma } from "@/lib/prisma";
import type { WritingStyle } from "@/types";

// Vercel Hobby 最大 60s，Pro 可达 300s
export const maxDuration = 180;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "请先登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userId = session.user.id;

  // 每分钟 AI 请求节流（所有用户，含 Pro）
  const rpm = checkAiRpm(userId);
  if (!rpm.allowed) {
    return new Response(
      JSON.stringify({ error: `请求过于频繁，请 ${rpm.retryAfter} 秒后再试` }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rpm.retryAfter) } }
    );
  }

  const usage = await consumeUsage(userId);
  if (!usage.allowed) {
    return new Response(
      JSON.stringify({ error: "今日免费次数已用完" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const { text, style = "daily", lang = "zh", stream = true } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "请先输入一些内容后再续写" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 1200) {
      return new Response(
        JSON.stringify({ error: "文本过长，请限制在 1200 词以内" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validStyles: WritingStyle[] = ["academic", "business", "daily"];
    const safeStyle = validStyles.includes(style as WritingStyle)
      ? (style as WritingStyle)
      : "daily";

    // ── 英文续写 ──
    if (lang === "en") {
      if (stream) {
        return createSSEResponse(async (send) => {
          const iter = streamCowriteContinueEn(text.trim(), safeStyle);
          let result: Awaited<ReturnType<typeof cowriteContinueEn>> | null = null;

          const gen = iter[Symbol.asyncIterator]();
          while (true) {
            const { value, done } = await gen.next();
            if (done) {
              result = value as Awaited<ReturnType<typeof cowriteContinueEn>>;
              break;
            }
            send({ type: "chunk", content: value as string });
          }

          if (!result) {
            send({ type: "error", message: "AI 返回为空" });
            return;
          }

          send({ type: "done", result });

          // 保存续写结果到 Writing 表
          try {
            await prisma.writing.create({
              data: {
                userId,
                sourceText: text.trim(),
                resultText: JSON.stringify(result),
                style: safeStyle,
              },
            });
          } catch (saveErr) {
            console.error("Cowrite save Writing failed (en, stream):", saveErr);
          }
        });
      }

      const result = await cowriteContinueEn(text.trim(), safeStyle);
      // 保存续写结果到 Writing 表
      try {
        await prisma.writing.create({
          data: {
            userId,
            sourceText: text.trim(),
            resultText: JSON.stringify(result),
            style: safeStyle,
          },
        });
      } catch (saveErr) {
        console.error("Cowrite save Writing failed (en, non-stream):", saveErr);
      }
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── 中文续写（原有逻辑） ──
    if (stream) {
      return createSSEResponse(async (send) => {
        const iter = streamCowriteContinue(text.trim(), safeStyle);
        let result: Awaited<ReturnType<typeof cowriteContinue>> | null = null;

        const gen = iter[Symbol.asyncIterator]();
        while (true) {
          const { value, done } = await gen.next();
          if (done) {
            result = value as Awaited<ReturnType<typeof cowriteContinue>>;
            break;
          }
          send({ type: "chunk", content: value as string });
        }

        if (!result) {
          send({ type: "error", message: "AI 返回为空" });
          return;
        }

        send({ type: "done", result });

        // 保存续写结果到 Writing 表
        try {
          await prisma.writing.create({
            data: {
              userId,
              sourceText: text.trim(),
              resultText: JSON.stringify(result),
              style: safeStyle,
            },
          });
        } catch (saveErr) {
          console.error("Cowrite save Writing failed (zh, stream):", saveErr);
        }
      });
    }

    const result = await cowriteContinue(text.trim(), safeStyle);
    // 保存续写结果到 Writing 表
    try {
      await prisma.writing.create({
        data: {
          userId,
          sourceText: text.trim(),
          resultText: JSON.stringify(result),
          style: safeStyle,
        },
      });
    } catch (saveErr) {
      console.error("Cowrite save Writing failed (zh, non-stream):", saveErr);
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cowrite error:", error);
    return new Response(
      JSON.stringify({ error: "续写失败，请稍后重试" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

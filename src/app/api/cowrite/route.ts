import { auth } from "@/lib/auth";
import { cowriteContinue, streamCowriteContinue } from "@/lib/deepseek";
import { consumeUsage } from "@/lib/rate-limit";
import { createSSEResponse } from "@/lib/stream";
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
  const usage = await consumeUsage(userId);
  if (!usage.allowed) {
    return new Response(
      JSON.stringify({ error: "今日免费次数已用完" }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const { text, style = "daily", stream = true } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "请先输入一些内容后再续写" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (text.length > 2000) {
      return new Response(
        JSON.stringify({ error: "文本过长，请限制在 2000 字以内" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validStyles: WritingStyle[] = ["academic", "business", "daily"];
    const safeStyle = validStyles.includes(style as WritingStyle)
      ? (style as WritingStyle)
      : "daily";

    // ── 流式路径 ──
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
      });
    }

    // ── 非流式兼容路径 ──
    const result = await cowriteContinue(text.trim(), safeStyle);
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

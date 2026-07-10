/**
 * SSE Streaming utilities — shared by API routes and frontend components.
 */

// ── API side: create an SSE Response ──

type SSEEvent =
  | { type: "chunk"; content: string }
  | { type: "done"; result: unknown; remaining?: number }
  | { type: "error"; message: string };

export function createSSEResponse(
  generator: (send: (event: SSEEvent) => void) => Promise<void>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        const line = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(line));
      };

      try {
        await generator(send);
      } catch (err) {
        const e = err as Error & { status?: number; code?: string; name?: string };
        console.error("SSE stream error:", {
          message: e.message,
          status: e.status,
          code: e.code,
          name: e.name,
        });

        let userMessage = "AI 服务暂时不可用，请稍后重试";
        if (e.status === 401) {
          userMessage = "AI 服务鉴权失败，请联系管理员检查 API Key";
        } else if (e.status === 429 || e.code === "rate_limit_exceeded") {
          userMessage = "AI 服务繁忙，请稍后重试";
        } else if (e.message?.includes("timeout") || e.message?.includes("ETIMEDOUT")) {
          userMessage = "AI 响应超时，请尝试缩短文本或稍后重试";
        } else if (e.message?.includes("Insufficient") || e.message?.includes("balance")) {
          userMessage = "AI 服务余额不足，请联系管理员充值";
        } else if (e.name === "AbortError" || e.message?.includes("abort")) {
          userMessage = "请求超时，请尝试缩短文本后重试";
        } else if (e.message) {
          userMessage = `AI 服务异常：${e.message.slice(0, 100)}`;
        }
        send({ type: "error", message: userMessage });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// ── Frontend side: consume SSE ──

export async function* readSSE(
  response: Response
): AsyncGenerator<SSEEvent, void, unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Response body is not readable");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE messages are delimited by double-newline
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || ""; // keep incomplete message in buffer

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      try {
        const jsonStr = trimmed.slice(6); // remove "data: " prefix
        yield JSON.parse(jsonStr) as SSEEvent;
      } catch {
        // skip malformed events (partial chunks from SSE boundaries)
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim().startsWith("data: ")) {
    try {
      yield JSON.parse(buffer.trim().slice(6)) as SSEEvent;
    } catch {
      // skip
    }
  }
}

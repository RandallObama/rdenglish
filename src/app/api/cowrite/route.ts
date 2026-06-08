import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cowriteContinue } from "@/lib/deepseek";
import type { WritingStyle } from "@/types";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { text, style = "daily" } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "请先输入一些内容后再续写" },
        { status: 400 }
      );
    }

    if (text.length > 2000) {
      return NextResponse.json(
        { error: "文本过长，请限制在 2000 字以内" },
        { status: 400 }
      );
    }

    const validStyles: WritingStyle[] = ["academic", "business", "daily"];
    const safeStyle = validStyles.includes(style as WritingStyle)
      ? (style as WritingStyle)
      : "daily";

    const result = await cowriteContinue(text.trim(), safeStyle);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cowrite error:", error);
    return NextResponse.json(
      { error: "续写失败，请稍后重试" },
      { status: 500 }
    );
  }
}

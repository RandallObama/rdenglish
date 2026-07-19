/**
 * POST /api/profile/english-level — 设置/修改英语水平
 * Auth required. 无冷却，随时可改。
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_LEVELS = ["middle", "high", "cet4", "cet6", "ielts"];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { englishLevel } = await request.json();

    if (!englishLevel || typeof englishLevel !== "string") {
      return NextResponse.json(
        { error: "请选择英语水平" },
        { status: 400 }
      );
    }

    if (!VALID_LEVELS.includes(englishLevel)) {
      return NextResponse.json(
        { error: "无效的英语水平选项" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { englishLevel },
    });

    return NextResponse.json({ success: true, englishLevel });
  } catch (error) {
    console.error("POST /api/profile/english-level error:", error);
    return NextResponse.json(
      { error: "设置英语水平失败，请稍后重试" },
      { status: 500 }
    );
  }
}

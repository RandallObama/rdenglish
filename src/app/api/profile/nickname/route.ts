/**
 * POST /api/profile/nickname — 修改昵称（7天冷却）
 * Auth required.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "昵称不能为空" }, { status: 400 });
    }

    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 50) {
      return NextResponse.json(
        { error: "昵称长度需在 1-50 个字符之间" },
        { status: 400 }
      );
    }

    // 获取用户当前的 lastNicknameChange 检查冷却
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { lastNicknameChange: true },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 7 天冷却检查
    if (user.lastNicknameChange) {
      const daysSinceChange = differenceInDays(new Date(), user.lastNicknameChange);
      if (daysSinceChange < 7) {
        const daysRemaining = 7 - daysSinceChange;
        return NextResponse.json(
          { error: `昵称每7天可修改一次，还剩 ${daysRemaining} 天可修改` },
          { status: 403 }
        );
      }
    }

    // 更新昵称 + 记录修改时间
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: trimmed,
        lastNicknameChange: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      lastNicknameChange: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/profile/nickname error:", error);
    return NextResponse.json(
      { error: "修改昵称失败，请稍后重试" },
      { status: 500 }
    );
  }
}

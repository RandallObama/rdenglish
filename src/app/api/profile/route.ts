/**
 * GET /api/profile — 获取当前用户个人信息
 * Auth required.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    // ── Turso 自动迁移：englishLevel 列 ──
    await prisma.$executeRawUnsafe(
      `ALTER TABLE User ADD COLUMN englishLevel TEXT`
    ).catch(() => {});

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        lastNicknameChange: true,
        englishLevel: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json(
      { error: "获取个人信息失败" },
      { status: 500 }
    );
  }
}

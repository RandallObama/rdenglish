/**
 * GET /api/admin/migrate-dictation — 一键添加 dictationState 列到 Turso
 * 部署后访问一次即可，重复访问安全（已存在则跳过）
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const results: string[] = [];

  // 1. 尝试添加 dictationState 列
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "DailyWordSession" ADD COLUMN "dictationState" TEXT`
    );
    results.push('✅ dictationState 列已添加');
  } catch (err: any) {
    if (err?.message?.includes("duplicate column") || err?.message?.includes("already exists")) {
      results.push('⏭️ dictationState 列已存在，跳过');
    } else {
      results.push(`❌ dictationState 添加失败: ${err?.message || err}`);
    }
  }

  return NextResponse.json({
    ok: true,
    message: "迁移检查完成",
    results,
  });
}

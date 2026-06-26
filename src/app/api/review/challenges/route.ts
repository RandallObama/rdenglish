/**
 * GET /api/review/challenges — 列出待审核 / 已审核题目（管理员专用）
 * PATCH /api/review/challenges — 批量操作（通过 action 区分）
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 检查是否为管理员 */
async function checkAdmin(userId: string): Promise<boolean> {
  const adminIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!(await checkAdmin(session.user.id))) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending_review"; // 默认只看待审核
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = 30;
  const skip = (page - 1) * pageSize;

  const where = status === "all" ? {} : { status };

  const [challenges, total] = await Promise.all([
    prisma.weekendChallenge.findMany({
      where,
      orderBy: [{ date: "asc" }, { difficulty: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.weekendChallenge.count({ where }),
  ]);

  return NextResponse.json(
    {
      challenges,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=10",
      },
    }
  );
}

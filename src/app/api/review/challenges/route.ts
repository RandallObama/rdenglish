/**
 * GET /api/review/challenges — 列出待审核 / 已审核题目（管理员专用）
 * PATCH /api/review/challenges — 批量操作（通过 action 区分）
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAdmin } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!(await checkAdmin(session.user.id))) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rawStatus = searchParams.get("status") || "pending_review";
  // 白名单校验 status 参数，防止任意值注入
  const ALLOWED_STATUSES = ["pending_review", "approved", "rejected", "all"];
  const status = ALLOWED_STATUSES.includes(rawStatus) ? rawStatus : "pending_review";
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

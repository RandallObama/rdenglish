/**
 * POST /api/cron/generate-challenges — 自动生成下周末的挑战题目
 *
 * 由 Vercel Cron Job 每周一调用，或手动 POST 触发。
 * 验证：Authorization: Bearer <CRON_SECRET>
 */

import { NextResponse } from "next/server";
import { generateWeekendChallenges, getNextWeekendDates } from "@/lib/challenge-generate";

export async function POST(request: Request) {
  // CRON_SECRET 验证
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET 未配置" },
      { status: 500 }
    );
  }

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";

  if (token !== cronSecret) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const { saturday, sunday } = getNextWeekendDates();
    const count = await generateWeekendChallenges(saturday, sunday);

    return NextResponse.json({
      success: true,
      message: `已生成 ${count} 道题目`,
      weekend: { saturday, sunday },
      count,
    });
  } catch (error) {
    console.error("Generate challenges error:", error);
    return NextResponse.json(
      { error: "生成题目失败，请稍后重试" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/review/challenges/[id] — 审核操作（管理员专用）
 *
 * Body: { action: "approve" | "reject" | "edit", prompt?, wordLimit?, timeLimit? }
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateChallenge } from "@/lib/challenge-generate";

/** 检查是否为管理员 */
async function checkAdmin(userId: string): Promise<boolean> {
  const adminIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return adminIds.includes(userId);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (!(await checkAdmin(session.user.id))) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { action, prompt, wordLimit, timeLimit } = body;

    const challenge = await prisma.weekendChallenge.findUnique({
      where: { id },
    });

    if (!challenge) {
      return NextResponse.json({ error: "题目不存在" }, { status: 404 });
    }

    switch (action) {
      case "approve":
        await prisma.weekendChallenge.update({
          where: { id },
          data: { status: "approved" },
        });
        return NextResponse.json({ success: true, action: "approved" });

      case "reject":
        await prisma.weekendChallenge.update({
          where: { id },
          data: { status: "rejected" },
        });
        return NextResponse.json({ success: true, action: "rejected" });

      case "edit":
        await prisma.weekendChallenge.update({
          where: { id },
          data: {
            prompt: prompt || challenge.prompt,
            wordLimit: wordLimit ?? challenge.wordLimit,
            timeLimit: timeLimit ?? challenge.timeLimit,
            status: "approved",
          },
        });
        return NextResponse.json({ success: true, action: "edited_and_approved" });

      case "regenerate": {
        // 用 AI 重新生成题目，保留原日期和难度
        const generated = await generateChallenge(challenge.difficulty as "easy" | "hard");
        await prisma.weekendChallenge.update({
          where: { id },
          data: {
            prompt: generated.prompt,
            topic: generated.topic,
            wordLimit: generated.wordLimit,
            timeLimit: generated.timeLimit,
            status: "pending_review", // 重新生成后仍需审核
          },
        });
        return NextResponse.json({
          success: true,
          action: "regenerated",
          challenge: { ...challenge, ...generated, status: "pending_review" },
        });
      }

      default:
        return NextResponse.json(
          { error: `未知操作: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Review PATCH error:", error);
    return NextResponse.json(
      { error: "审核操作失败，请稍后重试" },
      { status: 500 }
    );
  }
}

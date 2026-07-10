/**
 * POST /api/profile/password — 修改密码（需已绑定手机号 + 短信验证码）
 * Auth required.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { code, newPassword } = await request.json();

    if (!code || !newPassword) {
      return NextResponse.json(
        { error: "验证码和新密码不能为空" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "密码至少需要 6 位" },
        { status: 400 }
      );
    }

    // 获取用户，检查是否已绑定手机号
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    if (!user.phone) {
      return NextResponse.json(
        { error: "请先绑定手机号后再修改密码" },
        { status: 400 }
      );
    }

    // ── 验证短信验证码（发送到已绑定的手机号）──

    const codeRecord = await prisma.smsCode.findFirst({
      where: {
        phone: user.phone,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!codeRecord) {
      return NextResponse.json(
        { error: "验证码无效或已过期，请重新获取" },
        { status: 400 }
      );
    }

    // 尝试次数限制（最多 3 次）
    if (codeRecord.attempts >= 3) {
      await prisma.smsCode.update({
        where: { id: codeRecord.id },
        data: { usedAt: new Date() },
      });
      return NextResponse.json(
        { error: "验证码尝试次数过多，请重新获取" },
        { status: 400 }
      );
    }

    // 递增尝试次数
    await prisma.smsCode.update({
      where: { id: codeRecord.id },
      data: { attempts: { increment: 1 } },
    });

    // bcrypt 常量时间比较
    const codeValid = await bcrypt.compare(code, codeRecord.codeHash);
    if (!codeValid) {
      return NextResponse.json(
        { error: "验证码错误" },
        { status: 400 }
      );
    }

    // 标记验证码已使用 + 更新密码（并行，互不依赖）
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await Promise.all([
      prisma.smsCode.update({
        where: { id: codeRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { passwordHash },
      }),
    ]);

    // 清理该手机号的过期验证码记录（可异步，不阻塞响应）
    prisma.smsCode.deleteMany({
      where: { phone: user.phone },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/profile/password error:", error);
    return NextResponse.json(
      { error: "修改密码失败，请稍后重试" },
      { status: 500 }
    );
  }
}

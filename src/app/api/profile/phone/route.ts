/**
 * POST /api/profile/phone — 绑定手机号（一次性，需要短信验证码）
 * Auth required.
 *
 * 复用已注册手机号时的防枚举逻辑
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isValidChinesePhone, normalizePhone } from "@/lib/phone-utils";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: "手机号和验证码不能为空" },
        { status: 400 }
      );
    }

    const normalized = normalizePhone(phone);

    if (!isValidChinesePhone(normalized)) {
      return NextResponse.json(
        { error: "请输入有效的手机号" },
        { status: 400 }
      );
    }

    // 检查当前用户是否已绑定手机号
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    if (currentUser.phone) {
      return NextResponse.json(
        { error: "已绑定手机号，暂不支持修改" },
        { status: 400 }
      );
    }

    // ── 验证短信验证码 ──

    const codeRecord = await prisma.smsCode.findFirst({
      where: {
        phone: normalized,
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

    // 标记验证码已使用
    await prisma.smsCode.update({
      where: { id: codeRecord.id },
      data: { usedAt: new Date() },
    });

    // ── 防枚举：检查手机号是否已被他人注册 ──

    const existing = await prisma.user.findUnique({
      where: { phone: normalized },
    });
    if (existing) {
      await bcrypt.hash("dummy", 4);
      return NextResponse.json(
        { error: "绑定失败，请稍后重试" },
        { status: 500 }
      );
    }

    // ── 绑定手机号 ──

    await prisma.user.update({
      where: { id: session.user.id },
      data: { phone: normalized },
    });

    // 清理该手机号的验证码记录
    await prisma.smsCode.deleteMany({
      where: { phone: normalized },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/profile/phone error:", error);
    return NextResponse.json(
      { error: "绑定手机号失败，请稍后重试" },
      { status: 500 }
    );
  }
}

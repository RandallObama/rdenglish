/**
 * POST /api/reset-password/confirm — 忘记密码：确认重置
 * 无需登录。
 *
 * 流程：
 * 1. 查找用户（邮箱或手机号）
 * 2. 验证短信验证码
 * 3. 更新密码 + 重置连续失败计数
 * 4. 防枚举：始终返回通用错误
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { normalizePhone } from "@/lib/phone-utils";

export async function POST(request: Request) {
  try {
    const { identifier, code, newPassword } = await request.json();

    if (!identifier || !code || !newPassword) {
      return NextResponse.json(
        { error: "参数不完整" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "密码至少需要 6 位" },
        { status: 400 }
      );
    }

    const normalized = identifier.trim().toLowerCase();

    // 查找用户（邮箱或手机号）
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalized },
          { phone: normalizePhone(normalized) },
        ],
      },
      select: { id: true, phone: true },
    });

    // 防枚举：找不到或无手机号 → 通用错误
    if (!user || !user.phone) {
      await bcrypt.hash("dummy", 4);
      return NextResponse.json(
        { error: "重置失败，请确认信息后重试" },
        { status: 400 }
      );
    }

    // ── 验证短信验证码 ──

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

    // 标记验证码已使用
    await prisma.smsCode.update({
      where: { id: codeRecord.id },
      data: { usedAt: new Date() },
    });

    // ── 更新密码 + 重置连续失败计数 ──

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
      },
    });

    // 清理验证码记录
    await prisma.smsCode.deleteMany({
      where: { phone: user.phone },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/reset-password/confirm error:", error);
    return NextResponse.json(
      { error: "重置失败，请稍后重试" },
      { status: 500 }
    );
  }
}

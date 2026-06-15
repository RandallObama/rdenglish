/**
 * POST /api/register/phone — 手机号注册
 *
 * 流程：
 * 1. 验证输入（手机号、验证码、密码）
 * 2. 验证短信验证码（查找、尝试次数、bcrypt 比较）
 * 3. 防枚举检查（已注册手机号返回通用错误）
 * 4. 创建用户 + 清理验证码记录
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isValidChinesePhone, normalizePhone, maskPhone } from "@/lib/phone-utils";
import { extractClientIp, checkSmsIpLimit } from "@/lib/rate-limit-sms";

export async function POST(request: Request) {
  const ip = extractClientIp(request);

  // IP 级注册频率限制（复用短信限速器，防止绕过验证码暴力尝试）
  const ipCheck = checkSmsIpLimit(ip);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: "注册过于频繁，请稍后再试" },
      { status: 429 }
    );
  }

  try {
    const { phone, code, password, name } = await request.json();

    if (!phone || !code || !password) {
      return NextResponse.json(
        { error: "手机号、验证码和密码不能为空" },
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

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码至少需要 6 位" },
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
      // 标记已使用，防止继续尝试
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

    // ── 防枚举：检查手机号是否已注册 ──

    const existing = await prisma.user.findUnique({
      where: { phone: normalized },
    });
    if (existing) {
      // dummy bcrypt 防止时序攻击（与邮箱注册同模式）
      await bcrypt.hash("dummy", 4);
      return NextResponse.json(
        { error: "注册失败，请稍后重试" },
        { status: 500 }
      );
    }

    // ── 创建用户 ──

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        phone: normalized,
        passwordHash,
        name: name || "",
      },
    });

    // 清理该手机号的过期验证码
    await prisma.smsCode.deleteMany({
      where: { phone: normalized },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Phone registration error:", error);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reset-password/send-code — 忘记密码：发送验证码
 * 无需登录。防枚举：始终返回相同消息。
 *
 * 流程：
 * 1. 查找用户（邮箱或手机号）
 * 2. 有手机号 → 发送验证码；无 → dummy bcrypt 防时序
 * 3. 始终返回："如果该账号绑定了手机号，验证码已发送"
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { normalizePhone } from "@/lib/phone-utils";
import { extractClientIp, checkSmsIpLimit, checkSmsPhoneLimit } from "@/lib/rate-limit-sms";
import { sendSmsCode } from "@/lib/sms";

export async function POST(request: Request) {
  const ip = extractClientIp(request);

  // IP 级限速
  const ipCheck = checkSmsIpLimit(ip);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试" },
      { status: 429 }
    );
  }

  try {
    const { identifier } = await request.json();

    if (!identifier || typeof identifier !== "string") {
      // 防枚举：不区分错误类型
      return NextResponse.json({
        success: true,
        message: "如果该账号绑定了手机号，验证码已发送",
      });
    }

    const normalized = identifier.trim().toLowerCase();

    // 查找用户：按邮箱或手机号匹配
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalized },
          { phone: normalizePhone(normalized) },
        ],
      },
      select: { phone: true },
    });

    // 未找到或无绑定手机号 → dummy bcrypt + 通用响应
    if (!user || !user.phone) {
      await bcrypt.hash("dummy", 4);
      return NextResponse.json({
        success: true,
        message: "如果该账号绑定了手机号，验证码已发送",
      });
    }

    // 手机号级限速
    const phoneCheck = await checkSmsPhoneLimit(user.phone);
    if (!phoneCheck.allowed) {
      return NextResponse.json(
        { error: phoneCheck.reason || "请求过于频繁，请稍后再试" },
        { status: 429 }
      );
    }

    // 检查是否有未过期验证码（60s 冷却）
    const recentCode = await prisma.smsCode.findFirst({
      where: {
        phone: user.phone,
        usedAt: null,
        expiresAt: { gt: new Date() },
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recentCode) {
      return NextResponse.json({
        success: true,
        message: "如果该账号绑定了手机号，验证码已发送",
      });
    }

    // 生成 6 位验证码
    const codeArray = new Uint8Array(4);
    crypto.getRandomValues(codeArray);
    const code = String(
      (codeArray[0]! % 9 + 1) * 100000 +
        (codeArray[1]! % 10) * 10000 +
        (codeArray[2]! % 10) * 1000 +
        (codeArray[3]! % 10) * 100 +
        ((codeArray[0]! + codeArray[1]!) % 10) * 10 +
        ((codeArray[2]! + codeArray[3]!) % 10)
    ).padStart(6, "0");

    // bcrypt 哈希存储
    const codeHash = await bcrypt.hash(code, 8);

    await prisma.smsCode.create({
      data: {
        phone: user.phone,
        codeHash,
        expiresAt: new Date(Date.now() + 300_000),
      },
    });

    // 发送短信
    const smsResult = await sendSmsCode(user.phone, code);

    if (!smsResult.success) {
      console.error(`[ResetPwd] SMS 发送失败 - 原因: ${smsResult.detail || "未知"}`);
      // 仍然返回通用消息，不暴露内部失败
    }

    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({
      success: true,
      message: "如果该账号绑定了手机号，验证码已发送",
      ...(isDev ? { devCode: code } : {}),
    });
  } catch (error) {
    console.error("POST /api/reset-password/send-code error:", error);
    return NextResponse.json(
      { error: "发送失败，请稍后重试" },
      { status: 500 }
    );
  }
}

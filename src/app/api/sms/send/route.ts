/**
 * POST /api/sms/send — 发送短信验证码
 *
 * 安全机制（两层限速）：
 * 1. IP 级别：每 IP 每小时 5 次（内存 Map）
 * 2. 手机号级别：60 秒冷却 + 每天 5 次（数据库 SmsRateLimit）
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isValidChinesePhone, normalizePhone, maskPhone } from "@/lib/phone-utils";
import { extractClientIp, checkSmsIpLimit, checkSmsPhoneLimit } from "@/lib/rate-limit-sms";
import { sendSmsCode } from "@/lib/sms";

export async function POST(request: Request) {
  const ip = extractClientIp(request);

  // 第一层：IP 限速
  const ipCheck = checkSmsIpLimit(ip);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试" },
      { status: 429 }
    );
  }

  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: "手机号不能为空" }, { status: 400 });
    }

    const normalized = normalizePhone(phone);

    if (!isValidChinesePhone(normalized)) {
      return NextResponse.json(
        { error: "请输入有效的手机号" },
        { status: 400 }
      );
    }

    // 第二层：手机号限速（数据库持久化，60s 冷却 + 每天 5 次）
    const phoneCheck = await checkSmsPhoneLimit(normalized);
    if (!phoneCheck.allowed) {
      return NextResponse.json(
        { error: phoneCheck.reason || "请求过于频繁，请稍后再试" },
        { status: 429 }
      );
    }

    // 检查是否有未过期的验证码（60 秒内已发送），防止重复发送
    const recentCode = await prisma.smsCode.findFirst({
      where: {
        phone: normalized,
        usedAt: null,
        expiresAt: { gt: new Date() },
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recentCode) {
      return NextResponse.json(
        { error: "验证码已发送，请60秒后再试" },
        { status: 429 }
      );
    }

    // 生成 6 位验证码（crypto 安全随机，完整 6 位独立熵）
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const code = String(randomArray[0] % 1_000_000).padStart(6, "0");

    // bcrypt 哈希存储（不存明文）
    const codeHash = await bcrypt.hash(code, 8);

    // 存储验证码（5 分钟过期）
    await prisma.smsCode.create({
      data: {
        phone: normalized,
        codeHash,
        expiresAt: new Date(Date.now() + 300_000),
      },
    });

    // 发送短信
    const smsResult = await sendSmsCode(normalized, code);

    if (!smsResult.success) {
      console.error(`[SMS] ❌ 发送失败 - 手机: ${maskPhone(normalized)}, 原因: ${smsResult.detail || "未知"}`);
      return NextResponse.json(
        { error: "验证码发送失败，请稍后重试" },
        { status: 500 }
      );
    }

    // 仅本地开发时返回验证码（Dev Token 模式，需显式设置环境变量）
    const isLocalDev = process.env.DEV_SMS_DEBUG === "true";
    return NextResponse.json({
      success: true,
      message: "验证码已发送",
      ...(isLocalDev ? { devCode: code } : {}),
    });
  } catch (error) {
    console.error("SMS send error:", error);
    return NextResponse.json(
      { error: "验证码发送失败，请稍后重试" },
      { status: 500 }
    );
  }
}

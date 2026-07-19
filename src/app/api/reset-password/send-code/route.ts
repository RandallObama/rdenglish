/**
 * POST /api/reset-password/send-code — 忘记密码：发送验证码
 * 无需登录。
 *
 * 流程：
 * 1. 查找用户（邮箱或手机号）
 * 2. 有手机号 → 发送验证码，返回 codeSent: true
 * 3. 无手机号 → dummy bcrypt 防时序，返回 codeSent: false
 * 4. 前端根据 codeSent 决定进入验证码步骤还是提示绑定手机号
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
        codeSent: false,
        message: "请输入有效的邮箱或手机号",
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

    // 未找到或无绑定手机号 → dummy bcrypt + 告知前端无法发送
    if (!user || !user.phone) {
      await bcrypt.hash("dummy", 4);
      return NextResponse.json({
        success: true,
        codeSent: false,
        message: "该账号未绑定手机号，无法通过短信重置密码",
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
        codeSent: true,
        message: "验证码已发送，请查收短信",
      });
    }

    // 生成 6 位验证码（crypto 安全随机，完整 6 位独立熵）
    const randomArray = new Uint32Array(1);
    crypto.getRandomValues(randomArray);
    const code = String(randomArray[0] % 1_000_000).padStart(6, "0");

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
    const smsSent = smsResult.success;

    if (!smsSent) {
      console.error(`[ResetPwd] SMS 发送失败 - 手机: ${user.phone.slice(0, 3)}****${user.phone.slice(-4)} - 原因: ${smsResult.detail || "未知"}`);
      // 删除刚创建的无效验证码记录，避免冷却期误判为"已发送"
      await prisma.smsCode.deleteMany({
        where: { phone: user.phone, codeHash },
      }).catch(() => {});
    }

    // 仅本地开发时返回验证码（Dev Token 模式，需显式设置环境变量）
    const isLocalDev = process.env.DEV_SMS_DEBUG === "true";
    return NextResponse.json({
      success: true,
      codeSent: smsSent,
      message: smsSent
        ? "验证码已发送，请查收短信"
        : "验证码发送失败，请稍后重试或联系管理员",
      ...(isLocalDev && smsSent ? { devCode: code } : {}),
    });
  } catch (error) {
    console.error("POST /api/reset-password/send-code error:", error);
    return NextResponse.json(
      { error: "发送失败，请稍后重试" },
      { status: 500 }
    );
  }
}

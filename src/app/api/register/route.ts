import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import dns from "dns/promises";
import { extractClientIp, checkRegisterRateLimit } from "@/lib/rate-limit-register";

/** 检查邮箱域名的 MX 记录，验证域名是否真的能收邮件 */
async function domainHasMailServer(email: string): Promise<boolean> {
  try {
    const domain = email.split("@")[1]!;
    // 3 秒超时，防止 DNS 卡住
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DNS timeout")), 3000)
      ),
    ]);
    return Array.isArray(records) && records.length > 0;
  } catch (err: any) {
    // ENOTFOUND: 域名不存在 → 拒绝
    if (err?.code === "ENOTFOUND" || err?.code === "ENODATA") {
      return false;
    }
    // 超时、网络临时故障 → 放行，不阻塞合法用户
    return true;
  }
}

export async function POST(request: Request) {
  // IP 级速率限制：防止批量注册攻击
  const ip = extractClientIp(request);
  const { allowed } = checkRegisterRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "注册过于频繁，请稍后再试" },
      { status: 429 }
    );
  }

  try {
    const { email: rawEmail, password, name } = await request.json();

    if (!rawEmail || !password) {
      return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
    }

    // 规整化：去首尾空格 + 转小写（防止 SQLite 大小写敏感 + AutoCapitalize）
    const email = rawEmail.trim().toLowerCase();

    // 邮箱格式校验：必须有 @ 且域名部分含 .
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    // DNS MX 记录检查：验证邮箱域名是否真的能收邮件
    if (!(await domainHasMailServer(email))) {
      return NextResponse.json(
        { error: "该邮箱域名无效，无法接收邮件，请使用真实邮箱" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码至少需要 6 位" },
        { status: 400 }
      );
    }

    // 防止用户枚举：已注册邮箱返回与通用错误一致的信息
    // 同时执行轻量 bcrypt 防止时序攻击
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await bcrypt.hash("dummy", 4);
      return NextResponse.json(
        { error: "注册失败，请稍后重试" },
        { status: 500 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || "",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}

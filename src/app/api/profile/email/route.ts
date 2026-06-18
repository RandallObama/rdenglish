/**
 * POST /api/profile/email — 绑定邮箱（一次性，不可修改）
 * Auth required.
 *
 * 防枚举：已占用的邮箱返回通用错误 + dummy bcrypt
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import dns from "dns/promises";

/** 检查邮箱域名的 MX 记录 */
async function domainHasMailServer(email: string): Promise<boolean> {
  try {
    const domain = email.split("@")[1]!;
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DNS timeout")), 3000)
      ),
    ]);
    return Array.isArray(records) && records.length > 0;
  } catch (err: any) {
    if (err?.code === "ENOTFOUND" || err?.code === "ENODATA") {
      return false;
    }
    return true; // 超时/临时故障 → 放行
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { email: rawEmail } = await request.json();

    if (!rawEmail || typeof rawEmail !== "string") {
      return NextResponse.json({ error: "邮箱不能为空" }, { status: 400 });
    }

    const email = rawEmail.trim().toLowerCase();

    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }

    // DNS MX 检查
    if (!(await domainHasMailServer(email))) {
      return NextResponse.json(
        { error: "该邮箱域名无效，无法接收邮件" },
        { status: 400 }
      );
    }

    // 获取当前用户，检查是否已绑定邮箱
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    if (currentUser.email) {
      return NextResponse.json(
        { error: "已绑定邮箱，暂不支持修改" },
        { status: 400 }
      );
    }

    // 防枚举：检查邮箱是否已被他人占用
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await bcrypt.hash("dummy", 4);
      return NextResponse.json(
        { error: "绑定失败，请稍后重试" },
        { status: 500 }
      );
    }

    // 绑定邮箱
    await prisma.user.update({
      where: { id: session.user.id },
      data: { email },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/profile/email error:", error);
    return NextResponse.json(
      { error: "绑定邮箱失败，请稍后重试" },
      { status: 500 }
    );
  }
}

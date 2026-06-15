/**
 * 短信发送频率限制
 *
 * 两层防护：
 * 1. IP 级别（内存 Map）：每 IP 每小时最多 5 次请求，防御多号遍历
 * 2. 手机号级别（数据库 SmsRateLimit）：每号 60 秒 1 次 + 每天 5 次，
 *    控制短信成本、防短信轰炸
 */

import { prisma } from "@/lib/prisma";

// ── IP 级别（内存 Map）──
const SMS_IP_MAX = 5;
const SMS_IP_WINDOW_MS = 3_600_000; // 1 小时

const ipRecords = new Map<string, { count: number; firstAttempt: number }>();

// 每 10 分钟清理过期 IP 记录
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRecords) {
    if (now - record.firstAttempt > SMS_IP_WINDOW_MS) {
      ipRecords.delete(ip);
    }
  }
}, 600_000);

/**
 * 从请求头提取客户端真实 IP（适配 Vercel 代理）
 */
export function extractClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

/** 检查 IP 短信发送频率 */
export function checkSmsIpLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = ipRecords.get(ip);

  if (!record || now - record.firstAttempt > SMS_IP_WINDOW_MS) {
    ipRecords.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: SMS_IP_MAX - 1 };
  }

  if (record.count >= SMS_IP_MAX) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: SMS_IP_MAX - record.count };
}

// ── 手机号级别（数据库 SmsRateLimit）──
const SMS_PHONE_COOLDOWN_MS = 60_000; // 60 秒冷却
const SMS_PHONE_DAILY_MAX = 5;

/** 检查手机号短信发送频率（数据库持久化） */
export async function checkSmsPhoneLimit(phone: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const now = new Date();
  const cooldownStart = new Date(now.getTime() - SMS_PHONE_COOLDOWN_MS);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 事务防止并发竞态
  const result = await prisma.$transaction(async (tx) => {
    // 60 秒冷却检查
    const cooldownRecord = await tx.smsRateLimit.findFirst({
      where: {
        phone,
        windowStartAt: { gte: cooldownStart },
      },
    });
    if (cooldownRecord) {
      return { allowed: false, reason: "请60秒后再试" };
    }

    // 每日上限检查
    const todayRecords = await tx.smsRateLimit.findMany({
      where: {
        phone,
        windowStartAt: { gte: dayStart },
      },
    });
    if (todayRecords.length >= SMS_PHONE_DAILY_MAX) {
      return { allowed: false, reason: "今日短信验证次数已达上限" };
    }

    // 创建新记录
    await tx.smsRateLimit.create({
      data: { phone, count: 1, windowStartAt: now },
    });

    return { allowed: true };
  });

  return result;
}

// ── 定期清理过期 SmsRateLimit 记录 ──
setInterval(async () => {
  const yesterday = new Date(Date.now() - 86_400_000);
  try {
    await prisma.smsRateLimit.deleteMany({
      where: { windowStartAt: { lt: yesterday } },
    });
    // 同时清理过期验证码
    await prisma.smsCode.deleteMany({
      where: { expiresAt: { lt: new Date() }, usedAt: null },
    });
  } catch {
    // 静默忽略清理异常
  }
}, 300_000);

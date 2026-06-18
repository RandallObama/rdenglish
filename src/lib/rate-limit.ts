import { prisma } from "@/lib/prisma";

/** 免费用户每日使用限制，可通过环境变量 FREE_DAILY_LIMIT 配置（默认 3 次） */
const FREE_DAILY_LIMIT = (() => {
  const env = process.env.FREE_DAILY_LIMIT;
  if (env === "Infinity") return Infinity;
  const n = parseInt(env || "3", 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
})();

/** AI 端点每分钟请求上限（所有用户，含 Pro），可通过 AI_RPM 环境变量配置（默认 30） */
const AI_RPM = (() => {
  const env = process.env.AI_RPM;
  if (env === "Infinity") return Infinity;
  const n = parseInt(env || "30", 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
})();

// ── 每分钟节流（内存实现，多实例不共享但作为纵深防御）──
const rpmCounters = new Map<string, { count: number; resetAt: number }>();

// 每 5 分钟清理过期计数器
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rpmCounters) {
    if (now > val.resetAt) rpmCounters.delete(key);
  }
}, 300_000);

/**
 * 检查用户是否超过每分钟 AI 请求限制。
 * 返回 true 表示允许，false 表示需要等待。
 */
export function checkAiRpm(userId: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const key = `ai:${userId}`;
  const entry = rpmCounters.get(key);

  if (!entry || now > entry.resetAt) {
    // 新窗口：60 秒
    rpmCounters.set(key, { count: 1, resetAt: now + 60_000 });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= AI_RPM) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

export { AI_RPM };

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * 获取用户当前用量信息（只读）。
 */
export async function checkUsage(
  userId: string
): Promise<{ remaining: number; limit: number; isPro: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, dailyUsage: true, lastUsageDate: true },
  });

  if (!user) {
    return { remaining: 0, limit: FREE_DAILY_LIMIT, isPro: false };
  }

  if (user.plan === "pro") {
    return { remaining: Infinity, limit: Infinity, isPro: true };
  }

  const today = getToday();

  if (user.lastUsageDate !== today) {
    return { remaining: FREE_DAILY_LIMIT, limit: FREE_DAILY_LIMIT, isPro: false };
  }

  return {
    remaining: Math.max(0, FREE_DAILY_LIMIT - user.dailyUsage),
    limit: FREE_DAILY_LIMIT,
    isPro: false,
  };
}

/**
 * 原子化扣减：在 $transaction 内使用两步 updateMany 策略，彻底消除竞态。
 *
 * 步骤：
 * 1. 先尝试「当天未超限 → 递增 1」（WHERE lastUsageDate=today AND dailyUsage<limit）
 * 2. 若失败，尝试「新的一天 → 重置为 1」（WHERE lastUsageDate!=today）
 * 3. 两步都失败 → 已超限
 *
 * 每一步 updateMany 在数据库层面都是原子的；SQLite 的 Serializable 事务
 * 保证两个并发事务完全串行执行，不存在交错读写。新的一天过渡窗口被
 * updateMany 的 WHERE 子句消除——第一个事务更新 lastUsageDate=today 后，
 * 第二个事务的 newDay 条件不再匹配，从而被正确拒绝或落入 sameDay 路径。
 */
export async function consumeUsage(
  userId: string
): Promise<{ allowed: boolean; remaining: number; limit: number; isPro: boolean }> {
  const today = getToday();

  return prisma.$transaction(async (tx) => {
    // 仅读取 plan 做快速判断（不依赖 dailyUsage/lastUsageDate 做分支决策）
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) {
      return { allowed: false, remaining: 0, limit: FREE_DAILY_LIMIT, isPro: false };
    }

    if (user.plan === "pro") {
      return { allowed: true, remaining: Infinity, limit: Infinity, isPro: true };
    }

    // ── 步骤 1：当天且未超限 → 原子递增 ──
    const sameDay = await tx.user.updateMany({
      where: {
        id: userId,
        lastUsageDate: today,
        dailyUsage: { lt: FREE_DAILY_LIMIT },
      },
      data: { dailyUsage: { increment: 1 } },
    });

    if (sameDay.count > 0) {
      // 重新读取精确值以计算 remaining
      const updated = await tx.user.findUnique({
        where: { id: userId },
        select: { dailyUsage: true },
      });
      return {
        allowed: true,
        remaining: Math.max(0, FREE_DAILY_LIMIT - updated!.dailyUsage),
        limit: FREE_DAILY_LIMIT,
        isPro: false,
      };
    }

    // ── 步骤 2：新的一天 → 重置计数为 1 ──
    // 只有在步骤 1 失败（lastUsageDate != today 或超限）时才到达这里。
    // 如果是超限的情况，lastUsageDate 已经是 today，此步 also 失败 → 正确拒绝。
    const newDay = await tx.user.updateMany({
      where: {
        id: userId,
        lastUsageDate: { not: today },
      },
      data: {
        dailyUsage: 1,
        lastUsageDate: today,
      },
    });

    if (newDay.count > 0) {
      return {
        allowed: true,
        remaining: FREE_DAILY_LIMIT - 1,
        limit: FREE_DAILY_LIMIT,
        isPro: false,
      };
    }

    // ── 步骤 3：两步均失败 → 已超限 ──
    return {
      allowed: false,
      remaining: 0,
      limit: FREE_DAILY_LIMIT,
      isPro: false,
    };
  });
}

/**
 * 仅递增计数（不检查限制）— 保留给不需要前置检查的场景。
 * 同样使用两步 updateMany 避免新一天过渡时的竞态。
 */
export async function incrementUsage(userId: string): Promise<void> {
  const today = getToday();

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { plan: true, lastUsageDate: true },
    });

    if (!user || user.plan === "pro") return;

    // 尝试当天递增
    const sameDay = await tx.user.updateMany({
      where: { id: userId, lastUsageDate: today },
      data: { dailyUsage: { increment: 1 } },
    });

    if (sameDay.count === 0) {
      // 新的一天，重置为 1
      await tx.user.updateMany({
        where: { id: userId, lastUsageDate: { not: today } },
        data: { dailyUsage: 1, lastUsageDate: today },
      });
    }
  });
}

export { FREE_DAILY_LIMIT };

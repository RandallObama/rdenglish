import { prisma } from "@/lib/prisma";

const FREE_DAILY_LIMIT = Infinity; // TODO: 正式发版前改回每日限制

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

  const today = new Date().toISOString().split("T")[0];

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
 * 原子化：检查用量 + 扣减一次。一次查询 + 一次更新（如需），替代之前的
 * checkUsage → incrementUsage → checkUsage 三次调用。
 */
export async function consumeUsage(
  userId: string
): Promise<{ allowed: boolean; remaining: number; limit: number; isPro: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, dailyUsage: true, lastUsageDate: true },
  });

  if (!user) {
    return { allowed: false, remaining: 0, limit: FREE_DAILY_LIMIT, isPro: false };
  }

  // Pro 用户无限使用，无需更新计数
  if (user.plan === "pro") {
    return { allowed: true, remaining: Infinity, limit: Infinity, isPro: true };
  }

  const today = new Date().toISOString().split("T")[0];
  const isNewDay = user.lastUsageDate !== today;
  const currentUsage = isNewDay ? 0 : user.dailyUsage;

  // 检查是否超出限制
  if (!isNewDay && currentUsage >= FREE_DAILY_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      limit: FREE_DAILY_LIMIT,
      isPro: false,
    };
  }

  // 原子更新：递增计数并设置日期
  await prisma.user.update({
    where: { id: userId },
    data: {
      dailyUsage: isNewDay ? 1 : { increment: 1 },
      lastUsageDate: today,
    },
  });

  const newUsage = currentUsage + 1;
  return {
    allowed: true,
    remaining: Math.max(0, FREE_DAILY_LIMIT - newUsage),
    limit: FREE_DAILY_LIMIT,
    isPro: false,
  };
}

/**
 * 仅递增计数（不检查限制）— 保留给不需要前置检查的场景。
 */
export async function incrementUsage(userId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, lastUsageDate: true },
  });

  if (!user || user.plan === "pro") return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      dailyUsage: user.lastUsageDate === today ? { increment: 1 } : 1,
      lastUsageDate: today,
    },
  });
}

export { FREE_DAILY_LIMIT };

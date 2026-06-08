import { prisma } from "@/lib/prisma";

const FREE_DAILY_LIMIT = Infinity; // TODO: 正式发版前改回每日限制

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

  // 如果是新的一天，重置计数
  if (user.lastUsageDate !== today) {
    await prisma.user.update({
      where: { id: userId },
      data: { dailyUsage: 0, lastUsageDate: today },
    });
    return { remaining: FREE_DAILY_LIMIT, limit: FREE_DAILY_LIMIT, isPro: false };
  }

  return {
    remaining: Math.max(0, FREE_DAILY_LIMIT - user.dailyUsage),
    limit: FREE_DAILY_LIMIT,
    isPro: false,
  };
}

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
      dailyUsage:
        user.lastUsageDate === today ? { increment: 1 } : 1,
      lastUsageDate: today,
    },
  });
}

export { FREE_DAILY_LIMIT };

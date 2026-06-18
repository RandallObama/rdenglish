/**
 * 好友请求/搜索频率限制（数据库持久化，防止 serverless 冷启动绕过）
 *
 * 防止滥用：每个用户每分钟最多 10 次好友相关操作（请求+搜索）
 */

import { prisma } from "@/lib/prisma";

const FRIEND_MAX_ATTEMPTS = 10;
const FRIEND_WINDOW_MS = 60_000; // 1 分钟

/**
 * 检查好友操作频率（请求/搜索共用计数器）。
 * 使用原子 updateMany，彻底消除并发竞态。
 * @returns allowed 是否允许，remaining 剩余次数
 */
export async function checkFriendRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
}> {
  const windowStart = new Date(Date.now() - FRIEND_WINDOW_MS);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // 步骤 1：尝试原子递增窗口内未超限的记录
    const incremented = await tx.friendRateLimit.updateMany({
      where: {
        userId,
        windowStartAt: { gte: windowStart },
        count: { lt: FRIEND_MAX_ATTEMPTS },
      },
      data: { count: { increment: 1 } },
    });

    if (incremented.count > 0) {
      // 需要重新读取以计算 remaining
      const record = await tx.friendRateLimit.findUnique({
        where: { userId },
        select: { count: true },
      });
      return {
        allowed: true,
        remaining: Math.max(0, FRIEND_MAX_ATTEMPTS - (record?.count ?? 0)),
      };
    }

    // 步骤 2：检查是否被窗口内已达上限的记录阻塞
    const blocked = await tx.friendRateLimit.findFirst({
      where: {
        userId,
        windowStartAt: { gte: windowStart },
        count: { gte: FRIEND_MAX_ATTEMPTS },
      },
    });

    if (blocked) {
      return { allowed: false, remaining: 0 };
    }

    // 步骤 3：窗口内无记录（首次操作 或 窗口已过期）
    await tx.friendRateLimit.deleteMany({ where: { userId } });
    await tx.friendRateLimit.create({
      data: { userId, count: 1, windowStartAt: now },
    });
    return { allowed: true, remaining: FRIEND_MAX_ATTEMPTS - 1 };
  });
}

// 定期清理过期窗口记录（每 5 分钟），防止表膨胀
setInterval(async () => {
  const cutoff = new Date(Date.now() - FRIEND_WINDOW_MS);
  try {
    await prisma.friendRateLimit.deleteMany({
      where: { windowStartAt: { lt: cutoff } },
    });
  } catch {
    // 静默忽略清理异常
  }
}, 300_000);

export { FRIEND_MAX_ATTEMPTS, FRIEND_WINDOW_MS };

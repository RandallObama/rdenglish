/**
 * 好友请求频率限制（内存 Map）
 *
 * 防止滥用：每个用户每分钟最多 10 次好友请求
 */

const requestCounts = new Map<string, number[]>();
const FRIEND_REQUEST_MAX = 10;
const FRIEND_REQUEST_WINDOW_MS = 60_000; // 1 分钟

// 每 5 分钟清理过期记录
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of requestCounts) {
    const filtered = timestamps.filter((t) => now - t < FRIEND_REQUEST_WINDOW_MS);
    if (filtered.length === 0) {
      requestCounts.delete(userId);
    } else {
      requestCounts.set(userId, filtered);
    }
  }
}, 300_000);

/**
 * 检查好友请求频率
 * @returns allowed 是否允许，remaining 剩余次数
 */
export function checkFriendRequestLimit(userId: string): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  const timestamps = (requestCounts.get(userId) || []).filter(
    (t) => now - t < FRIEND_REQUEST_WINDOW_MS
  );

  if (timestamps.length >= FRIEND_REQUEST_MAX) {
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  requestCounts.set(userId, timestamps);

  return { allowed: true, remaining: FRIEND_REQUEST_MAX - timestamps.length };
}

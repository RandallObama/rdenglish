/**
 * 注册接口 IP 级速率限制（内存存储）
 *
 * 防批量注册攻击：每个 IP 每小时最多尝试 3 次。
 * 存储在内存中，Vercel Serverless 冷启动会重置——这是可接受的折衷，
 * 因为攻击者需要不断更换 IP 且每次冷启动至少需等待函数预热。
 */

const REGISTER_MAX_ATTEMPTS = 3;
const REGISTER_WINDOW_MS = 3_600_000; // 1 小时

const attempts = new Map<string, { count: number; firstAttempt: number }>();

// 每 10 分钟清理过期记录，防止内存泄漏
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of attempts) {
    if (now - record.firstAttempt > REGISTER_WINDOW_MS) {
      attempts.delete(ip);
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

/**
 * 检查 IP 注册速率限制
 * @returns allowed 是否放行，remaining 剩余次数
 */
export function checkRegisterRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now - record.firstAttempt > REGISTER_WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: REGISTER_MAX_ATTEMPTS - 1 };
  }

  if (record.count >= REGISTER_MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return {
    allowed: true,
    remaining: REGISTER_MAX_ATTEMPTS - record.count,
  };
}

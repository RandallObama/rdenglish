/**
 * Next.js 16 Proxy（原 Middleware）
 *
 * 职责：
 *   1. 生成并注入 CSP nonce，替换 'unsafe-inline' 提供更严格的 XSS 防护
 *   2. 注入基础安全响应头
 *
 * 注意：
 *   - API 认证由各路由 handler 独立执行，proxy 不做拦截
 *   - 开发环境保留 'unsafe-eval'（React 调试需要）
 *   - 生产环境使用 nonce 替代 unsafe-inline，Next.js 自动将 nonce
 *     应用到框架内联脚本/样式上
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // ── CSRF 防护：对状态变更请求校验 Origin 头 ──
  const method = request.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const origin = request.headers.get("origin");
    // 如果请求带有 Origin 头（浏览器发起的跨站/同站请求），必须与 Host 匹配
    if (origin) {
      try {
        const originHost = new URL(origin).host;
        const host = request.nextUrl.host;
        if (originHost !== host) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    // 无 Origin 头的请求（原生 app、curl 等）放行，由 session 认证兜底
  }

  // 生成每个请求唯一的 nonce 值
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  // content_security_policy
  const cspHeader = [
    "default-src 'self'",
    // 生产环境用 nonce 替代 unsafe-inline；开发环境保留 unsafe-inline（HMR 需要）
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDev ? " 'unsafe-inline' 'unsafe-eval'" : ""
    }`,
    `style-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-inline'" : ""}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; ");

  const response = NextResponse.next();

  // 将 nonce 放入响应头中，Next.js 会自动将其应用到框架内联脚本/样式上
  request.headers.set("x-nonce", nonce);
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  response.headers.set("X-DNS-Prefetch-Control", "on");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico).*)",
  ],
};

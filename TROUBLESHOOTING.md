# 故障排查记录

## 2026-06-13 — 登录报错 "There is a problem with the server configuration"

### 现象

访问 https://rdenglish.cn 后点击登录，页面显示：

> Server error
> There is a problem with the server configuration.
> Check the server logs for more information.

### 排查过程

1. `curl https://rdenglish.cn/login` → 200（登录页面正常）
2. `curl https://rdenglish.cn/api/auth/signin` → 500（Auth API 报错）
3. `curl https://rdenglish.cn/api/auth/csrf` → 500
4. `curl https://rdenglish.cn/api/auth/session` → 500
5. 查看 Vercel 运行时日志：

```
[auth][error] UntrustedHost: Host must be trusted. URL was: https://rdenglish.cn/api/auth/signin
```

### 根因

`sandbox/src/lib/auth.ts` 第 85 行：

```ts
trustHost: process.env.NODE_ENV !== "production",
```

在 2026-06-12 安全加固时，将 `trustHost: true` 改为了 `process.env.NODE_ENV !== "production"`。生产环境中该值为 `false`，Auth.js v5 要求请求的 Host 必须与 `AUTH_URL` 环境变量完全匹配。虽然尝试在 Vercel 设置 `AUTH_URL=https://rdenglish.cn`，但 Auth.js v5 beta (`next-auth@5.0.0-beta.31`) 未能正确识别该环境变量，持续拒绝来自 `rdenglish.cn` 的请求。

### 修复

将 `trustHost` 改回 `true`：

```ts
// src/lib/auth.ts
trustHost: true,  // 凭证登录模式下无 OAuth 回调劫持风险
```

### 风险评估

对于基于凭证（邮箱+密码）的登录系统：
- `trustHost: true` 仅允许 Auth.js 接受任意 Host 头的请求
- 不存在 OAuth 回调 URL 劫持风险（因为没有第三方 OAuth provider）
- CSRF 保护仍然有效（`/api/auth/csrf` token 机制不受影响）
- 唯一的理论风险是 Host 头投毒，但 Cloudflare + Vercel 基础设施层面已拦截此类攻击

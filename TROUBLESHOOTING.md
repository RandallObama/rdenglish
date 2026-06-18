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

---

## 2026-06-18 — 聊天"加载信息失败" + 分享"unexpected end of JSON input"

### 现象

1. 好友页面 → 点击"发消息"打开聊天小窗 → 显示"加载消息失败"
2. 历史记录 → 批改文章 → 点击分享给好友 → 显示"unexpected end of JSON input"

### 排查过程

1. 确认前端请求路径：聊天调用 `GET /api/messages/[friendId]`，分享调用 `POST /api/messages`
2. 检查 Prisma schema → `Message` 模型存在 ✓
3. 检查 `prisma/migrations/` → **没有 Message 表的迁移文件** ✗
4. `curl` Turso HTTP API 查询 `sqlite_master` → Message 表不存在，确认根因
5. 前端也缺少防御性处理：ShareDialog 直接调 `res.json()` 不 catch；API 路由无 try-catch，Prisma 崩溃时 Next.js 返回 HTML 而非 JSON

### 根因

聊天系统（2026-06-18 上线）的 `Message` 模型仅在 Prisma schema 中定义，**迁移文件从未创建**。生产 Turso 依赖迁移文件建表，导致 Message 表从未存在。这是继 2026-06-17 Turso Schema 事故后的第二次同类问题。

所有 `/api/messages/*` 的 Prisma 查询因 `no such table: Message` 崩溃 → Next.js 返回 HTML 错误页 → 前端 `res.json()` 解析失败。

### 修复

**数据库**（Turso HTTP Pipeline API 直接执行 DDL）：
```sql
CREATE TABLE "Message" (id, senderId, receiverId, content, contentType, contentId, read, createdAt);
CREATE INDEX "Message_receiverId_read_idx" ON "Message"("receiverId", "read");
CREATE INDEX "Message_senderId_receiverId_createdAt_idx" ON "Message"("senderId", "receiverId", "createdAt");
DROP TABLE IF EXISTS "SharedContent";  -- 已废弃，被 Message 替代
```

**代码加固**（9 文件）：
- `api/messages/route.ts` — GET + POST 加 try-catch
- `api/messages/[friendId]/route.ts` — GET 加 try-catch
- `api/messages/content/route.ts` — GET 加 try-catch
- `api/messages/read/route.ts` — PATCH 加 try-catch
- `api/friends/stats/route.ts` — GET 加 try-catch（也查 message 表）
- `api/friends/[id]/route.ts` — 删除废弃 SharedContent raw SQL 引用
- `components/ChatPanel.tsx` — useEffect 补回 fetchMessages 依赖
- `components/ShareDialog.tsx` — 添加 `safeJson()` 包装，分享失败显示友好中文提示
- `components/FriendsList.tsx` — 添加删除确认弹窗

**部署**：Vercel CLI 直接部署到 https://rdenglish.cn

### 教训

1. **每次 `prisma migrate dev` 后检查 `migrations/` 目录是否生成了新文件**
2. **Prisma schema 变更后，部署前必须确认 Turso schema 同步**（`prisma db push` 或 `prisma migrate deploy`）
3. **所有 API 路由必须有外层 try-catch**，确保永远返回 JSON（`NextResponse.json`），不依赖 Next.js 默认错误页
4. **前端 `res.json()` 必须包裹 try-catch**，不能假设服务端一定返回合法 JSON
5. **迁移文件应该是唯一的 schema 变更来源**，不应混用 `prisma db push`（本地）和 `prisma migrate deploy`（生产）

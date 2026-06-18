# rdenglish.cn 待修复问题清单

> 生成日期: 2026-06-17 | 来源: 全站安全/逻辑/流畅性审查

---

## 🔴 已修复（本轮）

- [x] **SharedInbox 闭包 bug** — `getContentEndpoint` 读取 stale `viewingItem`，内容详情永远显示"暂无内容"
- [x] **好友请求竞态条件** — accept/reject 并发可同时成功，已改为 `updateMany`/`deleteMany` + `status: "pending"` 原子操作
- [x] **LoginAttempt 唯一约束** — 无 unique 约束，并发登录可绕过限流。已添加 `@@unique([email])` + 原子 `updateMany`
- [x] **AI 端点无限流** — Pro 用户 `remaining: Infinity`。已添加每分钟节流（默认 30 RPM，可通过 `AI_RPM` 环境变量配置）
- [x] **.env.local 密钥** — 已添加安全警告注释

---

## 🟠 高优先级（已全部修复 ✅ 2026-06-17）

| # | 类别 | 问题 | 修复方式 |
|---|------|------|---------|
| ~~H1~~ | 前端 | EssayCorrector 缺少 AbortController/超时 | 添加 AbortController + 25s 超时，匹配 Writer/Optimizer |
| ~~H2~~ | 前端 | OptimizationHistoryPage 吞没错误 | 改为 async/await + try/catch + toast.error + cleanup |
| ~~H3~~ | 安全 | 内存 Map 限流 serverless 无效 | `rate-limit-friend.ts` 改为 DB 持久化（`FriendRateLimit` 表 + 原子 `updateMany`） |
| ~~H4~~ | 安全 | 好友搜索无频率限制+可枚举用户 | 添加 `checkFriendRateLimit` + 最小 2 字符 + 排除 blocked 用户 |
| ~~H5~~ | 架构 | 5 个流式生成器返回类型为 `any` | 全部改为 `AsyncGenerator<string, T, unknown>` 精确类型 |
| ~~H6~~ | 架构 | OpenAI 客户端在 4 个文件中重复实例化 | 提取到 `lib/ai-client.ts` 单例 + 60s timeout + maxRetries=2 |

## 🟡 中优先级

| # | 类别 | 问题 | 位置 |
|---|------|------|------|
| M1 | 安全 | `trustHost: true` 禁用 NextAuth 主机头验证 | `lib/auth.ts:116` |
| M2 | 安全 | CSP 使用 `'unsafe-inline'` 削弱 XSS 防护 | `next.config.ts:9` |
| M3 | 安全 | 已删除用户 JWT 仍有效，session 无吊销检查 | `lib/auth.ts:124-136` |
| M4 | 逻辑 | `setInterval` 清理任务在 serverless 从不执行 | `lib/auth.ts:53-62`, `lib/rate-limit-sms.ts:106-119` |
| M5 | 逻辑 | 被拉黑用户仍可在好友搜索中被找到 | `api/friends/search/route.ts:39` |
| M6 | 逻辑 | 分享收件箱硬编码 50 条上限，无分页 | `api/friends/shared/route.ts:27` |
| M7 | 逻辑 | Cowrite 消耗配额但不保存结果到 Writing 表 | `api/cowrite/route.ts` |
| M8 | 逻辑 | 语法模式 GET 无 `take` 分页，可能全量加载 | `api/grammar-patterns/route.ts:20` |
| M9 | 前端 | BackButton 首页 `router.back()` 可能离开应用 | `components/BackButton.tsx:11` |
| M10 | 前端 | 提交按钮加载时完全消失（应 disabled+spinner） | Writer, EssayCorrector, Optimizer |
| M11 | 架构 | 类型在 `deepseek.ts` 和 `types/index.ts` 重复定义 | 两个文件 |
| M12 | 架构 | recharts ~400KB 应考虑动态导入 | `components/ReportCharts.tsx` |
| M13 | 逻辑 | 好友删除不清理共享单词本成员资格 | `api/friends/[id]/route.ts:27-37` |
| M14 | 逻辑 | 单词本邀请有 check-then-act 竞态 | `api/wordbooks/[id]/invite/route.ts:53-67` |

## 🟢 低优先级 / 代码气味

| # | 问题 | 位置 |
|---|------|------|
| L1 | `extractJson` 在 5 个文件中重复 | `correct.ts`, `deepseek.ts`, `optimize.ts`, `grammar-patterns.ts`, `ai-insights.ts` |
| L2 | `extractClientIp` 在 2 个文件中重复 | `rate-limit-register.ts`, `rate-limit-sms.ts` |
| L3 | `ai-insights.ts` 中 `extractJson` 是死代码 | `lib/ai-insights.ts:34-43` |
| L4 | 安全头在 proxy.ts 和 next.config.ts 重复 | 两个文件 |
| L5 | 所有流式 `while(true)` 无显式超时 | 4 个 streaming route 文件 |
| L6 | 无请求体大小限制在 `request.json()` 前 | 所有 POST/PATCH 路由 |
| L7 | AI SDK 调用无 timeout 配置 | 4 个 lib 文件 |
| L8 | `DEEPSEEK_API_KEY \|\| ""` 静默回退而非启动时报错 | 4 个 lib 文件 |
| L9 | 多个图标按钮缺少 `aria-label` | 多个组件 |
| L10 | 按钮 data prop 类型为 `Record<string, unknown>` | `components/SaveButton.tsx:10` |
| L11 | 点击外部关闭 useEffect 在 3 个组件中重复 | Writer, EssayCorrector, Optimizer |
| L12 | 复制到剪贴板逻辑在 2 个组件中重复 | ResultCard, OptimizeResult |
| L13 | 手机注册 IP 限制与短信发送共享计数器 | `rate-limit-sms.ts`, `register/phone/route.ts` |

---

## ✅ 已确认安全/正确的领域

- SQL 注入: 100% Prisma ORM，无原始 SQL ✅
- IDOR: 所有删除操作检查 `item.userId !== session.user.id` ✅
- 密码: bcrypt cost=10，常量时间比较 ✅
- SMS 验证码: bcrypt 哈希存储，3 次尝试上限 ✅
- 防枚举注册: 虚拟 bcrypt 防止时序攻击 ✅
- 安全头: HSTS preload, X-Frame-Options DENY, nosniff ✅
- 加载状态: 9 个路由段有 loading.tsx ✅
- 空状态: 每个列表组件有空状态 UI ✅
- Toast: 所有操作有成功/失败反馈 ✅
- 流式 SSE: AbortController + 超时 ✅
- 无循环依赖 ✅

---
name: project-setup-architecture
description: rdenglish.cn 项目初始化与架构指南 — 新功能开发、API 路由创建、数据库变更、AI 集成、部署的标准工作流
triggers:
  - 新建页面/路由
  - 新建 API 端点
  - 数据库 schema 变更
  - 接入 AI 功能
  - 新建组件
  - 部署到 Vercel
  - 添加第三方依赖
  - 项目架构咨询
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep, WebFetch, WebSearch]
---

# rdenglish.cn — 项目设置与架构

> 面向 Next.js 16 + Turso + DeepSeek + NextAuth v5 全栈英语学习平台的标准工作流。
> 项目位置：`D:\Admin\Desktop\workspace\rdenglish`

---

## 项目全景

| 维度 | 选型 |
|---|---|
| 框架 | Next.js 16 App Router (React 19, TypeScript 5) |
| 数据库 | Turso (libSQL), Prisma ORM 7, `@libsql/client` |
| 认证 | NextAuth v5 beta (JWT, 邮箱+手机号双通道) |
| AI | DeepSeek API, 通过 OpenAI SDK (`openai` npm) |
| UI | Tailwind CSS 4 + shadcn/ui + lucide-react |
| 状态 | @tanstack/react-query (服务端缓存) |
| 部署 | Vercel, **手动** `vercel --prod --yes` |

---

## 第一部分：目录结构

```
src/
├── app/                        # Next.js App Router 页面
│   ├── api/                    # API 路由 (共 ~50+ 个端点)
│   │   ├── auth/[...nextauth]/ # NextAuth 配置
│   │   ├── correct/            # 写作批改
│   │   ├── optimize/           # 写作优化
│   │   ├── translate/          # AI 翻译
│   │   ├── vocab/daily/        # 每日5词全流程
│   │   ├── friends/            # 好友系统
│   │   ├── wordbooks/          # 共享单词本
│   │   ├── messages/           # 站内信
│   │   ├── challenges/         # 周末写作挑战
│   │   ├── report/             # 学习周报
│   │   ├── profile/            # 个人中心
│   │   ├── register/           # 注册
│   │   ├── reset-password/     # 密码重置
│   │   └── cron/               # 定时任务
│   ├── page.tsx (首页)         # 含 Hero, OnboardingBanner, PricingPreview
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── dashboard/page.tsx + client.tsx
│   ├── correct/page.tsx + client.tsx
│   ├── optimize/page.tsx + client.tsx
│   ├── vocab-daily/page.tsx + client.tsx
│   ├── tools/page.tsx           # 工具集：打印/默写纸、词汇表
│   ├── friends/page.tsx + client.tsx  # 好友+聊天窗
│   ├── notebook/page.tsx
│   ├── history/page.tsx + client.tsx
│   ├── report/page.tsx
│   ├── profile/page.tsx
│   └── [其他页面]
├── components/                 # 共享组件
│   ├── ui/                     # shadcn/ui 基础组件 (约15个)
│   └── *.tsx                   # 业务组件 (约40个)
├── lib/                        # 工具库 & 业务逻辑
│   ├── prisma.ts               # Prisma client 单例
│   ├── auth.ts                 # NextAuth 配置
│   ├── auth-helpers.ts         # 鉴权辅助函数
│   ├── ai-client.ts            # DeepSeek/OpenAI 客户端
│   ├── deepseek.ts             # DeepSeek API 封装
│   ├── correct.ts              # 批改业务逻辑
│   ├── optimize.ts             # 优化业务逻辑
│   ├── vocab-daily.ts          # 每日5词逻辑
│   ├── grammar-patterns.ts     # 语法病历本逻辑
│   ├── report-aggregator.ts    # 周报数据聚合
│   ├── stream.ts               # SSE 流式工具
│   ├── password-utils.ts       # bcrypt 密码工具
│   ├── phone-utils.ts          # 手机号校验
│   ├── sms.ts                  # 短信发送
│   ├── rate-limit*.ts          # 限流中间件
│   ├── print-vocab-html.ts     # 打印/默写纸模板
│   └── utils.ts                # 通用工具函数
├── types/
│   └── index.ts                # TypeScript 类型定义
└── generated/prisma/           # Prisma 生成代码 (gitignore)
```

**关键约定**：
- 页面有交互状态的 → `page.tsx`（服务端壳）+ `client.tsx`（'use client' 主体）
- 纯静态页面 → 单文件 `page.tsx`
- API 路由按功能模块分目录，RESTful 风格
- shadcn/ui 组件位于 `components/ui/`，使用 `npx shadcn add` 添加

---

## 第二部分：新建页面

### 2.1 纯静态页面

```bash
# 示例：新建"关于"页
mkdir -p src/app/about
```

**`src/app/about/page.tsx`**:
```tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "关于 - rdenglish",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#312F2C] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">关于 rdenglish</h1>
        {/* 内容 */}
      </div>
    </main>
  );
}
```

### 2.2 交互页面（含客户端状态）

**`src/app/new-feature/page.tsx`** (服务端壳):
```tsx
import { Metadata } from "next";
import NewFeatureClient from "./client";

export const metadata: Metadata = {
  title: "新功能 - rdenglish",
};

export default function NewFeaturePage() {
  return <NewFeatureClient />;
}
```

**`src/app/new-feature/client.tsx`** (客户端主体):
```tsx
"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function NewFeatureClient() {
  const { data: session } = useSession();
  const [state, setState] = useState(/* ... */);

  const { data, isLoading } = useQuery({
    queryKey: ["new-feature"],
    queryFn: async () => {
      const res = await fetch("/api/new-feature");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (isLoading) return <LoadingProgress />;

  return (
    <div className="min-h-screen flex flex-col bg-[#ABD1C6]">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full p-4">
        {/* 页面内容 */}
      </main>
      <Footer />
    </div>
  );
}
```

### 2.3 页面清单
| 页面 | 路由 | client.tsx |
|---|---|---|
| 首页 | `/` | 无 (RSC) |
| 登录 | `/login` | 无 (纯客户端表单) |
| 注册 | `/register` | 无 |
| 仪表盘 | `/dashboard` | ✅ |
| AI 批改 | `/correct` | ✅ |
| AI 优化 | `/optimize` | ✅ |
| 每日5词 | `/vocab-daily` | ✅ |
| 好友 | `/friends` | ✅ |
| 单词本 | `/wordbooks` | ✅ |
| 写作挑战 | `/challenge` | ✅ |
| 历史 | `/history` | ✅ |
| 学习报告 | `/report` | ✅ |
| 个人中心 | `/profile` | ✅ |
| 笔记本 | `/notebook` | 无 |
| 语法病历 | `/grammar-patterns` | 无 |
| 工具集 | `/tools` | 无 |

---

## 第三部分：新建 API 路由

### 3.1 标准模式

API 路由关键要素：**鉴权 → 校验 → 业务逻辑 → 错误处理 → Turso 自动迁移**

**`src/app/api/new-feature/route.ts`**:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

// === Turso 自动迁移 (GFW 环境) ===
async function ensureSchema() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE NewTable ADD COLUMN new_column TEXT`
    );
  } catch (_) {
    // 列已存在，忽略
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. 鉴权
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // 2. 自动迁移（每个 API 调用时检查）
    await ensureSchema();

    // 3. 业务逻辑
    const data = await prisma.someModel.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[new-feature] GET error:", error);
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    await ensureSchema();

    const body = await req.json();
    // 校验...
    if (!body.field) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const result = await prisma.someModel.create({
      data: {
        userId: session.user.id,
        field: body.field,
      },
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("[new-feature] POST error:", error);
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}
```

### 3.2 鉴权辅助函数

**`src/lib/auth-helpers.ts`** 提供以下函数：
```ts
import { getAuthSession } from "@/lib/auth-helpers";
// 返回 `session` 或 null，用于所有需登录的 API

// 可选鉴权（游客也可用，但登录用户有额外功能）:
// 直接使用 next-auth 的 auth()
```

### 3.3 SSE 流式输出

AI 功能使用 SSE 流式响应，参考 `src/lib/stream.ts`:
```ts
// 流式返回模式（在 API route 中）
return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  },
});
```

---

## 第四部分：数据库变更

### 4.1 添加新表

1. **编辑 `prisma/schema.prisma`**，添加新 model：
```prisma
model NewModel {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  field1    String
  field2    String?  // JSON 字段用 String + 注释说明结构
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, createdAt])
}
```

2. **运行 Prisma 生成**：
```bash
npx prisma generate
```

3. **在相关 API 路由中添加自动迁移兜底**（用于 Turso 云端同步）：
```ts
async function ensureNewModel() {
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE NewModel (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
        field1 TEXT NOT NULL,
        field2 TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    );
  } catch (_) { /* 表已存在 */ }
  // 后续按需添加 ALTER TABLE 补列
}
```

### 4.2 添加列

直接在 API route 中嵌入 DDL：
```ts
async function ensureColumns() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE ExistingModel ADD COLUMN new_col TEXT`);
  } catch (_) { /* 列已存在 */ }
}
```

**模式优先级**：Prisma Migrate (本地 dev.db) → Turso `push` → API route 兜底 DDL

### 4.3 Prisma Client 单例

`src/lib/prisma.ts` 确保开发时热重载不创建多个实例：
```ts
import { PrismaClient } from "@/generated/prisma";
// ... globalThis 单例模式 ...
export const prisma = new PrismaClient();
```

---

## 第五部分：AI 功能集成

### 5.1 DeepSeek 客户端

`src/lib/ai-client.ts` — 基于 OpenAI SDK 的 DeepSeek 客户端配置。

**使用时导入**：
```ts
import { getAIClient } from "@/lib/ai-client";
// 返回 OpenAI 实例，baseURL 指向 DeepSeek API
```

### 5.2 标准 AI 调用模式

```ts
import { getAIClient } from "@/lib/ai-client";
import { getAuthSession } from "@/lib/auth-helpers";

// 在 API route 中：
const session = await getAuthSession();
const ai = getAIClient();

// 非流式调用
const completion = await ai.chat.completions.create({
  model: "deepseek-chat", // 或 deepseek-reasoner
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
  temperature: 0.7,
  response_format: { type: "json_object" }, // 需要结构化输出时
});

const result = JSON.parse(completion.choices[0].message.content!);

// 流式调用（SSE）
const stream = await ai.chat.completions.create({
  model: "deepseek-chat",
  messages: [...],
  stream: true,
});
// 通过 src/lib/stream.ts 工具处理
```

### 5.3 现有 AI 功能模块

| 功能 | API 路由 | 核心 lib |
|---|---|---|
| 翻译 | `/api/translate` | `ai-client.ts` |
| 写作批改 | `/api/correct` | `correct.ts` |
| 写作优化 | `/api/optimize` | `optimize.ts` |
| 每日5词生成 | `/api/vocab/daily/generate` | `vocab-daily.ts` |
| 情景对话 | `/api/vocab/daily/scenario` | `vocab-daily.ts` |
| 句子练习 | `/api/vocab/daily/practice` | `vocab-daily.ts` |
| 默写 | `/api/vocab/daily/dictation` | `vocab-daily.ts` |
| 语法模式分析 | `/api/grammar-patterns` | `grammar-patterns.ts` |
| 挑战题目生成 | `/api/cron/generate-challenges` | `challenge-generate.ts` |
| 学习洞察 | `/api/report/insights` | `ai-insights.ts` |

### 5.4 新增 AI 功能检查清单

- [ ] 在 `src/lib/` 创建业务逻辑文件
- [ ] 设计 System Prompt（清晰的角色定义 + 输出格式要求）
- [ ] 使用 `response_format: { type: "json_object" }` 要求结构化输出
- [ ] 添加 JSON 解析错误处理（AI 可能返回非标准 JSON）
- [ ] 如涉及用户内容，记录 usage 用量
- [ ] API route 增加鉴权 + 限流

---

## 第六部分：UI 组件

### 6.1 shadcn/ui 使用

```bash
# 添加新组件
npx shadcn@latest add accordion
# 组件输出到 src/components/ui/accordion.tsx
```

### 6.2 配色方案

| 元素 | 颜色 | 用途 |
|---|---|---|
| 深色底 | `#312F2C` | 主背景、导航栏、强视觉区 |
| 浅色底 | `#ABD1C6` | 次级背景、卡片区 |
| 白色文字 | `text-white` | 深色底上的文字 |
| 深色文字 | `text-[#312F2C]` | 浅色底上的文字 |

**交替原则**：相邻区块深浅交替，避免同色连排。

### 6.3 通用布局组件

页面结构使用这些组件：
- `<Navbar />` — 顶部导航栏
- `<Footer />` — 底部页脚（仅在 Desktop 布局中使用）
- `<BackButton />` / `<BackButtonWrapper />` — 返回按钮
- `<LoadingProgress />` — 加载态
- `<Providers />` — 根 Provider（Session + QueryClient + Theme）
- `<OnboardingBanner />` — 首页引导横幅

### 6.4 新建业务组件

放在 `src/components/` 根目录（非 `ui/` 子目录），命名用 PascalCase：

```tsx
// src/components/NewFeatureCard.tsx
"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface NewFeatureCardProps {
  title: string;
  onAction: () => void;
}

export function NewFeatureCard({ title, onAction }: NewFeatureCardProps) {
  return (
    <Card className="p-4 bg-white">
      <h3 className="text-lg font-semibold text-[#312F2C]">{title}</h3>
      <Button onClick={onAction} className="mt-2 bg-[#312F2C] text-white">
        开始使用
      </Button>
    </Card>
  );
}
```

---

## 第七部分：部署

### 7.1 标准流程

```bash
cd /d/Admin/Desktop/workspace/rdenglish

# 1. TypeScript 类型检查
npx tsc --noEmit

# 2. 构建检查
npm run build

# 3. 手动部署到 Vercel
vercel --prod --yes
```

### 7.2 部署检查清单

- [ ] `npx tsc --noEmit` 零错误
- [ ] `npm run build` 成功
- [ ] Vercel Dashboard 环境变量完整（DEEPSEEK_API_KEY, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, AUTH_SECRET, 等）
- [ ] 已执行 `npx prisma generate`（postinstall 脚本通常会自动执行）
- [ ] 暂存/提交变更（非必须，但推荐）

### 7.3 重要约定

- **不使用 Vercel Git 自动部署** — 已在 Vercel Dashboard 禁用
- 环境变量通过 Vercel Dashboard 管理，部分敏感变量不在代码仓库中
- GFW 环境下 Turbo 连接可能不稳定，DNS 补丁文件 `dns-patch.js` 和 `vercel-proxy.js` 已就位

---

## 第八部分：添加依赖

```bash
# 生产依赖
npm install <package>

# 开发依赖
npm install -D <package>

# shadcn/ui 组件（使用专用 CLI）
npx shadcn@latest add <component-name>
```

原则：
- 优先使用已安装的库（避免引入重复功能）
- UI 组件用 shadcn/ui，不使用 MUI/AntDesign
- HTTP 请求用 `fetch`，不引入 axios
- 日期处理用 `date-fns`，不引入 moment/dayjs
- 图标用 `lucide-react`，不引入其他图标库

---

## 第九部分：代码约定

### 9.1 命名规范

| 类型 | 规范 | 示例 |
|---|---|---|
| API 路由文件 | `route.ts` | `src/app/api/correct/route.ts` |
| 页面文件 | `page.tsx` | `src/app/dashboard/page.tsx` |
| 客户端组件 | `client.tsx` | `src/app/dashboard/client.tsx` |
| 加载态 | `loading.tsx` | `src/app/dashboard/loading.tsx` |
| 业务组件 | PascalCase `.tsx` | `src/components/EssayCorrector.tsx` |
| UI 基础组件 | kebab-case `.tsx` | `src/components/ui/button.tsx` |
| lib 文件 | kebab-case `.ts` | `src/lib/rate-limit-sms.ts` |

### 9.2 错误处理

```ts
// API route 统一错误格式
return NextResponse.json(
  { error: "人类可读的错误信息" },
  { status: 4XX }
);

// 前端统一处理
if (!res.ok) {
  const { error } = await res.json();
  toast.error(error || "操作失败");
}
```

### 9.3 TypeScript

- 严格模式 (`strict: true`)
- 共享类型定义在 `src/types/index.ts`
- API 响应类型就近定义在 route 或 lib 文件中
- 使用 `@/*` 导入别名

### 9.4 Prettier/ESLint

- ESLint 配置：`eslint.config.mjs`，使用 `eslint-config-next`
- Tailwind class 排序由 Prettier 自动处理
- 运行 `npm run lint` 检查

---

## 工作习惯（重要）

本项目遵循两个核心习惯（见 `CLAUDE.md`）：

1. **写代码前先反问澄清** — 接到任务后反问细节直到 ≥95% 把握
2. **写完代码后用独立子代理验证** — 不自己审查自己，新开一个 general-purpose agent 以"陌生人"视角检验

---

## 快速参考：新增功能完整流程

```bash
# 1. 设计：确认需求、API 契约、UI 布局

# 2. 数据库（如需新表/新列）
#    编辑 prisma/schema.prisma → npx prisma generate → 写自动迁移 DDL

# 3. 业务逻辑
#    创建 src/lib/new-feature.ts

# 4. API 路由
#    创建 src/app/api/new-feature/route.ts
#    模式：鉴权 → 自动迁移 → 逻辑 → 错误处理

# 5. 页面/组件
#    创建 src/app/new-feature/page.tsx + client.tsx
#    或创建 src/components/NewFeature.tsx

# 6. 检查
#    npx tsc --noEmit && npm run build

# 7. 部署
#    vercel --prod --yes
```

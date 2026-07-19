import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Provider } from "next-auth/providers";

// ── 登录速率限制（数据库持久化，防止暴力破解）──
const LOGIN_MAX_ATTEMPTS = 5;    // 每个邮箱最多尝试次数
const LOGIN_WINDOW_MS = 60_000;  // 时间窗口 60 秒

async function checkLoginRateLimit(email: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MS);
  const now = new Date();

  // 使用事务 + updateMany 原子操作，防止并发竞态
  const allowed = await prisma.$transaction(async (tx) => {
    // 步骤 1：尝试原子递增窗口内未超限的记录
    const incremented = await tx.loginAttempt.updateMany({
      where: {
        email,
        firstAttemptAt: { gte: windowStart },
        count: { lt: LOGIN_MAX_ATTEMPTS },
      },
      data: { count: { increment: 1 } },
    });

    if (incremented.count > 0) {
      return true; // 成功递增，允许登录
    }

    // 步骤 2：检查是否被窗口内已达上限的记录阻塞
    const blocked = await tx.loginAttempt.findFirst({
      where: {
        email,
        firstAttemptAt: { gte: windowStart },
        count: { gte: LOGIN_MAX_ATTEMPTS },
      },
    });

    if (blocked) {
      return false; // 已达上限，拦截
    }

    // 步骤 3：窗口内无记录（首次尝试 或 窗口已过期）
    // 删除旧窗口记录（如果有），创建新窗口记录
    // 同时清理该邮箱的所有过期记录（lazy cleanup，替代 setInterval）
    await tx.loginAttempt.deleteMany({ where: { email } });
    // 顺便清理所有过期记录，防止表膨胀（lazy cleanup）
    await tx.loginAttempt.deleteMany({
      where: { firstAttemptAt: { lt: new Date(Date.now() - LOGIN_WINDOW_MS) } },
    });
    await tx.loginAttempt.create({
      data: { email, count: 1, firstAttemptAt: now },
    });
    return true;
  });

  return allowed;
}

/** 登录成功后清除该邮箱的限速记录 */
async function clearLoginRateLimit(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { email } });
}

// ── 速率限制结束 ──

const providers: Provider[] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "邮箱", type: "email" },
      password: { label: "密码", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      // 规整化：去首尾空格 + 邮箱转小写（防止 SQLite 大小写敏感导致查不到用户）
      const identifier = (credentials.email as string).trim().toLowerCase();
      const password = (credentials.password as string).trim();

      // 登录速率限制检查（按 identifier 存储，兼容邮箱和手机号）
      if (!(await checkLoginRateLimit(identifier))) {
        throw new Error("登录尝试过于频繁，请 60 秒后再试");
      }

      // 自动迁移：确保 Turso 上有 lockedUntil、tokenVersion、englishLevel 列
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN "lockedUntil" DATETIME`
      ).catch(() => {});
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0`
      ).catch(() => {});
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "User" ADD COLUMN "englishLevel" TEXT`
      ).catch(() => {});

      // 自动识别手机号 / 邮箱
      const isPhone = /^1[3-9]\d{9}$/.test(identifier);

      const user = isPhone
        ? await prisma.user.findUnique({ where: { phone: identifier } })
        : await prisma.user.findUnique({ where: { email: identifier } });

      if (!user) {
        return null;
      }

      // 账户锁定检查：连续失败 3 次后锁定 15 分钟
      const LOCKOUT_MINUTES = 15;
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remainingMin = Math.ceil(
          (new Date(user.lockedUntil).getTime() - Date.now()) / 60_000
        );
        throw new Error(`账户已临时锁定，请 ${remainingMin} 分钟后再试`);
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        // 连续失败计数（原子递增）
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: { increment: 1 } },
          select: { failedLoginAttempts: true },
        });

        if (updated.failedLoginAttempts >= 3) {
          // 锁定账户 15 分钟
          const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000);
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockedUntil: lockUntil,
            },
          }).catch(() => {}); // 忽略 lockedUntil 列不存在的情况

          const err = new CredentialsSignin();
          err.code = "RESET_NEEDED";
          throw err;
        }
        return null;
      }

      // 登录成功：清除限速记录 + 重置连续失败计数 + 解除锁定
      await clearLoginRateLimit(identifier);
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      }).catch(() => {});

      return {
        id: user.id,
        email: user.email || user.phone || "",
        name: user.name || "",
      };
    },
  }),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  secret: process.env.AUTH_SECRET,
  // trustHost 不显式设置，由 Auth.js 根据环境变量自动决定：
  //   - VERCEL / CF_PAGES 环境 → 自动信任
  //   - NODE_ENV !== "production" → 开发环境自动信任
  //   - AUTH_URL 已配置 → 自动信任
  //   只有生产环境且无已知平台标识时 trustHost=false，提供额外防护
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 天 JWT 过期（之前默认 30 天过长）
  },
  cookies: {
    sessionToken: {
      options: {
        sameSite: "lax", // CSRF 保护：跨站 POST 不发送 cookie，但允许顶层导航携带
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
      }

      // 验证用户仍存在于数据库中（防止已删除用户的 JWT 仍然有效）
      // token.sub 是 Auth.js 自动设置的 JWT subject claim（即用户 ID）
      const userId = token.sub as string | undefined;
      if (userId) {
        try {
          // 自动迁移：确保 Turso 上有 tokenVersion、lockedUntil、englishLevel 列
          await prisma.$executeRawUnsafe(
            `ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0`
          ).catch(() => {});
          await prisma.$executeRawUnsafe(
            `ALTER TABLE "User" ADD COLUMN "lockedUntil" DATETIME`
          ).catch(() => {});
          await prisma.$executeRawUnsafe(
            `ALTER TABLE "User" ADD COLUMN "englishLevel" TEXT`
          ).catch(() => {});

          const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, englishLevel: true, tokenVersion: true },
          });
          if (!existingUser) {
            // 用户已被删除，销毁会话
            return null;
          }
          // 会话失效检查：如果 tokenVersion 不匹配（密码已修改），销毁会话
          if (
            existingUser.tokenVersion !== undefined &&
            token.tokenVersion !== undefined &&
            existingUser.tokenVersion !== token.tokenVersion
          ) {
            return null;
          }
          token.englishLevel = existingUser.englishLevel;
          // 首次登录时设置 tokenVersion，后续每次回调保持同步
          if (existingUser.tokenVersion !== undefined) {
            token.tokenVersion = existingUser.tokenVersion;
          }
        } catch {
          // 数据库查询失败时，默认允许通过，避免误封
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.englishLevel = token.englishLevel as string | null;
      }
      return session;
    },
  },
});

// ── NextAuth 类型扩展 ──
declare module "next-auth" {
  interface User {
    englishLevel?: string | null;
  }
  interface Session {
    user: {
      id: string;
      englishLevel?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    englishLevel?: string | null;
    tokenVersion?: number;
  }
}

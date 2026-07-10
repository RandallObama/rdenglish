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
    await tx.loginAttempt.deleteMany({ where: { email } });
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

// 定期清理过期窗口记录（每 5 分钟），防止表膨胀
setInterval(async () => {
  const cutoff = new Date(Date.now() - LOGIN_WINDOW_MS);
  try {
    await prisma.loginAttempt.deleteMany({
      where: { firstAttemptAt: { lt: cutoff } },
    });
  } catch {
    // 静默忽略清理异常
  }
}, 300_000);
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

      // 自动识别手机号 / 邮箱
      const isPhone = /^1[3-9]\d{9}$/.test(identifier);

      const user = isPhone
        ? await prisma.user.findUnique({ where: { phone: identifier } })
        : await prisma.user.findUnique({ where: { email: identifier } });

      if (!user) {
        return null;
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
          // Throw CredentialsSignin with custom code so frontend can detect it
          const err = new CredentialsSignin();
          err.code = "RESET_NEEDED";
          throw err;
        }
        return null;
      }

      // 登录成功，清除限速记录 + 重置连续失败计数
      await clearLoginRateLimit(identifier);
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0 },
      });

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
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

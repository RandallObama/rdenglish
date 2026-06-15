import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Provider } from "next-auth/providers";

// ── 登录速率限制（数据库持久化，防止暴力破解）──
const LOGIN_MAX_ATTEMPTS = 5;    // 每个邮箱最多尝试次数
const LOGIN_WINDOW_MS = 60_000;  // 时间窗口 60 秒

async function checkLoginRateLimit(email: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MS);
  const now = new Date();

  // 使用事务防止并发竞态
  const allowed = await prisma.$transaction(async (tx) => {
    const existing = await tx.loginAttempt.findFirst({
      where: {
        email,
        firstAttemptAt: { gte: windowStart },
      },
    });

    if (!existing) {
      // 时间窗口内的首次尝试 → 创建记录
      await tx.loginAttempt.create({
        data: { email, count: 1, firstAttemptAt: now },
      });
      return true;
    }

    if (existing.count >= LOGIN_MAX_ATTEMPTS) {
      return false; // 已超限，拦截
    }

    // 递增计数
    await tx.loginAttempt.update({
      where: { id: existing.id },
      data: { count: { increment: 1 } },
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

      const email = credentials.email as string;
      const password = credentials.password as string;

      // 登录速率限制检查
      if (!(await checkLoginRateLimit(email))) {
        throw new Error("登录尝试过于频繁，请 60 秒后再试");
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return null;
      }

      // 登录成功，清除该邮箱的限速记录
      await clearLoginRateLimit(email);

      return {
        id: user.id,
        email: user.email,
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

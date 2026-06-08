import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createAdapter() {
  const dbUrl = process.env.DATABASE_URL || "file:./dev.db";

  // 生产环境：Turso 云数据库 (libsql:// 协议)
  if (dbUrl.startsWith("libsql://")) {
    return new PrismaLibSql({
      url: dbUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  // 本地开发：SQLite 文件
  return new PrismaLibSql({ url: dbUrl });
}

const adapter = createAdapter();

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

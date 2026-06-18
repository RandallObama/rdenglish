import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
let adapter;
if (dbUrl.startsWith("libsql://")) {
  adapter = new PrismaLibSql({ url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN });
} else {
  adapter = new PrismaLibSql({ url: dbUrl });
}

const prisma = new PrismaClient({ adapter });

async function main() {
  // 查找所有 email 非空的用户
  const users = await prisma.user.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true },
  });

  let updated = 0;
  for (const user of users) {
    const original = user.email!;
    const normalized = original.trim().toLowerCase();
    if (original !== normalized) {
      await prisma.user.update({
        where: { id: user.id },
        data: { email: normalized },
      });
      console.log(`Updated: ${original} → ${normalized}`);
      updated++;
    }
  }

  console.log(`\nDone. ${updated} emails normalized out of ${users.length} total.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

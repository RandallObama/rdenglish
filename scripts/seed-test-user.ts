import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const hash = bcrypt.hashSync("test123456", 10);

  const user = await prisma.user.upsert({
    where: { email: "test@rdenglish.cn" },
    update: {},
    create: {
      email: "test@rdenglish.cn",
      passwordHash: hash,
      name: "测试用户",
    },
  });

  console.log("Test user:", { id: user.id, email: user.email, name: user.name });

  // Set admin user IDs env var equivalent
  console.log("\nAdd this to .env.local ADMIN_USER_IDS:");
  console.log(user.id);

  await prisma.$disconnect();
}

main().catch(console.error);

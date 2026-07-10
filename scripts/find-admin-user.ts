/**
 * 查询生产数据库中的用户，找到管理员的用户 ID
 */
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    console.error("无法读取 .env.local");
  }
}

loadEnv();

const url = process.env.TURSO_DATABASE_URL || "";
const authToken = process.env.TURSO_AUTH_TOKEN || "";

if (!url || !authToken) {
  console.error("缺少环境变量");
  process.exit(1);
}

async function main() {
  const client = createClient({ url: url!, authToken: authToken! });

  const users = await client.execute(
    "SELECT id, email, name, plan, createdAt FROM User ORDER BY createdAt DESC LIMIT 10"
  );

  console.log("生产数据库用户:\n");
  for (const row of users.rows) {
    console.log(`  ${row.name || "(无昵称)"}  |  ${row.email || "(无邮箱)"}  |  ${row.plan}  |  ${row.createdAt}`);
    console.log(`  ID: ${row.id}`);
    console.log();
  }

  client.close();
}

main().catch(console.error);

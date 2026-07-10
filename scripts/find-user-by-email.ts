import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

function loadEnv() {
  const content = readFileSync("C:\\Users\\DELL\\Desktop\\workspace\\rdenglish\\.env.local", "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
      value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

const email = process.argv[2] || "3555431170@qq.com";

async function main() {
  const result = await client.execute({
    sql: "SELECT id, email, name, plan, createdAt FROM User WHERE email = ?",
    args: [email],
  });

  if (result.rows.length === 0) {
    console.log(`未找到 ${email}`);
  } else {
    for (const row of result.rows) {
      console.log(`ID: ${row.id}`);
      console.log(`邮箱: ${row.email}`);
      console.log(`昵称: ${row.name || "(无)"}`);
      console.log(`注册时间: ${row.createdAt}`);
    }
  }
  client.close();
}

main();

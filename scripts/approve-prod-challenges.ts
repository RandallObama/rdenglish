/**
 * 直接在生产数据库审核通过所有 pending 题目
 */
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "",
  authToken: process.env.TURSO_AUTH_TOKEN || "",
});

async function main() {
  // 查看当前题目
  const before = await client.execute("SELECT id, date, difficulty, topic, status FROM WeekendChallenge ORDER BY date, difficulty");
  console.log("=== 审核前 ===");
  for (const r of before.rows) console.log(`  ${r.date} | ${r.difficulty} | ${r.topic} | ${r.status}`);

  // 全部通过
  const result = await client.execute(
    "UPDATE WeekendChallenge SET status = 'approved' WHERE status = 'pending_review'"
  );
  console.log(`\n✅ 已通过 ${result.rowsAffected} 道题目`);

  // 验证
  const after = await client.execute("SELECT id, date, difficulty, topic, status FROM WeekendChallenge ORDER BY date, difficulty");
  console.log("\n=== 审核后 ===");
  for (const r of after.rows) console.log(`  ${r.date} | ${r.difficulty} | ${r.topic} | ${r.status}`);

  client.close();
}

main();

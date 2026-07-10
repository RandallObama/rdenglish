/**
 * 生成第一批周末挑战题目
 */
import { execSync } from "child_process";

async function main() {
  // 从 Vercel 拉取 CRON_SECRET（输出到临时文件避免覆盖 .env.local）
  let CRON_SECRET = "";
  try {
    const output = execSync(
      "cd C:\\Users\\DELL\\Desktop\\workspace\\rdenglish && vercel env pull .env.vercel-temp --yes 2>&1",
      { encoding: "utf-8" }
    );
    const fs = require("fs");
    const content = fs.readFileSync(
      "C:\\Users\\DELL\\Desktop\\workspace\\rdenglish\\.env.vercel-temp",
      "utf-8"
    );
    const cronLine = content.split("\n").find((l: string) => l.startsWith("CRON_SECRET="));
    if (cronLine) CRON_SECRET = cronLine.split("=")[1].trim();
    // 清理
    try { fs.unlinkSync("C:\\Users\\DELL\\Desktop\\workspace\\rdenglish\\.env.vercel-temp"); } catch {}
  } catch (e) {
    console.error("拉取环境变量失败:", e);
  }

  if (!CRON_SECRET) {
    console.log("❌ 无法获取 CRON_SECRET");
    console.log("手动执行: curl -X POST https://rdenglish.cn/api/cron/generate-challenges -H 'Authorization: Bearer <CRON_SECRET>'");
    process.exit(1);
  }

  console.log("正在生成周末挑战题目...");
  const res = await fetch("https://rdenglish.cn/api/cron/generate-challenges", {
    method: "POST",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);

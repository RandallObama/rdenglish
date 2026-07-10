/**
 * 直接在脚本内完成：拉取 Vercel 环境变量 → 调生产 API 生成题目
 */
import { execSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";

async function main() {
  // Step 1: 拉取 Vercel 生产环境变量
  console.log("拉取 Vercel 生产环境变量...");
  try {
    execSync(
      "vercel env pull .env.vercel-tmp --yes --environment production",
      { cwd: "C:\\Users\\DELL\\Desktop\\workspace\\rdenglish", encoding: "utf-8", stdio: "pipe" }
    );
  } catch (e: any) {
    console.log("拉取失败:", e.stderr || e.message);
    process.exit(1);
  }

  // Step 2: 读取 CRON_SECRET
  const content = readFileSync(
    "C:\\Users\\DELL\\Desktop\\workspace\\rdenglish\\.env.vercel-tmp",
    "utf-8"
  );
  const cronLine = content.split("\n").find((l) => l.startsWith("CRON_SECRET="));
  const CRON_SECRET = cronLine?.split("=")[1]?.trim();

  // 清理临时文件
  try { unlinkSync("C:\\Users\\DELL\\Desktop\\workspace\\rdenglish\\.env.vercel-tmp"); } catch {}

  if (!CRON_SECRET) {
    console.log("❌ 未找到 CRON_SECRET");
    console.log("内容预览:", content.slice(0, 200));
    process.exit(1);
  }

  // Step 3: 调生产 API 生成题目
  console.log("调用生产 API 生成题目...");
  const res = await fetch("https://rdenglish.cn/api/cron/generate-challenges", {
    method: "POST",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main();

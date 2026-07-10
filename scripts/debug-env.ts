import { execSync } from "child_process";
import { readFileSync, unlinkSync } from "fs";

execSync(
  "vercel env pull .env.vercel-tmp --yes --environment production",
  { cwd: "C:\\Users\\DELL\\Desktop\\workspace\\rdenglish", encoding: "utf-8", stdio: "pipe" }
);
const content = readFileSync("C:\\Users\\DELL\\Desktop\\workspace\\rdenglish\\.env.vercel-tmp", "utf-8");
console.log("=== Pulled env vars ===");
console.log(content);
try { unlinkSync("C:\\Users\\DELL\\Desktop\\workspace\\rdenglish\\.env.vercel-tmp"); } catch {}

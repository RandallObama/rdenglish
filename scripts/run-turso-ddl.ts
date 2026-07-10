/**
 * 在 Turso 生产数据库上执行 DDL 建表
 */
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";

// 从 .env.local 读取环境变量
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
      // 去掉引号
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
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("缺少 TURSO_DATABASE_URL 或 TURSO_AUTH_TOKEN 环境变量");
  process.exit(1);
}

console.log("连接 Turso:", url);

const client = createClient({ url, authToken });

const statements = [
  `CREATE TABLE IF NOT EXISTS WeekendChallenge (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    examType TEXT NOT NULL,
    topic TEXT NOT NULL,
    prompt TEXT NOT NULL,
    wordLimit INTEGER NOT NULL,
    timeLimit INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review',
    source TEXT NOT NULL DEFAULT 'ai',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, difficulty)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_WeekendChallenge_date ON WeekendChallenge(date)`,
  `CREATE INDEX IF NOT EXISTS idx_WeekendChallenge_status ON WeekendChallenge(status)`,
  `CREATE TABLE IF NOT EXISTS ChallengeSubmission (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    challengeId TEXT NOT NULL REFERENCES WeekendChallenge(id),
    content TEXT NOT NULL,
    score REAL,
    maxScore REAL,
    scores TEXT,
    feedback TEXT,
    wordCount INTEGER,
    timeSpent INTEGER,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, challengeId)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ChallengeSubmission_userId_createdAt ON ChallengeSubmission(userId, createdAt)`,
  `CREATE INDEX IF NOT EXISTS idx_ChallengeSubmission_challengeId ON ChallengeSubmission(challengeId)`,
];

async function main() {
  for (const sql of statements) {
    const label = sql.slice(0, 50).replace(/\s+/g, " ");
    try {
      await client.execute(sql);
      console.log(`✅ ${label}...`);
    } catch (e: any) {
      console.error(`❌ ${label}...`, e.message);
    }
  }

  // 验证
  const tables = await client.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('WeekendChallenge','ChallengeSubmission')`
  );
  console.log(`\n验证: 新建表 ${tables.rows.length}/2`);
  tables.rows.forEach((r) => console.log(`  - ${r.name}`));

  client.close();
  console.log("\n✅ Turso DDL 执行完成");
}

main().catch((e) => {
  console.error("执行失败:", e.message);
  process.exit(1);
});

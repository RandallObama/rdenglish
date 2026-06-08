// 在 Turso 云数据库上创建表
// 运行方式：node setup-db.js
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@libsql/client");

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const SQL = [
  `CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL,
    name TEXT, plan TEXT DEFAULT 'free', dailyUsage INTEGER DEFAULT 0,
    lastUsageDate TEXT, createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS Writing (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    sourceText TEXT NOT NULL, resultText TEXT NOT NULL, style TEXT DEFAULT 'daily',
    examType TEXT DEFAULT 'general', grammarNotes TEXT, vocabNotes TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS Correction (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    essayText TEXT NOT NULL, examType TEXT DEFAULT 'general',
    totalScore REAL NOT NULL, maxScore REAL NOT NULL, scores TEXT,
    sentenceCorrections TEXT, grammarIssues TEXT, vocabSuggestions TEXT,
    improvementSuggestions TEXT, overallComment TEXT, createdAt TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS SavedWord (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    word TEXT NOT NULL, chinese TEXT NOT NULL, collocations TEXT, synonyms TEXT,
    level TEXT, usage TEXT, examples TEXT, commonErrors TEXT, examFocus TEXT,
    source TEXT DEFAULT 'translate', createdAt TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS SavedGrammar (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    point TEXT NOT NULL, level TEXT, function TEXT, structure TEXT,
    explanation TEXT, examples TEXT, commonMistakes TEXT, examTip TEXT,
    source TEXT DEFAULT 'translate', createdAt TEXT DEFAULT (datetime('now'))
  )`,
];

async function setup() {
  console.log("Creating tables on Turso...");
  for (const sql of SQL) {
    await client.execute(sql);
  }
  console.log("Done! All 5 tables created.");
}

setup().catch((e) => console.error("Error:", e.message));

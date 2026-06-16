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
    id TEXT PRIMARY KEY, email TEXT, phone TEXT, passwordHash TEXT NOT NULL,
    name TEXT, plan TEXT DEFAULT 'free', dailyUsage INTEGER DEFAULT 0,
    lastUsageDate TEXT, createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS User_email_key ON User(email)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS User_phone_key ON User(phone)`,
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
  `CREATE TABLE IF NOT EXISTS LoginAttempt (
    id TEXT PRIMARY KEY, email TEXT NOT NULL, count INTEGER DEFAULT 1,
    firstAttemptAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS SmsCode (
    id TEXT PRIMARY KEY, phone TEXT NOT NULL, codeHash TEXT NOT NULL,
    attempts INTEGER DEFAULT 0, expiresAt TEXT NOT NULL, usedAt TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS SmsRateLimit (
    id TEXT PRIMARY KEY, phone TEXT NOT NULL, count INTEGER DEFAULT 1,
    windowStartAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS Friendship (
    id TEXT PRIMARY KEY, requesterId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    addresseeId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS Friendship_requesterId_addresseeId_key ON Friendship(requesterId, addresseeId)`,
  `CREATE TABLE IF NOT EXISTS SharedContent (
    id TEXT PRIMARY KEY, senderId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    receiverId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    contentType TEXT NOT NULL, contentId TEXT NOT NULL, message TEXT,
    read INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now'))
  )`,
];

async function setup() {
  console.log("Creating tables on Turso...");
  for (const sql of SQL) {
    await client.execute(sql);
  }
  console.log("Done! All 11 tables created.");
}

setup().catch((e) => console.error("Error:", e.message));

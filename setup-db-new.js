// 在 Turso 上创建好友系统和单词本的表
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@libsql/client");

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const SQL = [
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

  `CREATE TABLE IF NOT EXISTS Wordbook (
    id TEXT PRIMARY KEY, name TEXT NOT NULL,
    creatorId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS WordbookMember (
    id TEXT PRIMARY KEY,
    wordbookId TEXT NOT NULL REFERENCES Wordbook(id) ON DELETE CASCADE,
    userId TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'editor', joinedAt TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS WordbookMember_wordbookId_userId_key ON WordbookMember(wordbookId, userId)`,

  `CREATE TABLE IF NOT EXISTS WordbookWord (
    id TEXT PRIMARY KEY,
    wordbookId TEXT NOT NULL REFERENCES Wordbook(id) ON DELETE CASCADE,
    word TEXT NOT NULL, chinese TEXT NOT NULL,
    level TEXT, usage TEXT,
    addedById TEXT NOT NULL REFERENCES User(id) ON DELETE CASCADE,
    createdAt TEXT DEFAULT (datetime('now'))
  )`,
];

async function setup() {
  console.log("Creating new tables on Turso...");
  for (const sql of SQL) {
    await client.execute(sql);
    console.log("✓", sql.substring(0, 60).replace(/\s+/g, " ") + "...");
  }
  console.log("Done! Friendship, SharedContent, Wordbook, WordbookMember, WordbookWord tables ready.");
}

setup().catch((e) => console.error("Error:", e.message));

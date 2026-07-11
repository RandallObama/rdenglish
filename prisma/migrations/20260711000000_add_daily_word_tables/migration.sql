-- Daily Word Tables (2026-07-11)
-- Tables for the daily 5-word vocabulary feature

-- DailyWordSession: one session per user per day
CREATE TABLE IF NOT EXISTS "DailyWordSession" (
    "id"               TEXT NOT NULL PRIMARY KEY,
    "userId"           TEXT NOT NULL,
    "date"             TEXT NOT NULL,
    "topic"            TEXT NOT NULL,
    "examType"         TEXT NOT NULL,
    "difficulty"       TEXT NOT NULL DEFAULT 'medium',
    "words"            TEXT NOT NULL,
    "status"           TEXT NOT NULL DEFAULT 'generated',
    "currentWordIndex" INTEGER NOT NULL DEFAULT 0,
    "scenarioMessages" TEXT,
    "usageConsumed"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyWordSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyWordSession_userId_date_key" ON "DailyWordSession"("userId", "date");
CREATE INDEX IF NOT EXISTS "DailyWordSession_userId_createdAt_idx" ON "DailyWordSession"("userId", "createdAt");

-- WordPractice: individual word practice records within a session
CREATE TABLE IF NOT EXISTS "WordPractice" (
    "id"            TEXT NOT NULL PRIMARY KEY,
    "sessionId"     TEXT NOT NULL,
    "word"          TEXT NOT NULL,
    "wordIndex"     INTEGER NOT NULL,
    "userSentence"  TEXT,
    "aiScore"       INTEGER,
    "aiComment"     TEXT,
    "naturalness"   TEXT,
    "grammarOk"     INTEGER,
    "fullResponse"  TEXT,
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WordPractice_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DailyWordSession"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "WordPractice_sessionId_wordIndex_idx" ON "WordPractice"("sessionId", "wordIndex");

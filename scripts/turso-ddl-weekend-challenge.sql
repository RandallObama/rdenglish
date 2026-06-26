-- 周末写作挑战 — Turso 生产数据库 DDL
-- 执行方式：在 Turso CLI 或 Turso Dashboard SQL Editor 中运行

CREATE TABLE WeekendChallenge (
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
);

CREATE INDEX idx_WeekendChallenge_date ON WeekendChallenge(date);
CREATE INDEX idx_WeekendChallenge_status ON WeekendChallenge(status);

CREATE TABLE ChallengeSubmission (
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
);

CREATE INDEX idx_ChallengeSubmission_userId_createdAt ON ChallengeSubmission(userId, createdAt);
CREATE INDEX idx_ChallengeSubmission_challengeId ON ChallengeSubmission(challengeId);

-- Drop old unique index (if created by Prisma on SQLite)
DROP INDEX IF EXISTS "User_email_key";

-- Step 1: Create new User table with email nullable and phone added
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "dailyUsage" INTEGER NOT NULL DEFAULT 0,
    "lastUsageDate" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy existing data
INSERT INTO "new_User" ("id", "email", "passwordHash", "name", "plan", "dailyUsage", "lastUsageDate", "createdAt", "updatedAt")
SELECT "id", "email", "passwordHash", "name", "plan", "dailyUsage", "lastUsageDate", "createdAt", "updatedAt"
FROM "User";

-- Step 3: Drop old table and rename
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

-- Step 4: Create unique indexes for nullable unique columns
-- SQLite treats NULLs as distinct in unique indexes, allowing multiple NULL rows
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- Step 5: Create SmsCode table (verification code storage)
CREATE TABLE "SmsCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "SmsCode_phone_idx" ON "SmsCode"("phone");
CREATE INDEX "SmsCode_createdAt_idx" ON "SmsCode"("createdAt");

-- Step 6: Create SmsRateLimit table (SMS send frequency control)
CREATE TABLE "SmsRateLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowStartAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "SmsRateLimit_phone_windowStartAt_idx" ON "SmsRateLimit"("phone", "windowStartAt");

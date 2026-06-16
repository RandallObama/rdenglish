-- Step 1: Create Wordbook table
CREATE TABLE "Wordbook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Wordbook_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 2: Create WordbookMember table
CREATE TABLE "WordbookMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wordbookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WordbookMember_wordbookId_fkey" FOREIGN KEY ("wordbookId") REFERENCES "Wordbook"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WordbookMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WordbookMember_wordbookId_userId_key" ON "WordbookMember"("wordbookId", "userId");

-- Step 3: Create WordbookWord table
CREATE TABLE "WordbookWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wordbookId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "chinese" TEXT NOT NULL,
    "level" TEXT,
    "usage" TEXT,
    "addedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WordbookWord_wordbookId_fkey" FOREIGN KEY ("wordbookId") REFERENCES "Wordbook"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WordbookWord_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "WordbookWord_wordbookId_idx" ON "WordbookWord"("wordbookId");

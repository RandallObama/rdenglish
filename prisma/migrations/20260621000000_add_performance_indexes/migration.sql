-- Performance Indexes (2026-06-21)
-- Hot-path indexes for frequently queried columns

-- Wordbook: lookup by creator + sort by updatedAt
CREATE INDEX IF NOT EXISTS "Wordbook_creatorId_idx" ON "Wordbook"("creatorId");
CREATE INDEX IF NOT EXISTS "Wordbook_updatedAt_idx" ON "Wordbook"("updatedAt");

-- Friendship: lookup by requester (friend requests, search)
CREATE INDEX IF NOT EXISTS "Friendship_requesterId_idx" ON "Friendship"("requesterId");

-- WordbookMember: lookup by userId (my memberships)
CREATE INDEX IF NOT EXISTS "WordbookMember_userId_idx" ON "WordbookMember"("userId");

-- SavedWord: dedup check on (userId, word)
CREATE INDEX IF NOT EXISTS "SavedWord_userId_word_idx" ON "SavedWord"("userId", "word");

-- SavedGrammar: dedup check on (userId, point)
CREATE INDEX IF NOT EXISTS "SavedGrammar_userId_point_idx" ON "SavedGrammar"("userId", "point");

-- WordbookWord: list words in a wordbook sorted by createdAt
CREATE INDEX IF NOT EXISTS "WordbookWord_wordbookId_createdAt_idx" ON "WordbookWord"("wordbookId", "createdAt");

-- Message: sender timeline lookup for conversation list
CREATE INDEX IF NOT EXISTS "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");

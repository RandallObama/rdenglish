-- AlterTable SavedWord
ALTER TABLE "SavedWord" ADD COLUMN "phoneticUK" TEXT;
ALTER TABLE "SavedWord" ADD COLUMN "phoneticUS" TEXT;

-- AlterTable WordbookWord
ALTER TABLE "WordbookWord" ADD COLUMN "phoneticUK" TEXT;
ALTER TABLE "WordbookWord" ADD COLUMN "phoneticUS" TEXT;

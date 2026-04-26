-- Agent 10 — Insider Note source tracking + fabrication audit lockdown.
-- Adds 6 columns to Project to mark provenance of two buyer-facing free-text
-- fields: analystNote (UI label "Analyst Note (insider intel)") and
-- honestConcern. Writes go through src/lib/project-content-source.ts which
-- BLOCKS source='ai_generated' and stamps source/author/verifiedAt for
-- legitimate operator saves.
--
-- Source vocabulary: 'operator' | 'ai_generated' | 'imported' | 'unknown'.
-- Backfill: existing non-null notes are marked 'unknown' so the admin edit
-- page surfaces them for operator review (orange "? Source unknown" badge).

ALTER TABLE "Project"
  ADD COLUMN "analystNoteSource"       TEXT,
  ADD COLUMN "analystNoteAuthor"       TEXT,
  ADD COLUMN "analystNoteVerifiedAt"   TIMESTAMP(3),
  ADD COLUMN "honestConcernSource"     TEXT,
  ADD COLUMN "honestConcernAuthor"     TEXT,
  ADD COLUMN "honestConcernVerifiedAt" TIMESTAMP(3);

-- Backfill: any pre-existing note content predates source tracking and must
-- be reviewed by the operator. Mark it 'unknown' (orange badge in admin UI)
-- rather than silently trusting it as 'operator'-verified.
UPDATE "Project"
   SET "analystNoteSource" = 'unknown'
 WHERE "analystNote" IS NOT NULL
   AND "analystNoteSource" IS NULL;

UPDATE "Project"
   SET "honestConcernSource" = 'unknown'
 WHERE "honestConcern" IS NOT NULL
   AND "honestConcernSource" IS NULL;

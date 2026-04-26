-- AlterTable: Stage A soft capture fields on ChatSession (Agent 4).
-- captureStage vocabulary: 'soft' (Stage A form saved name+phone, no OTP)
--                       | 'verified' (Stage B OTP, Agent 5)
--                       | 'skipped' (buyer hit "Continue without")
--                       | NULL (not yet asked).
-- These are buyer-trust fields per docs/AGENT_DISCIPLINE.md §7 — only the
-- /api/chat/capture POST route writes here, never the AI pipeline.
ALTER TABLE "ChatSession" ADD COLUMN "capturedPhone" TEXT;
ALTER TABLE "ChatSession" ADD COLUMN "capturedName"  TEXT;
ALTER TABLE "ChatSession" ADD COLUMN "captureStage"  TEXT;
ALTER TABLE "ChatSession" ADD COLUMN "capturedAt"    TIMESTAMP(3);

-- Index supports the admin "captured leads" filter without scanning all sessions.
CREATE INDEX "ChatSession_captureStage_idx" ON "ChatSession"("captureStage");

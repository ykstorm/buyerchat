-- Agent 8 — Visit follow-up scheduler + CRM event audit log.
-- Adds 6 timestamp fields + 1 boolean flag to SiteVisit for the
-- T-24 / T-3 / T-1 / T+1 / T+24 / T+48 / T+72 follow-up sequence
-- defined in docs/source-of-truth/visit-followup-playbook.txt.

ALTER TABLE "SiteVisit"
  ADD COLUMN "followupT24Sent"   TIMESTAMP(3),
  ADD COLUMN "followupT3Sent"    TIMESTAMP(3),
  ADD COLUMN "followupT1Sent"    TIMESTAMP(3),
  ADD COLUMN "postVisitT1Sent"   TIMESTAMP(3),
  ADD COLUMN "postVisitT24Sent"  TIMESTAMP(3),
  ADD COLUMN "postVisitT48Sent"  TIMESTAMP(3),
  ADD COLUMN "postVisit72Closed" BOOLEAN NOT NULL DEFAULT false;

-- Cron sweeps SiteVisit by visitScheduledDate inside ±72hr — index for
-- predictable plan even as visit volume grows.
CREATE INDEX "SiteVisit_visitScheduledDate_idx" ON "SiteVisit"("visitScheduledDate");

-- CRMEvent — append-only audit trail for every follow-up, bypass flag,
-- or junk-mark mutation. Read by /admin/buyers detail timeline.
CREATE TABLE "CRMEvent" (
  "id"        TEXT         NOT NULL,
  "sessionId" TEXT,
  "buyerId"   TEXT,
  "visitId"   TEXT,
  "kind"      TEXT         NOT NULL,
  "payload"   JSONB,
  "channel"   TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CRMEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CRMEvent_sessionId_createdAt_idx" ON "CRMEvent"("sessionId", "createdAt");
CREATE INDEX "CRMEvent_buyerId_createdAt_idx"   ON "CRMEvent"("buyerId", "createdAt");
CREATE INDEX "CRMEvent_visitId_createdAt_idx"   ON "CRMEvent"("visitId", "createdAt");

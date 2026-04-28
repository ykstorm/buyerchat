-- Migration: 20260428200000_add_audit_fields_and_rera_cache
-- Purpose: Extend ProjectPricing's audit pattern to Project + Builder + PriceHistory.
--          Add RERA verification cache columns to Project.
--          Add entityVersion to AuditLog so events reference the row version they applied to.
-- Reversibility: every column nullable OR has safe default. DROP COLUMN reverses cleanly.
-- Discipline: §3 (Neon HTTP — auditWrite uses array-form $transaction).

ALTER TABLE "Project" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Project" ADD COLUMN "updatedBy" TEXT;
ALTER TABLE "Project" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Project" ADD COLUMN "reraVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "reraData" JSONB;
ALTER TABLE "Project" ADD COLUMN "reraVerifiedAt" TIMESTAMP(3);

ALTER TABLE "Builder" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "Builder" ADD COLUMN "updatedBy" TEXT;
ALTER TABLE "Builder" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "PriceHistory" ADD COLUMN "recordedBy" TEXT;

ALTER TABLE "AuditLog" ADD COLUMN "entityVersion" INTEGER;

CREATE INDEX "Project_updatedBy_idx" ON "Project"("updatedBy");
CREATE INDEX "Builder_updatedBy_idx" ON "Builder"("updatedBy");
CREATE INDEX "Project_reraVerified_idx" ON "Project"("reraVerified");

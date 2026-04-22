-- Adds ProjectPricing + PricingHistory tables for the admin Step-3 pricing sprint.
-- NOT APPLIED YET — operator must run `npx prisma migrate deploy` (or `migrate dev`
-- after resolving any drift) to apply it against Neon.

-- CreateTable
CREATE TABLE "ProjectPricing" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "basicRatePerSqft" INTEGER,
    "plcRatePerSqft" INTEGER,
    "floorRisePerSqft" INTEGER,
    "floorRiseFrom" INTEGER DEFAULT 1,
    "unitFloorNo" INTEGER,
    "landRatePerSqyd" INTEGER,
    "consRatePerSqyd" INTEGER,
    "plcRatePerSqyd" INTEGER,
    "audaGebAecCharge" INTEGER,
    "developmentFixed" INTEGER,
    "infrastructure" INTEGER,
    "societyMaintDeposit" INTEGER,
    "advanceRunningMaint" INTEGER,
    "townshipDeposit" INTEGER,
    "townshipAdvance" INTEGER,
    "carParkingAmount" INTEGER,
    "carParkingCount" INTEGER DEFAULT 1,
    "clubMembership" INTEGER,
    "legalCharges" INTEGER,
    "otherCharges" JSONB,
    "saleDeedAmount" INTEGER,
    "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "stampDutyPercent" DOUBLE PRECISION NOT NULL DEFAULT 4.9,
    "registrationPercent" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "basicCostTotal" INTEGER,
    "plcTotal" INTEGER,
    "devGovtTotal" INTEGER,
    "maintenanceTotal" INTEGER,
    "fixedChargesTotal" INTEGER,
    "stampRegTotal" INTEGER,
    "gstTotal" INTEGER,
    "grandTotalAllIn" INTEGER,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "pricingVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ProjectPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingHistory" (
    "id" TEXT NOT NULL,
    "pricingId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "basicRatePerSqft" INTEGER,
    "grandTotalAllIn" INTEGER,
    "snapshotJson" JSONB NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT,
    "changeReason" TEXT,

    CONSTRAINT "PricingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPricing_projectId_key" ON "ProjectPricing"("projectId");

-- CreateIndex
CREATE INDEX "ProjectPricing_projectId_idx" ON "ProjectPricing"("projectId");

-- CreateIndex
CREATE INDEX "PricingHistory_projectId_changedAt_idx" ON "PricingHistory"("projectId", "changedAt");

-- AddForeignKey
ALTER TABLE "ProjectPricing" ADD CONSTRAINT "ProjectPricing_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingHistory" ADD CONSTRAINT "PricingHistory_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "ProjectPricing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingHistory" ADD CONSTRAINT "PricingHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

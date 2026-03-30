/*
  Warnings:

  - You are about to drop the column `attributionToken` on the `Deal` table. All the data in the column will be lost.
  - You are about to drop the column `closedAt` on the `Deal` table. All the data in the column will be lost.
  - You are about to drop the column `commissionAmt` on the `Deal` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[dealNumber]` on the table `Deal` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `lastMessageAt` to the `ChatSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `builderBrandName` to the `Deal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `buyerName` to the `Deal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `commissionAmount` to the `Deal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dealNumber` to the `Deal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dealValue` to the `Deal` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Deal" DROP CONSTRAINT "Deal_projectId_fkey";

-- DropIndex
DROP INDEX "Deal_attributionToken_key";

-- AlterTable
ALTER TABLE "Builder" ADD COLUMN     "agreementSigned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 1.5;

-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "buyerBudget" INTEGER,
ADD COLUMN     "buyerConfig" TEXT,
ADD COLUMN     "buyerPersona" TEXT,
ADD COLUMN     "buyerPurpose" TEXT,
ADD COLUMN     "buyerStage" TEXT NOT NULL DEFAULT 'intent_capture',
ADD COLUMN     "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
ADD COLUMN     "projectsDisclosed" TEXT[],
ADD COLUMN     "qualificationDone" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Deal" DROP COLUMN "attributionToken",
DROP COLUMN "closedAt",
DROP COLUMN "commissionAmt",
ADD COLUMN     "builderBrandName" TEXT NOT NULL,
ADD COLUMN     "buyerName" TEXT NOT NULL,
ADD COLUMN     "commissionAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
ADD COLUMN     "dealNumber" TEXT NOT NULL,
ADD COLUMN     "dealValue" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "paymentDate" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "sessionId" TEXT,
ALTER COLUMN "projectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SiteVisit" ADD COLUMN     "builderAcknowledged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leadRegisteredAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ChatMessageLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "responseMs" INTEGER,
    "violations" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketAlert" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "projectName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MarketAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Deal_dealNumber_key" ON "Deal"("dealNumber");

-- AddForeignKey
ALTER TABLE "ChatMessageLog" ADD CONSTRAINT "ChatMessageLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

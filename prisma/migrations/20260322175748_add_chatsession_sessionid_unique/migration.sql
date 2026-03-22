/*
  Warnings:

  - A unique constraint covering the columns `[sessionId]` on the table `ChatSession` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[attributionToken]` on the table `Deal` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ChatSession_sessionId_key" ON "ChatSession"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Deal_attributionToken_key" ON "Deal"("attributionToken");

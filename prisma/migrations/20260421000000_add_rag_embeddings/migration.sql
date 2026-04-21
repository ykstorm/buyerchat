-- Enable pgvector on Neon (supported natively; no superuser needed).
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "Embedding" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "tokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Embedding_sourceType_sourceId_key" ON "Embedding"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "Embedding_sourceType_sourceId_idx" ON "Embedding"("sourceType", "sourceId");

-- ivfflat index. Target lists = sqrt(rows). ~5k rows -> 71, rounded to
-- 100 for headroom. Revisit when corpus crosses 20k.
CREATE INDEX embedding_vec_idx
  ON "Embedding"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

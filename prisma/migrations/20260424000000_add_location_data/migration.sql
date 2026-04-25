-- LocationData: operator-curated amenity inventory used as the ground-truth
-- GUARD_LIST for chat responses. Blocks hallucinations like "Auda Garden"
-- (Sentry JS-NEXTJS-K) by constraining the model to named amenities that
-- exist in this table.

CREATE TABLE "LocationData" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "microMarket" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationData_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LocationData_category_name_microMarket_key"
  ON "LocationData"("category", "name", "microMarket");

CREATE INDEX "LocationData_category_idx"
  ON "LocationData"("category");

CREATE INDEX "LocationData_microMarket_idx"
  ON "LocationData"("microMarket");

CREATE INDEX "LocationData_category_microMarket_idx"
  ON "LocationData"("category", "microMarket");

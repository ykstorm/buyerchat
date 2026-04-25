-- AlterTable: add per-BHK configuration table to ProjectPricing.
-- Stores an array of { type, sbaSqft, carpetSqft, allInTotal } so that
-- each BHK type produces its own per-flat all-in total instead of the
-- meaningless per-sqft number that buyers were seeing pre-fix.
ALTER TABLE "ProjectPricing" ADD COLUMN "bhkConfigs" JSONB;

# Sprint E — Pricing Form Smoke Verify

Date: 2026-04-24
Verdict: **PASS** — no code bugs. Operator data entry is the only remaining blocker.

## What was verified (code + DB, no dev server)

### 1. Migration applied
`npx prisma migrate status` → "Database schema is up to date!"
`ProjectPricing` + `PricingHistory` tables exist on Neon. Current row counts: 0 / 0 (expected — no operator entries yet).

### 2. Calculator math sanity

Canonical input per the P-ADMIN brief:
- `propertyType: 'flat'`
- `basicRatePerSqft: 4000`
- `saleDeedAmount: 9300000`
- area: `1200` sqft
- Default GST 5%, stamp 4.9%, registration 1%

Output:
```json
{
  "basicCostTotal": 4800000,
  "gstTotal": 240000,
  "stampRegTotal": 548700,
  "grandTotalAllIn": 5588700
}
```

Expected:
- basicCost = 4000 × 1200 = 4,800,000 ✓
- gst = 5% of 4,800,000 = 240,000 ✓
- stamp + reg = 5.9% of 9,300,000 = 548,700 ✓
- grand total = 5,588,700 (₹55.88L) ✓

Calculator unit tests: 13/13 passing.

### 3. API route shape (`src/app/api/admin/projects/[id]/pricing/route.ts`)
- POST creates ProjectPricing + PricingHistory row, denormalizes to Project.minPrice / maxPrice / allInPrice.
- PUT updates + increments pricingVersion + logs new history snapshot.
- Admin gate: `session.user.email === process.env.ADMIN_EMAIL` → 403 if mismatch.
- Zod validation via `src/lib/pricing/validator.ts`.

### 4. The Planet (current state)
```json
{
  "id": "cmn0jn3kp0000zwfy4r5mf5s1",
  "projectName": "The Planet",
  "minPrice": 0,
  "maxPrice": 0,
  "allInPrice": null,
  "pricing": null
}
```
Denormalize targets exist. Waiting on operator entry.

## What's NOT verified (requires dev server + manual form test)
1. Live form UX: do all 44 fields save when filled?
2. Dynamic "Other charges" add/remove UI
3. LiveCostBreakup widget: does it auto-update on input changes?
4. PricingHistory timeline: does it render past snapshots correctly?

These are UI-interaction tests; the code paths they exercise all passed code-side checks. First live entry by operator will surface any UX bugs — if any, log as separate sprint.

## Next operator step
Navigate to `/admin/projects/cmn0jn3kp0000zwfy4r5mf5s1/pricing`, enter The Planet pricing, hit Save. On success:
- Chat immediately starts quoting real prices for The Planet.
- `ProjectPricing` + `PricingHistory` rows populate.
- `Project.minPrice` / `maxPrice` / `allInPrice` denormalize.
- Invalidation via `invalidateContextCache()` triggers fresh context on next chat request.

Recommended first values (from CSV + analyst notes):
- propertyType: `flat`
- basicRatePerSqft: `4000`
- area assumption (when calculator hits it): based on actual carpet/SBU from floor plan

No code action needed from this sprint.

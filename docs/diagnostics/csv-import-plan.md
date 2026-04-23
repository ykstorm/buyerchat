# CSV Import Plan — post-P-ADMIN (`ProjectPricing` + `PricingHistory`)

Last audited: 2026-04-21 (read-only audit; no code/DB touched).

This plan reconciles `import-projects.csv` with the new `ProjectPricing` model (`prisma/schema.prisma:313-374`) that P-ADMIN shipped in `f344cb6`, and proposes the minimum-diff path to clean bulk import.

References (file:line):
- CSV: `import-projects.csv:1` (header), `import-projects.csv:2-17` (16 rows)
- Importer: `import-projects.mjs:22-53` (field map + builder alias), `:130-217` (upsert body)
- Prisma: `prisma/schema.prisma:9-62` (Project), `:313-374` (ProjectPricing), `:376-391` (PricingHistory)
- Calculator: `src/lib/pricing/calculator.ts:82-160`
- Validator: `src/lib/pricing/validator.ts:26-98`
- Admin pricing API: `src/app/api/admin/projects/[id]/pricing/route.ts:61-175` (POST), `:177-290` (PUT)

---

## 1. CSV header inventory (26 columns, 16 data rows)

| # | Column | Used by `import-projects.mjs`? | Destination today | Destination post-P-ADMIN |
|---|---|---|---|---|
| 1 | `name` | yes (`:132`) | `Project.projectName` | same |
| 2 | `builder` | yes via `BUILDER_MAP` (`:46-52`, `:131`) | `Project.builderName` | same |
| 3 | `zone` | yes (`:148,182`) | `Project.microMarket` | same |
| 4 | `units` | yes (`:149,183`) | `Project.availableUnits` | same |
| 5 | `trust_score` | **IGNORED** (comment says "not in Project schema") | — | stays ignored — computed on Builder |
| 6 | `decision_tag` | yes (`:157,191`) | `Project.decisionTag` | same |
| 7 | `configurations` | yes (`:160,194`) | `Project.configurations` | same |
| 8 | `possession_date` | yes (`:153,187`) via `parsePossessionDate` | `Project.possessionDate` | same |
| 9 | `possession_flag` | yes (`:154,188`) | `Project.possessionFlag` | same |
| 10 | `bsp_sqft` | yes (`:150,184`) as `safeFloat()` | `Project.pricePerSqft` | ALSO → `ProjectPricing.basicRatePerSqft` (int) |
| 11 | `all_in_lakh` | **IGNORED** (never referenced) | — (silently dropped) | → `Project.allInPrice` when present; NOT enough to reconstruct `ProjectPricing` breakdown |
| 12 | `min_price_lakh` | yes (`:151,185`) — `× 100000` | `Project.minPrice` | same (but see Issue A) |
| 13 | `max_price_lakh` | yes (`:152,186`) — `× 100000` | `Project.maxPrice` | same (but see Issue A) |
| 14 | `price_note` | yes (`:164,198`) | `Project.priceNote` | same |
| 15 | `carpet_sqft` | yes (`:162,196`) | `Project.carpetSqftMin` | same |
| 16 | `sba_sqft` | yes (`:163,197`) | `Project.sbaSqftMin` | same |
| 17 | `bank_approvals` | yes (`:161,195`) | `Project.bankApprovals` | same |
| 18 | `honest_concern` | yes (`:158,192`) | `Project.honestConcern` | same |
| 19 | `analyst_note` | yes (`:159,193`) | `Project.analystNote` | same |
| 20 | `rera_number` | yes (`:155,189`) w/ synthetic fallback (see Issue B) | `Project.reraNumber` | same |
| 21 | `rera_status` | yes (`:156,190`) | `Project.constructionStatus` | same |
| 22 | `delivery_score` | **IGNORED** (per-Builder only) | — | stays ignored |
| 23 | `rera_score` | **IGNORED** | — | stays ignored |
| 24 | `quality_score` | **IGNORED** | — | stays ignored |
| 25 | `financial_score` | **IGNORED** | — | stays ignored |
| 26 | `response_score` | **IGNORED** | — | stays ignored |

Issue A: `import-projects.mjs:151-152` and `:185-186` coerce blank `min_price_lakh`/`max_price_lakh` to `0` (the `? … : 0` ternary). This silently zeros prices for every row where the operator left those blanks (the 10 "basic-rate-only" rows and 1 "land+construction" row — see §4).

Issue B: `import-projects.mjs:155,189` synthesizes a fake RERA `RERA-${PROJECT-NAME}` when `rera_number` is empty. Every row in the CSV today has a real RERA string, so this never triggers, but the fallback is a PART 8.5 rule-4 hazard (inventing RERA numbers). Recommend removing the fallback and failing the row loudly instead.

---

## 2. `ProjectPricing` field-by-field CSV source matrix

All 44 fields on the model (`prisma/schema.prisma:313-374`). "CSV source" = a column in `import-projects.csv` that cleanly maps. "Derived" = calculator output.

### A. Identity / metadata (5)
| Field | CSV source | Notes |
|---|---|---|
| `id` | auto cuid | |
| `projectId` | resolved via `Project.projectName` lookup | |
| `propertyType` | **NONE (operator-only)** | Must be `"flat"` or `"villa"`. Heuristic: CSV `configurations` containing "Villa" / "Bungalow" / "Row House" → villa (4 rows: Sky Villa, Floris, Arcus, Vernis). Everything else → flat. Heuristic is good enough to seed; operator must confirm. |
| `lastUpdated` | auto `@updatedAt` | |
| `updatedBy` | hardcode `"csv-import"` or `ADMIN_EMAIL` env | |
| `pricingVersion` | default 1 | |

### B. FLAT rate fields (5)
| Field | CSV source | Notes |
|---|---|---|
| `basicRatePerSqft` | `bsp_sqft` (int cast) | Present on 10 of 16 rows. Validator requires ≥1000 (`validator.ts:31`) — all CSV values pass (₹4,000-6,200/sqft). |
| `plcRatePerSqft` | **NONE** | Operator-only |
| `floorRisePerSqft` | **NONE** | Operator-only |
| `floorRiseFrom` | default 1 | |
| `unitFloorNo` | **NONE** | Operator-only (per-unit, not per-project) |

### C. VILLA rate fields (3)
| Field | CSV source | Notes |
|---|---|---|
| `landRatePerSqyd` | Sky Villa `price_note` parsable: `"Land ₹60,000/SqYd"` | 1 of 4 villas. Floris/Arcus/Vernis only have `"All Inclusive ₹X.XXCr"` in price_note — no per-sqyd breakdown. |
| `consRatePerSqyd` | Sky Villa `price_note` parsable: `"Construction ₹30,000/SqYd"` | same caveat |
| `plcRatePerSqyd` | **NONE** | Operator-only |

### D. Dev & Govt (3)
| Field | CSV source | Notes |
|---|---|---|
| `audaGebAecCharge` | **NONE** | Operator-only |
| `developmentFixed` | **NONE** | Operator-only |
| `infrastructure` | **NONE** | Operator-only |

### E. Maintenance & Deposits (4) — **all operator-only**
`societyMaintDeposit`, `advanceRunningMaint`, `townshipDeposit`, `townshipAdvance`.

### F. Fixed Charges (5) — **all operator-only**
`carParkingAmount`, `carParkingCount` (default 1), `clubMembership`, `legalCharges`, `otherCharges` (Json).

### G. Tax & Stamp (4)
| Field | CSV source | Notes |
|---|---|---|
| `saleDeedAmount` | **NONE** | Operator-only (defaults behavior = basic cost unless operator lowers it) |
| `gstPercent` | default 5.0 (`schema.prisma:352`) | |
| `stampDutyPercent` | default 4.9 | |
| `registrationPercent` | default 1.0 | |

### H. Computed denormalized totals (8) — **all derived** by `calculateBreakdown`
`basicCostTotal`, `plcTotal`, `devGovtTotal`, `maintenanceTotal`, `fixedChargesTotal`, `stampRegTotal`, `gstTotal`, `grandTotalAllIn`.

**Summary:** of 44 fields, CSV cleanly supplies **at most 4** (propertyType via heuristic, basicRatePerSqft, landRatePerSqyd, consRatePerSqyd). The remaining ~25 substantive fields (rates, dev/govt, maintenance, fixed charges, saleDeed) are operator-only.

---

## 3. Path A vs Path B

### Path A — patch `import-projects.mjs` to write `ProjectPricing` alongside `Project`

**Pros**
- Single script, single command.
- Reuses the existing 16-row CSV.

**Cons**
- Only 3 of the 44 ProjectPricing fields have real CSV values (`propertyType` heuristic + `basicRatePerSqft` + for 1 villa, land/cons rates). The rest are NULL.
- `calculateBreakdown` on a near-empty input produces `grandTotalAllIn ≈ basicCost` only — missing dev/govt (~₹2-5L), maintenance (~₹1-3L), parking+club (~₹3-8L), GST (5% of basic), stamp+reg (5.9% of basic). Actual under-estimate is 15-20%.
- The POST route (`route.ts:153-160`) denormalizes `minPrice`/`maxPrice`/`allInPrice` from the breakdown. Writing pricing with only `basicRatePerSqft` would **overwrite** operator-entered `min/max` on re-import with a wrong-low number.
- `PricingHistory` gets logged on every upsert (`route.ts:137-147, 251-261`). Re-running the CSV would spam history even when no change occurred — unless the script adds a dirty-check that compares the new snapshot to the latest history row before writing.
- Villa rows (4) can't be handled without parsing regex out of `price_note` free-text — fragile.

### Path B — new supplementary `pricing-seed.csv` + new `npm run pricing:import`

**Pros**
- Clean separation: project catalog (existing CSV) stays simple and stable; pricing lives in its own file keyed by `projectName`.
- Columns map 1:1 to `PricingSchema` (`src/lib/pricing/validator.ts:26-71`). Operator fills it with numbers from the cost sheet — same fields as the admin form, not a re-interpretation of free-text.
- Script can reuse the already-tested `calculateBreakdown` (`src/lib/pricing/calculator.ts:82`) and `PricingSchema.safeParse` to validate — zero new math logic.
- Idempotency is cheap: compute `grandTotalAllIn` in memory, compare to existing `ProjectPricing.grandTotalAllIn`; skip if identical, write `PricingHistory` only on diff.
- Re-running is safe: the 16-project catalog import and the 11-project pricing seed evolve independently.
- Villas and flats handled via `propertyType` column — no heuristic.
- Mirrors how the data entry actually happens in the real world (operator reads the builder cost sheet PDF, copies numbers).

**Cons**
- Requires building a second small script (~80 LOC wrapper around `calculateBreakdown` + Prisma upsert).
- Operator must maintain a second CSV (low cost — edit once per project).

### Verdict: **Path B wins.**

One-sentence reason: the existing CSV supplies at most 3 of 44 `ProjectPricing` fields, so patching the catalog import would produce incorrect (under-estimated) totals and couple two independent data lifecycles — a dedicated `pricing-seed.csv` maps 1:1 to the admin form the code already expects and keeps history hygiene trivial.

---

## 4. Path B — detailed spec

### 4.1 File: `pricing-seed.csv`

Header (mirrors `PricingSchemaInput` + `areaSqftOrSqyd`):

```
projectName,propertyType,areaSqftOrSqyd,basicRatePerSqft,plcRatePerSqft,floorRisePerSqft,floorRiseFrom,unitFloorNo,landRatePerSqyd,consRatePerSqyd,plcRatePerSqyd,audaGebAecCharge,developmentFixed,infrastructure,societyMaintDeposit,advanceRunningMaint,townshipDeposit,townshipAdvance,carParkingAmount,carParkingCount,clubMembership,legalCharges,otherChargesJson,saleDeedAmount,gstPercent,stampDutyPercent,registrationPercent,changeReason
```

Rules:
- `projectName` lookup — must match `Project.projectName` exactly (case-sensitive). Fail loudly if absent (do not create).
- `propertyType` — `flat` or `villa` only.
- `areaSqftOrSqyd` — sqft for flat (typical carpet or SBU the basic rate is quoted against), sqyd for villa.
- Blank cells → `null` / defaults. Do NOT coerce to `0`.
- `otherChargesJson` — stringified `[{label,amount}]` or blank.
- Percentages: if blank, the Zod defaults (5.0 / 4.9 / 1.0) apply.

### 4.2 Script: `scripts/pricing-import.mjs`

Pseudocode:

```
for row in csv:
  project = prisma.project.findFirst({ projectName: row.projectName })
  if !project: log error, continue
  parsed = PricingSchema.safeParse(row)   // reuse existing validator
  if !parsed.success: log issues, continue
  breakdown = calculateBreakdown(parsed.data, parsed.data.areaSqftOrSqyd)  // reuse
  existing = prisma.projectPricing.findUnique({ projectId: project.id })

  if existing:
    // idempotency: skip when the breakdown + key inputs are unchanged
    const isSame =
      existing.grandTotalAllIn === breakdown.grandTotalAllIn &&
      existing.basicRatePerSqft === (parsed.data.basicRatePerSqft ?? null) &&
      existing.propertyType === parsed.data.propertyType
    if isSame: log "unchanged", continue
    prisma.projectPricing.update({ ... }) with breakdown + incremented pricingVersion
    prisma.pricingHistory.create({ ... })         // only when diff
  else:
    prisma.projectPricing.create({ ... }) with breakdown
    prisma.pricingHistory.create({ ... reason: 'csv-seed' })

  prisma.project.update({
    data: {
      minPrice: breakdown.basicCostTotal,
      maxPrice: breakdown.grandTotalAllIn,
      allInPrice: breakdown.grandTotalAllIn,
    },
  })
  // keep parity with route.ts:153-160 and :263-270
```

Notes:
- Does NOT call the admin HTTP route — direct Prisma. Safer for bulk and avoids auth gymnastics. Mirrors `import-projects.mjs`'s posture.
- `updatedBy`: set to `process.env.ADMIN_EMAIL ?? "csv-import"`.
- `pricingVersion`: follow the route's `{ increment: 1 }` on update, `1` on create.
- `invalidateContextCache()` — not importable from a `.mjs` script without bundling. Accept staleness; operator can hit any admin mutation endpoint once after the bulk import to invalidate.
- Migration prerequisite: `prisma/migrations/20260421120000_add_project_pricing/` must be applied before running (documented as operator action in `docs/CLAUDE_CODE_MASTER_v2.md:244-250`).

### 4.3 `package.json` addition (not applied — proposed)

```
"pricing:import": "node scripts/pricing-import.mjs"
```

### 4.4 Separate (small) fix to `import-projects.mjs`

Even under Path B, the catalog importer needs these targeted changes so repeat catalog imports don't destroy pricing:

1. Drop the `: 0` fallback on `min_price_lakh` / `max_price_lakh` (`:151-152, :185-186`). Use `null`/skip-field semantics instead so a blank CSV cell does NOT overwrite real numbers that Path B (or the admin form) wrote.
2. Same for `pricePerSqft` — don't overwrite with `0` when `bsp_sqft` is blank (4 rows: Riviera Elite, Riviera Woods, Sky Villa, + the villa rows).
3. Read `all_in_lakh` and, if present, write `Project.allInPrice = all_in_lakh * 100_000` — for rows with no ProjectPricing seeded yet (sold-out villas like Floris/Arcus/Vernis), this is the only honest source of the `allInPrice` denorm.
4. Strip the synthetic `RERA-${PROJECT-NAME}` fallback — all current rows have real numbers; a future row without one should fail loudly (PART 8.5 rule 4).

These four tweaks are ~10 lines, isolated to the `.data` blocks in `:144-211`, and are orthogonal to Path B.

---

## 5. CSV quality issues found (read-only sample audit)

1. `Project.pricePerSqft` will be **0 for 6 rows** on current script behavior (all four rows with blank `bsp_sqft` that are actually sold-out villas or transfer units, plus the script never reads any alternative).
2. `min_price_lakh`/`max_price_lakh` blank on **11 of 16 rows**. Current script writes `0` to both → these are the projects currently showing `minPrice=0` (per Master doc §Prisma schema, "11 have minPrice=0").
3. `all_in_lakh` column is present in the header (`import-projects.csv:1`) but populated on **0 of 16 rows** — the operator-authored CSV never filled it, and the importer never reads it. Dead column today.
4. `availableUnits` is blank on **5 rows** (Floris, Arcus, Vernis, The Galaxy, Riviera Palacio's sibling ambiguous rows may). Current script coerces to `0` via `safeInt(...) ?? 0` at `:149,183` — displays as "0 units available" in cards which is misleading for row-house formats.
5. `rera_number` format drift:
   - Most: `PR/GJ/AHMEDABAD/<TALUKA>/<AUTHORITY>/RAA##### /DDMMYY` (single date)
   - Line 7 Riviera Bliss: `.../RAA14351/281024/311229` — two trailing dates
   - Line 15 The Planet: `.../MAA14626/311224/311230` — two trailing dates
   - Line 16 Shaligram Prestige: `.../MAA11/032/291221/231230` — **four slashes inside what should be the registration id** (`MAA11/032`). Likely a data-entry typo; cannot be auto-fixed. Does NOT violate PART 8.5 in the import layer (it's operator-authored), but it will break any RERA portal link that parses the id. Flag for operator correction.
6. None of the 16 rows would trip PART 8.5 rule 3 (builder name is present on every row; `BUILDER_MAP` covers all 5 brands in DB).
7. PART 8.5 rule 4 hazard: the **synthetic RERA fallback** at `:155,189` could emit `RERA-PROJECT-NAME` style fake numbers on a future row with empty `rera_number` — remove it (see §4.4 item 4).
8. `possession_date` parsing tolerates the "(passed)" annotations via `split('(')[0]` (`import-projects.mjs:59`) — OK today.
9. Builder alias: `"Goyal & Co. · HN Safal"` (middot U+00B7) in CSV → `"Goyal & Co. / HN Safal"` in DB (`:47`). Relies on the CSV using the exact middot character — not a slash, not a hyphen. Operator hazard on future additions.
10. The Planet row (line 15) has `units=514`, `bsp_sqft=4000`, `min/max/all_in` all blank — confirms it's one of the 11 `minPrice=0` projects and the canonical Path-B target for pricing seed.

---

## 6. Operator time estimate

| Path | Mechanics | 11 zero-price projects | Notes |
|---|---|---|---|
| (a) Current flow (run `node import-projects.mjs` as-is) | Still writes `minPrice=0`, `maxPrice=0`. No path from CSV to real prices. | Does **not** solve the problem. | Can shift `bsp_sqft` into `pricePerSqft`, nothing else. |
| (b) Path B: `pricing-seed.csv` + `scripts/pricing-import.mjs` | Operator fills 1 CSV row per project (~25 numeric fields), runs `npm run pricing:import`. | ~5 min/project to collect numbers off the builder cost sheet PDF + 2 min typing = 7 min × 11 = **~80 min + 30 sec script run**. | One-time. Later edits = re-run same script, idempotency prevents duplicate history. |
| (c) Admin form `/admin/projects/[id]/pricing` | Navigate + fill 44 fields + live breakdown preview + save. ~8-10 min/project given the form's field density and live recompute delay. | 8.5 × 11 = **~95 min**. | Visual feedback is nice. Scales poorly beyond 20 projects. |
| (d) Path A (patched `import-projects.mjs`) | Would auto-seed only `basicRatePerSqft` + `propertyType`. Operator still has to hit the admin form to enter dev/govt/maint/fixed/tax, ~5-6 min/project. | 5.5 × 11 + tweak time = **~65 min**, and the `minPrice/maxPrice` that gets written is **wrong** (under-estimated by 15-20% because only basic cost is present). | Rejected. |

Path B is the sweet spot: marginally slower than Path A in theory, but it yields correct totals because every field the calculator needs is in the CSV.

---

## 7. Open questions / operator decisions

1. For sold-out rows (Riviera Elite, Woods, Floris, Arcus, Vernis, Aspire, Springs), is seeding `ProjectPricing` meaningful, or is capturing `allInPrice` on `Project` (one number) enough? Recommendation: **skip ProjectPricing** for sold-out rows; set `Project.allInPrice` only. Path B's script should accept a row with only `projectName` + `allInPriceLakh` as a "catalog-only" row and short-circuit past the calculator.
2. For Sky Villa, the `price_note` says "Land ₹60,000/SqYd + Construction ₹30,000/SqYd". Do we want `propertyType=villa` with `landRatePerSqyd=60000, consRatePerSqyd=30000`, and rely on operator to supply plot sqyd? Yes — that's the point of the seed CSV.
3. `gstPercent` for ongoing projects (most of the 16) is 5% under default, but projects with OC (Floris/Arcus/Vernis "RERA 2019 passed") may be GST-exempt (completed properties). Operator must override `gstPercent=0` per-row in the seed.
4. `saleDeedAmount` defaults to 0 in the calculator (`calculator.ts:137-140`) when blank, which zeroes stamp+reg. Operator must explicitly fill it (usually = `basicCostTotal`). The seed CSV should require this field when the row is not catalog-only.

---

## 8. Recommended next actions (no code changes yet)

1. Operator confirms Path B.
2. Apply P-ADMIN migration (`docs/CLAUDE_CODE_MASTER_v2.md:244-250`) — unblocks `ProjectPricing`/`PricingHistory` tables.
3. Author `pricing-seed.csv` with 11 rows (the zero-price projects).
4. Implement `scripts/pricing-import.mjs` per §4.2. Add `npm run pricing:import`.
5. Apply the 4 catalog-import tweaks in §4.4 to stop `import-projects.mjs` from zeroing good data.
6. Run `npm run pricing:import` → verify via `/admin/projects/[id]/pricing` that numbers match builder cost sheets.

No file in this audit was edited. No DB was touched. No commit was made.

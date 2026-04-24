# Riviera Bliss — Pricing Trace (Audit)

**Date:** 2026-04-24
**Triggered by:** Comparison card shows "Riviera Bliss ₹5,700/sqft". Need to verify this is sourced from legitimate operator data, not an arithmetic artifact.

**Investigation scope:** DB (`Project`, `ProjectPricing`) vs source CSV (`import-projects.csv`). Read-only; no rows modified.

---

## Verdict

**(a) Legitimate — CSV `bsp_sqft` = DB `pricePerSqft` = ₹5,700/sqft.**

The value was directly ingested by `import-projects.mjs` from the operator-authored CSV (`bsp_sqft` column → `Project.pricePerSqft`). No derivation from `minPrice/sbaSqftMin` occurred. No per-field rounding or computation artifact.

---

## Step 1 — Neon: `Project` row

Query:

```sql
SELECT "id", "projectName", "builderName", "pricePerSqft", "minPrice",
       "maxPrice", "allInPrice", "carpetSqftMin", "sbaSqftMin", "priceNote"
FROM "Project" WHERE "projectName" ILIKE '%Bliss%';
```

Result (verbatim):

```json
[
  {
    "id": "cmnrhqckb0005nwfyg6xokodg",
    "projectName": "Riviera Bliss",
    "builderName": "Goyal & Co. / HN Safal",
    "pricePerSqft": 5700,
    "minPrice": 0,
    "maxPrice": 0,
    "allInPrice": null,
    "carpetSqftMin": null,
    "sbaSqftMin": null,
    "priceNote": "Basic Rate ₹5,700/sqft"
  }
]
```

## Step 2 — Neon: `ProjectPricing` row

Query:

```sql
SELECT * FROM "ProjectPricing" WHERE "projectId" = 'cmnrhqckb0005nwfyg6xokodg';
```

Result (verbatim):

```json
[]
```

No `ProjectPricing` row exists for Riviera Bliss. The Basic Rate shown to buyers is read from `Project.pricePerSqft` alone.

## Step 3 — CSV row (`import-projects.csv` line 7)

Header:

```
name,builder,zone,units,trust_score,decision_tag,configurations,possession_date,possession_flag,bsp_sqft,all_in_lakh,min_price_lakh,max_price_lakh,price_note,carpet_sqft,sba_sqft,bank_approvals,honest_concern,analyst_note,rera_number,rera_status,delivery_score,rera_score,quality_score,financial_score,response_score
```

Row (verbatim):

```
Riviera Bliss,Goyal & Co. · HN Safal,South Bopal,236,83,Strong Buy,3BHK · 4BHK · 4BHK Penthouse · 5BHK Penthouse,31-12-2029,amber,5700,,,,"Basic Rate ₹5,700/sqft",,,,Dec 2029 possession — 3.75 years away. 7.06% project loan. 39% booking absorption — low.,"Goyal & Co. (250+ projects since 1971) + HN Safal (43M sqft). Premium 3BHK, 4BHK, 5BHK Penthouse. Wall hung WC + wall hung basin.",PR/GJ/AHMEDABAD/DASKROI/AMC/RAA14351/281024/311229,Active,25,16,17,12,13
```

Extracted values:

| CSV column | Value |
|---|---|
| `bsp_sqft` | `5700` |
| `all_in_lakh` | *(empty)* |
| `min_price_lakh` | *(empty)* |
| `max_price_lakh` | *(empty)* |
| `price_note` | `Basic Rate ₹5,700/sqft` |
| `carpet_sqft` | *(empty)* |
| `sba_sqft` | *(empty)* |

## Step 4 — Reconciliation

`import-projects.mjs` mapping (see `import-projects.mjs:150` and `:184`):

```js
pricePerSqft: safeFloat(row.bsp_sqft) ?? 0,
```

CSV `bsp_sqft=5700` → DB `pricePerSqft=5700`. Exact match, no derivation. `minPrice=0` and `maxPrice=0` are the import defaults because `min_price_lakh`/`max_price_lakh` are blank in the CSV — they were *not* used to back-compute the per-sqft rate. `allInPrice=null` and `carpetSqftMin`/`sbaSqftMin=null` are consistent with blank CSV cells.

Decision-matrix outcomes:

- (a) DB=5700 + CSV=5700 → **legitimate operator entry**  ← **matches**
- (b) DB=5700 + CSV blank/different → manual entry → N/A
- (c) DB derived from minPrice/sba → import artifact → N/A (minPrice=0, sba=null)

## Recommendation for operator

No corrective action needed on the 5,700/sqft figure. Two adjacent hygiene items worth flagging (outside the scope of this audit but observed while tracing):

1. `minPrice=0` / `maxPrice=0` on Riviera Bliss may weaken downstream filters/sorts that expect a price range. If the project has published ticket-size ranges, populate `min_price_lakh` / `max_price_lakh` in the CSV and re-import, or set them in `ProjectPricing`.
2. No `ProjectPricing` row exists — all buyer-facing cost composition (charges, stamp, GST, maintenance) falls back to defaults. If Riviera Bliss is a featured comparison candidate, operator should author a `ProjectPricing` record so the all-in estimate is accurate.

---

**Files referenced:**
- `C:\Users\pc\Documents\buyerchat\import-projects.csv` (line 7)
- `C:\Users\pc\Documents\buyerchat\import-projects.mjs` (lines 28, 150, 184)
- `C:\Users\pc\Documents\buyerchat\prisma\schema.prisma` (`Project` model, `ProjectPricing` model)

**DB rows modified:** none. **Source files modified:** none (this audit doc only).

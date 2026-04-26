# Pricing Surface Diagnosis — 2026-04-26

Status: **DIAGNOSIS ONLY — no code changes in this report.**

Operator reported: "/admin/projects/new Step 3 shows old pricing form, no
BHK Configurations. /admin/projects/[id] also shows inline pricing fields
plus an 'Open pricing editor →' link." Confirmed via grep below.

## Three pricing surfaces (only one has BHK Configurations)

| # | Path | File | Pricing fields | Has BHK Configs? | Has link to canonical? |
| - | ---- | ---- | -------------- | ---------------- | ---------------------- |
| A | `/admin/projects/new` (Step 3) | `src/app/admin/projects/new/page.tsx:449-470+` | `pricePerSqft`, `minPrice`, `maxPrice`, simplified `allInPrice` (GST + stamp + reg only, no charges array) | **NO** | **NO** |
| B | `/admin/projects/[id]` (Step 3 edit, the long edit page) | `src/app/admin/projects/[id]/page.tsx:536+` plus form lines 70, 199-205, 269-271, 323 | Same as A plus `charges[]` array, `allInPrice` with charges total | **NO** | **YES** — line 340: `<a href="/admin/projects/{id}/pricing">Full pricing editor →</a>` |
| C | `/admin/projects/[id]/pricing` (dedicated, canonical) | `src/app/admin/projects/[id]/pricing/page.tsx` mounts `<PricingStep3Form>` | Full form via `src/components/admin/PricingStep3Form.tsx` | **YES** (commit `402b068`) | n/a (this is the destination) |

## Why Mama doesn't see the BHK table

When she opens `/admin/projects/<id>` to edit a project, she sees Surface
B's inline pricing fields (which look complete). She has no reason to
click "Full pricing editor →" because B looks done — Surface B does NOT
visually indicate that BHK configs are missing. Mama saves Surface B,
which writes `pricePerSqft` and `minPrice` to `Project` directly, never
touching `ProjectPricing.bhkConfigs`.

When she creates a new project via `/admin/projects/new`, she fills
Step 3 inline (Surface A), saves, and there's NO link to Surface C
afterwards. She's done — but no `ProjectPricing` row was created, no BHK
configs were captured.

## Recommendation: Option 1 — collapse to single canonical surface

Reasoning:
- Surface C is the only one capable of capturing the full pricing model
  (BHK configs, GST/stamp/reg from operator-entered percentages, charges
  with custom labels, sale-deed override, history snapshots via
  `PricingHistory`).
- Surfaces A and B duplicate a subset of fields that conflict with C's
  model. Operators get confused about which save wins.
- Maintenance: every pricing-form change has to be replicated three
  times (Option 2 — sync) which is the failure mode that produced this
  bug.
- Friction cost of Option 1: one extra click vs. inline. Acceptable
  given the canonical form has 44+ fields and a dedicated screen
  serves the workflow better.

### Concrete implementation plan (Option 1)

When approved, the changes are:

1. **`/admin/projects/new/page.tsx`** (Surface A):
   - Remove inline Step 3 pricing inputs (lines ~449-490).
   - Replace with a "Pricing →" CTA that says: "Save project first, then
     enter pricing in the dedicated form."
   - On project save (POST), redirect to
     `/admin/projects/<newId>/pricing` instead of the current redirect.

2. **`/admin/projects/[id]/page.tsx`** (Surface B):
   - Remove inline Step 3 pricing inputs (lines ~536+).
   - Replace the inline section with a read-only summary card showing
     the current `pricePerSqft`, `minPrice`, `maxPrice` and bhkConfigs
     count from the loaded `data`, plus the existing "Full pricing
     editor →" CTA (already at line 340) made more prominent.

3. **`/admin/projects/[id]/pricing/page.tsx`** (Surface C):
   - No changes. Already canonical.

4. **API routes**:
   - `/api/admin/projects` POST handler: stop accepting `pricePerSqft`,
     `minPrice`, `maxPrice` in the create body. Force operators through
     the pricing form.
   - `/api/admin/projects/[id]` PUT handler: same — strip pricing
     fields from the PUT body. The dedicated `/api/admin/projects/[id]/pricing`
     route is the only write path.

5. **Tests**:
   - Add a vitest assertion in `src/app/api/admin/projects/route.test.ts`
     (NEW) that POST with `pricePerSqft` in body returns 400 (or the
     field is silently ignored — pick the safer behavior).
   - Add a Playwright e2e (or skip until /e2e exists) that creating a
     project shows the redirect to the pricing form.

Estimated effort: ~2 hours for one agent. One commit.

## Alternative: Option 2 — sync Surfaces

Replicate the BHK Configurations table to Surfaces A and B. Higher
maintenance burden — every future pricing-form change must replicate
across three files. Not recommended.

## Alternative: Option 3 — auto-redirect

Keep Surface A and B inline forms working for the basic 3 fields
(`pricePerSqft`, `minPrice`, `maxPrice`), but automatically redirect to
Surface C after the first save. Operators see basic fields inline (low
friction), then are guided to the rich form. Compromise between Options
1 and 2.

Not recommended because the inline fields are the source of the bug —
operators stop at Surface B thinking they're done.

## Decision needed

User picks Option 1, 2, or 3. Default: Option 1.

Once chosen, follow-up agent implements + commits in one PR.

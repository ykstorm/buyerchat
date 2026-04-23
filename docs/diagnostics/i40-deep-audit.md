# I40 — Deep End-to-End Audit

Read-only audit of every buyer-facing workflow. Run date: 2026-04-21.
No code edits; no commits; no DB mutations. Evidence captured via static analysis plus a single read-only Neon query (temp script flagged for deletion — see bottom).

---

## A. BUYER: "tell me about <project>"

**Verdict: ⚠ partial**

`src/lib/context-builder.ts` (lines 43–94, 117–169) selects and injects these fields per project into what the system prompt renders as PART 11:
- identity: `id`, `name`, `builder`, `builderName`, `brandName`, `trustGrade`, `trustScore`, `zone`/`location`
- price: `priceRange`, `minPrice`, `maxPrice`, `pricePerSqft`, `priceNote`, `carpetSqftMin`, `sbaSqftMin`
- config: `unitTypes`, `possession`, `rera` AND `reraNumber` (I25 Fix A — aliased twice on purpose, line 144), `status`, `amenities`, `configurations`, `bankApprovals`
- narrative: `decisionTag`, `honestConcern`, `analystNote`, `possessionFlag`
- builder subscores: `deliveryScore`, `reraScore`, `qualityScore`, `financialScore`, `responsivenessScore`
- computed: `scores.{location,amenities,builderTrust,infrastructure,demand}`, `urgency`

The PART 11 render in `src/lib/system-prompt.ts` (lines 16–48) uses all of: `name`, `builder`, `zone`, `configurations`, `decisionTag`, `trustScore`, score breakdown, `possession`, `pricePerSqft`, `priceNote`, `priceRange`, `bankApprovals`, `honestConcern`, `analystNote`, `id`. **`reraNumber` is NOT emitted into PART 11 text** — only `decisionTag`, `price`, `possession`, `scores` appear. The field is in the JSON context the model sees, but the hand-rolled PART 11 string does not include a `RERA:` line.

PART 8.5 hard lock rule 4 (`system-prompt.ts` line 320) expects the model to quote `reraNumber` verbatim — it can, because `reraNumber` is present on the `p` object the model introspects, but the model reads the pre-rendered PART 11 block first and will likely say "RERA record mein nahi hai" when asked point-blank.

Location-amenity data: the only amenity-near-project source is the 40-line hardcoded `locationIntelligence` string in `context-builder.ts` (lines 180–228). It is global for South Bopal/Shela — not project-scoped. There is **no** `src/lib/locality-intel.ts` (confirmed absent via glob).

Artifact cards for this intent: `project_card` (PART 15 default) plus optionally `builder_trust` when the buyer asks about the builder (`system-prompt.ts` line 399, few-shot Example 9 line 476).

**Root cause (partial):** PART 11 renderer drops `reraNumber` from the human-readable project block. The model has the field in its context but no row in the template, so it routinely reverts to "RERA not available" despite I25 Fix A aliasing the field.

**Minimum-diff fix:** add one line to the PART 11 block in `system-prompt.ts` around line 43:
```
RERA: ${p.reraNumber ?? 'not available'}
```
**Time: 3 min**, no test churn expected.

---

## B. BUYER: "atms / schools / hospitals near <project>"

**Verdict: ❌ broken**

The Prisma schema HAS an `Amenity` model (`prisma/schema.prisma` lines 153–163): `name`, `type`, `latitude`, `longitude`, `qualityRating`. The public endpoint `GET /api/amenities?type=...` exists (`src/app/api/amenities/route.ts`).

Read-only Neon query result (2026-04-21):
```
Amenity rows total: 0
Amenity by type: {}
```

There are **zero** amenity rows. The chat path does not even query this table — `context-builder.ts` does not `include` or `findMany` `amenity`. The only amenity-near-project data the chat sees is the hardcoded narrative string in `context-builder.ts` lines 186–204 (global school/hospital/ATM list for the whole area, not per project).

So "atms near The Galaxy" returns either:
- a restatement of the global ATM line ("15+ within 1km radius") — not project-specific
- nothing, if the model correctly flags data as absent

**Root cause:** No per-project amenity data is stored or wired. The `Amenity` table exists but has never been populated, no seed script, no ingestion path, no query in the chat pipeline.

**Minimum-diff fix:** two-part, can't be done with code alone:
1. Code (≈60 min): add `nearbyAmenities` query in `context-builder.ts` — haversine radius against each project's `latitude`/`longitude`, top-5 by `qualityRating`. Inject as `p.nearby = [{name,type,distKm}]` into the PART 11 block.
2. Operator data entry (≈4 hr): populate `Amenity` rows per micro-market. 15 ATMs + 7 schools + 5 hospitals × 2 areas ≈ 50 rows. Google Maps Places API scrape is the obvious source.

**Without step 2 the workflow stays ❌ broken even after step 1.**

---

## C. BUYER: visit booking flow

**Verdict: ❌ broken** (in the sense the user expects)

Route: `POST /api/visit-requests` (`src/app/api/visit-requests/route.ts`). Reading end-to-end:
- line 44–48: requires `session.user.id` (403 otherwise)
- line 53: Zod schema accepts `projectId`, `visitScheduledDate`, optional `buyerName`, `buyerPhone`, `buyerEmail`
- line 74: `generateVisitToken()` — opaque ID, not OTP-verified
- line 87–99: `prisma.siteVisit.create({...})` with `otpVerified: false` (line 94 hardcoded)
- line 102–114: sends Resend email with the token — no OTP
- **nowhere** does the route send an SMS, call MSG91, verify a code, or flip `otpVerified` to true

Grep for MSG91 wiring: `msg91|MSG91|/api/otp|send-otp|verify-otp` appears in exactly two files, both admin settings UI: `src/components/admin/SettingsTabs.tsx:186` ("MSG91 DLT approval needed. Balvir action required."), and `src/app/admin/settings/page.tsx`. There is **no** `src/lib/msg91.ts`, no `/api/otp/route.ts`, no envelope sending an OTP. `MSG91_API_KEY` is not read anywhere in `src/**`.

Frontend: `src/components/chat/artifacts/VisitBooking.tsx` collects name + phone + date and POSTs straight to `/api/visit-requests` (lines 106–115). On success it stores a token and shows "Visit confirmed!" (line 217). Never sends phone to an OTP endpoint.

Admin `/admin/visits` page (`src/app/admin/visits/page.tsx`) IS querying `SiteVisit` with `include: { project: { select: { projectName, builderName } } }` (line 28). It displays `visit.buyerName` (line 82) — NOT `user.name`. Since `buyerName` is a SiteVisit-local optional field (schema line 186), this shows whatever the buyer typed into the form, not their authenticated Google profile name. If the form did not include a name field, the cell renders `—`.

Notable: VisitBooking **does** require name + 10-digit phone before submit (line 42). So in practice the admin visits page will show the typed buyer name, but it is self-reported, not authenticated.

**Root cause:** there is no OTP step, MSG91 is unwired. The "OTP-protected" claim on landing page (`src/app/page.tsx:162`) and chat SOP (`system-prompt.ts:239`) is aspirational — the token generated by `generateVisitToken()` is a random string persisted to DB, not a verification of phone ownership.

**Minimum-diff fix:** multi-step, ≈3–4 h (blocked on DLT approval):
1. Add `POST /api/otp/send` calling MSG91 Flow API; cache `{phone → code, expiresAt}` in Redis or DB
2. Add `POST /api/otp/verify`; on success set an `otpVerifiedPhone` cookie or short-lived token
3. Gate `POST /api/visit-requests` on matching cookie phone = body phone; set `otpVerified: true`
4. VisitBooking UI: add a 2-step flow (phone → enter code → confirm)

Until then, visit booking **works** as a lead-capture form but **does not** fulfil the marketing promise.

---

## D. ADMIN: pricing entry flow (P-ADMIN)

**Verdict: ⚠ partial** — form + API + calculator are correct; **not blocked on code**, blocked on migration + data entry

Files inspected:
- `src/app/admin/projects/[id]/pricing/page.tsx` (SSR entry, renders `PricingStep3Form`)
- `src/components/admin/PricingStep3Form.tsx` (480+ line form; Zod-mirrored validation `validationErrors` at line 315; POSTs `{...form, otherCharges: filter}` to `/api/admin/projects/[id]/pricing`)
- `src/app/api/admin/projects/[id]/pricing/route.ts` (POST/PUT; calls `calculateBreakdown`; denormalises `minPrice`/`maxPrice`/`allInPrice` onto `Project` at lines 153–160 and 263–270)
- `src/lib/pricing/calculator.ts` (pure math)

Field-by-field all of `basicRatePerSqft`, `plcRatePerSqft`, `floorRisePerSqft`, `floorRiseFrom`, `unitFloorNo`, villa fields, dev/govt, maintenance, fixed charges, `otherCharges[]`, tax/stamp/registration percentages, `saleDeedAmount` flow correctly from form → Zod → Prisma → denormalise.

Math spot-check (flat, 1500 sqft, BSP 6000, PLC 200, floorRise 50, unitFloor 7, floorRiseFrom 1, GST 5, stamp 4.9, reg 1, saleDeed 9300000, devFixed 100000, infra 50000, carPark 250000, club 75000, legal 15000):
- `ratePerSqft = 6000 + 200 + 50*(7-1) = 6500` ✓
- `basicCostTotal = 6500 * 1500 = 9,750,000` ✓
- `plcTotal = 200 * 1500 = 300,000` ✓
- `devGovtTotal = 150,000` ✓
- `fixedChargesTotal = 250,000*1 + 75,000 + 15,000 = 340,000` ✓
- `gstTotal = 9,750,000 * 5 / 100 = 487,500` ✓
- `stampRegTotal = 9,300,000 * (4.9+1) / 100 = 548,700` ✓
- `grandTotalAllIn = 9,750,000 + 150,000 + 0 + 340,000 + 487,500 + 548,700 = 11,276,200` ✓

No field-level bugs found. Calculator, validator, route, UI all clean.

**However:** `ProjectPricing` table has **0 rows** (read-only query, 2026-04-21). Migration `prisma/migrations/20260421120000_add_project_pricing/` is still unapplied per `docs/CLAUDE_CODE_MASTER_v2.md` §Operator actions. So:
- if migration is unapplied in prod: the form will 500 on first POST because the tables don't exist
- if migration is applied but no rows: buyer-facing price stays at the CSV-imported `minPrice` value, which is 0 for 11/16 projects (see diag below)

Read-only DB findings: `minPrice = 0 for 11 of 16 active projects`. Those are the ones waiting on operator data entry.

**Root cause:** operator hasn't run the migration AND hasn't entered any pricing.

**Minimum-diff fix:** no code change required.
1. `cat prisma/migrations/20260421120000_add_project_pricing/migration.sql`; review
2. `npx prisma migrate deploy`
3. Open `/admin/projects/[id]/pricing` per active project and enter numbers
**Time: ≈45 min for 4 flagship projects.**

---

## E. ADMIN: RERA verification pipeline

**Verdict: ✅ works** (real scrape, not a stub)

`src/app/api/admin/rera-verify/route.ts` (lines 1–90) launches `@sparticuz/chromium` + `puppeteer-core`, visits `https://gujrera.gujarat.gov.in/certificate-search`, tries 9 candidate selectors for the RERA input, falls back to the homepage, scrapes results, returns structured JSON. Admin-gated (line 30). `maxDuration = 30` for Vercel (line 18).

`src/app/admin/projects/new/page.tsx:327` and `[id]/page.tsx:351` expose the "Auto-fetch from gujrera.gujarat.gov.in" button that calls it.

Read-only query: all 16 active projects already have `reraNumber` populated, every one with a real-looking `PR/GJ/AHMEDABAD/...` prefix. None are placeholders (`RERA-<slug>` pattern count = 0).

**RERA count for 16 active projects: 16/16 populated, all look valid.**

No fix needed.

---

## F. ADMIN: PDF ingestion pipeline

**Verdict: ✅ works** (real Claude API call)

`src/app/api/pdf-extract/route.ts` (1–77). Admin-gated (line 6). Accepts `application/pdf` up to 10 MB, base64-encodes, calls `@anthropic-ai/sdk` with `claude-sonnet-4-5`, asks for a strict JSON object of carpet/SBU/floors/units/config/amenities/possession/loading, strips markdown fences, parses.

Not a stub. However: no route is wired INTO the admin project create/edit form — I did not find a client-side `FormData upload` pointing at this route. So functionally it's an API the ops team can `curl` or build a UI on top of, but the admin form does not currently use it as a fill-from-PDF flow.

Non-blocking for the user's stated bug list, but worth noting as a "done-but-orphaned" feature.

---

## G. PUBLIC: /projects filter "Under Construction"

**Verdict: ❌ broken**

`src/app/projects/page.tsx` (lines 240–242) renders pill values `Under Construction` and `Ready to Move`. When clicked, `setStatus('Under Construction')` (line 241) and the fetch is `/api/projects?status=Under Construction` (line 179).

`src/app/api/projects/route.ts:23` applies `where: { constructionStatus: status }` — exact match.

Read-only DB query (2026-04-21):
```
constructionStatus distinct values + counts: { Active: 13, 'Active (Ongoing)': 3 }
```

The filter UI offers "Under Construction" / "Ready to Move"; the database has "Active" / "Active (Ongoing)". **Every filter click produces zero results.**

Origin: `import-projects.mjs:156,190` writes `rera_status || 'Under Construction'` but the CSV's `rera_status` is actually populated with "Active" / "Active (Ongoing)" (GARVI portal canonical wording), so the default is never hit. The UI was written to match the fallback label, not the real data.

**Root cause:** UI pill labels don't match DB values.

**Minimum-diff fix (choose one):**
- (A) Change UI labels in `projects/page.tsx:241–242` to `'Active'` and `'Active (Ongoing)'`, OR
- (B) Normalise at write time in `import-projects.mjs` to map "Active"→"Under Construction", "Active (Ongoing)"→"Under Construction", and introduce a "Ready to Move" value when possession is past.

(A) is a 2-min ship; (B) is ≈15 min and requires a reimport. **Recommend (A).**

---

## H. PUBLIC: /projects/[id] detail page

**Verdict: ⚠ partial**

Inspected `src/app/projects/[id]/page.tsx`. "Book Site Visit" CTA count: **1** (line 171, `SpotlightCTACard`, opens `VisitBookingModal`). No inline second CTA.

Floating chat widget: `src/components/ChatWidgetWrapper.tsx` renders `FloatingChatWidget` when `pathname.startsWith('/projects')` — so the widget bubble appears on every `/projects/[id]` page. From the buyer's perspective this is a second CTA-like floating element: the "chat bubble" is visually prominent, may read as a second call-to-action. It is a distinct feature (chat, not visit), but the surface density is high.

**Root cause of perceived "2 CTAs":** the `FloatingChatWidget` bubble is close in salience to the `SpotlightCTACard`'s `Book Site Visit` button. Not strictly a bug, but is probably what the user reported.

**Minimum-diff fix:** not necessary. If noise reduction is wanted, hide `FloatingChatWidget` when `VisitBookingModal` is open (2-line change in the widget).

---

## I. PUBLIC: sign-in surfaces per page state

**Verdict: ⚠ partial**

### `/chat`, `userId === null`:
1. `src/components/chat/ChatCenter.tsx:688–696` — "Sign in" pill top-right (clickable, triggers `onMessageAction` signin)
2. `src/components/chat/ChatSidebar.tsx:456` — "Sign in" link in sidebar footer (Link to `/auth/signin`)
3. `src/components/chat/ChatSidebar.tsx:408` — "Sign in to see chat history" helper text (not clickable)

**Two clickable sign-in buttons** render simultaneously when signed out. They differ in placement (top-right vs sidebar) but both do the same thing. This is a ⚠ duplication of auth CTA.

### `/chat`, `userId !== null`:
1. `src/components/chat/ChatSidebar.tsx:449` — "Sign out" button
2. `src/components/chat/ChatCenter.tsx:664–686` — avatar chip (img or initial) top-right
No Sign in text. ✅ correct.

### `/projects` (and `/`, `/compare`):
`src/components/Navbar.tsx:28` — navbar hidden on `/`, `/chat`, `/admin`, `/auth`, `/dashboard`. **Visible on `/projects`** (and `/compare`, `/builders`, `/dashboard` not in the exclusion list — wait, `/dashboard` IS excluded, so Navbar is hidden there).

On `/projects`:
- `Navbar.tsx:72–78` — Sign In pill (desktop), always rendered, no auth-state check
- `Navbar.tsx:117–123` — Sign In link (mobile menu), same

If a user is already signed in and navigates to `/projects`, the Navbar still says "Sign In" — clicking it sends them to `/auth/signin` for an already-authenticated session. ⚠ minor regression.

**Root cause (for /chat):** two sign-in CTAs gated on `userId` (both correct post-I22-DUP), intentional redundancy but confusing. **Root cause (for /projects):** Navbar never reads session, renders "Sign In" unconditionally.

**Minimum-diff fix:**
- `/chat`: remove the sidebar Link (keep the top-right pill which is more discoverable). Or keep both and rename the sidebar one to "Sign in to save chats" to disambiguate. **Time: 2 min.**
- `/projects` Navbar: convert to a client component that reads `useSession()` and renders an avatar when signed in. **Time: 8 min.**

---

## J. INFRA: Sentry double-init

**Verdict: ❌ broken** (confirmed)

Two client-side `Sentry.init()` callsites:
1. `src/instrumentation-client.ts:7` — Next 15+ canonical location; full config (`replayIntegration`, `tracesSampleRate`, `replays*`)
2. `sentry.client.config.ts:2` — legacy Sentry Next 7.x location; minimal config

Both get bundled into the client. Double init causes DevTools warnings, double breadcrumb capture, and duplicate session-replay traces (expensive).

`sentry.server.config.ts` and `sentry.edge.config.ts` also exist — those are server/edge and not duplicated on the client. Only the client is doubled.

**Root cause:** When the Next 15+ instrumentation file pattern was adopted, the old config file was not deleted.

**Minimum-diff fix:** delete `sentry.client.config.ts`. Keep `src/instrumentation-client.ts`. **Time: 1 min.**

---

## K. INFRA: CSP worker-src violation

**Verdict: ❌ broken** (confirmed)

`next.config.ts:26` defines:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://browser.sentry-cdn.com; ...
```

No `worker-src` directive; no `blob:` in `script-src`. When `worker-src` is absent, browsers fall back to `script-src` for workers. `blob:` is not in `script-src` → creating a `Blob` Worker is blocked.

Who creates blob workers: `Sentry.replayIntegration()` in `src/instrumentation-client.ts:11`. Session Replay uses a Web Worker created from a Blob URL for its rrweb recorder.

**Root cause:** CSP never extended to cover session replay.

**Minimum-diff fix** in `next.config.ts:26`, append to the CSP string:
```
worker-src 'self' blob:
```
**Time: 1 min.**

---

## L. HOMEPAGE: hardcoded prices

**Verdict: ❌ broken** (still present)

`src/app/page.tsx:152–156`:
```ts
const sampleProjects = [
  { name: 'Riviera Springs', area: 'Shela', price: '₹6,000/sqft', tag: 'Strong Buy' },
  { name: 'Riviera Bliss', area: 'Shela', price: '₹5,800/sqft', tag: 'Buy w/ Cond' },
  { name: 'Vishwanath Sarathya', area: 'South Bopal', price: '₹5,200/sqft', tag: 'Strong Buy' },
]
```

Rendered at line 275 `<ProjectPreview projects={sampleProjects} />`. Cross-check against DB: `Riviera Bliss` IS a real active project, but the landing price is not sourced from the admin form — it's a literal. `Riviera Springs` does not appear in the DB sample; `Vishwanath Sarathya West` does but "Sarathya" (no West) does not.

**Root cause:** landing section was built before admin pricing existed; nobody replaced the stub.

**Minimum-diff fix:** convert `page.tsx` to an RSC that fetches top 3 projects by `decisionTag = 'Strong Buy'` with denormalised price. **Time: 25 min.**

---

## M. HOMEPAGE: commission contradiction

**Verdict: ❌ broken** (still inconsistent)

- `src/app/page.tsx:18` — marquee item: `'1.5% commission only on close'`
- `src/app/layout.tsx:33` — global metadata description includes `'1.5% commission only on close.'`
- `src/lib/system-prompt.ts:277` — "NEVER reveal contactPhone, contactEmail, commissionRatePct, partnerStatus, or any commercial terms."
- `src/lib/system-prompt.ts:335` — "NEVER expose commission amounts or partner arrangements."

Buyer sees "1.5% commission" before entering chat → opens chat → asks "what is your commission?" → model says "I can only help with South Bopal and Shela property questions." (few-shot Example 2 at `system-prompt.ts:431`). Contradictory buyer experience.

**Root cause:** marketing copy and SOP were written at different times without cross-check.

**Minimum-diff fix (choose one):**
- (A) Drop the "1.5% commission only on close" line from marquee and meta description. Product stays honest without baring the number. **Time: 2 min.**
- (B) Update `system-prompt.ts` PART 8 to say "reveal commission rate only if directly asked; it's 1.5% on close." **Time: 5 min** + needs response-checker loosening.

(A) is lower-risk.

---

## N. NAVBAR: glitches on /projects

**Verdict: ⚠ partial**

`src/components/Navbar.tsx:28` — hidden when pathname is `/`, starts with `/chat`, `/dashboard`, `/admin`, `/auth`. Visible on `/projects`, `/projects/[id]`, `/builders/[id]`, `/compare`.

Link set (line 32–34): `[{ name: 'Projects', href: '/projects' }]`. Only one link. Clicking from `/projects` just re-routes to `/projects` (dead click; no other public pages are linked even though they exist).

Unconditional "Sign In" pill (line 72–78) whether session exists or not — see §I root cause.

No CSS glitches spotted on a static read (fixed-top, max-w-6xl, md:flex gates). The user's reported "glitches" are probably about (a) the always-there Sign In button when already signed in, and (b) the single-link nav feeling sparse.

**Root cause:** incomplete link set + stateless auth CTA.

**Minimum-diff fix:** add `'/builders'` and `/compare'` links; add `useSession()` gate on Sign In. **Time: 10 min.**

---

## O. DUPLICATE SIGN-IN — one-more-time verification

**Verdict: ⚠ partial** (no new missed render, but prior I22 fix left two parallel surfaces standing)

Grep of `"Sign in"` across `src/components/chat/**` returns:
- `ChatCenter.tsx:695` (top-right pill, conditional `userId ?` — line 664)
- `ChatSidebar.tsx:408` (helper text, conditional `!userId` — line 407)
- `ChatSidebar.tsx:456` (sidebar footer Link, conditional `!userId` — line 416 / `: ... Sign in` on else branch)
- `VisitBooking.tsx:185,190,203` (in-artifact signin flow, conditional on `status === 'signin'`)
- `ProjectCardV2.tsx:199,203` (save-project CTA, conditional on `!userId`)

All gated correctly on `userId` (the canonical signal — this is the I22-DUP fix). No unconditional render missed.

BUT: **when `userId === null` on /chat, both `ChatCenter` top-right pill AND `ChatSidebar` footer Link render at the same time**. They do different things functionally (pill triggers `onMessageAction`, Link navigates to `/auth/signin`) but to the user they look like two sign-in CTAs. This is a ⚠, not a HIGH-severity miss — it is intentional after I22 but still visually doubled.

No unconditional render hiding elsewhere. `SiteHeader` does not exist; `PublicLayout` does not exist; `src/app/layout.tsx` only mounts `Navbar` (hidden on `/chat`), `ChatWidgetWrapper` (hidden on `/chat`), `Analytics`, `SpeedInsights`.

**Root cause:** the pill (I22) was added without removing the sidebar link.

**Minimum-diff fix:** demote `ChatSidebar.tsx:456` from a `<Link>` to a muted helper phrase: `<p>Sign in via the pill above →</p>` or remove entirely. **Time: 2 min.**

---

## Recommended ONE workflow to fix first

**G — `/projects` filter "Under Construction"**

Rationale:
- Single biggest visible bug in the public funnel — user picks a filter, gets zero results, bounces. That's 100% abandonment on filter click.
- Fix is a 2-minute UI-label change (option A) with zero risk to data, auth, or chat.
- Fixing it does not require migration, env vars, or operator data entry — unblockable right now.
- Proves to the user "we fix what we find" in minutes, builds trust for the harder fixes (B, C, L).

Second-priority follow-ups, from smallest diff to largest impact, all shippable today:
- **J + K** (Sentry double-init + CSP `worker-src`) — both 1-min config edits, kill the loudest DevTools noise
- **M** (drop "1.5% commission" from marquee + layout metadata) — 2 min, removes the buyer-facing SOP contradiction
- **O** (remove the sidebar "Sign in" Link) — 2 min, eliminates the duplicate signed-out CTA

## Parallel-safe cleanups that can ride alongside

1. **A fix** — add one-line `RERA: ${p.reraNumber}` to PART 11 block (`system-prompt.ts:43`). 3 min, no test churn. Makes all RERA questions answerable.
2. **L fix** — replace `sampleProjects` array with RSC fetch of top-3 by `decisionTag`. 25 min, removes fake prices from landing. Touches only `src/app/page.tsx`.
3. **N fix** — extend `Navbar` link set + gate Sign In on `useSession()`. 10 min, touches only `src/components/Navbar.tsx`.
4. **H cleanup** — hide `FloatingChatWidget` when `VisitBookingModal` is open. 2 min, touches `FloatingChatWidget.tsx` + a localStorage or window-event hook.
5. **F UI wiring** — add "Fill from brochure" button to admin project form that POSTs to `/api/pdf-extract` and populates the form. ≈30 min, pure additive.

None of these touch the same file or the same test path as G, so they parallelise cleanly.

## Operator actions still open (not code)

1. **Apply migration** `prisma/migrations/20260421120000_add_project_pricing/` — `npx prisma migrate deploy`. 5 min.
2. **Apply migration** `prisma/migrations/20260421000000_add_rag_embeddings/` — run `CREATE EXTENSION vector` first, then migrate. 10 min.
3. **Enter pricing** for 11/16 active projects via `/admin/projects/[id]/pricing`. ≈45 min for flagships.
4. **Populate Amenity rows** (B fix step 2) — ≈4 h manual or Google Places scrape. Blocks the "ATMs near X" flow.
5. **DLT approval + MSG91 wiring** (C fix) — external dependency; ≈3 h of code once approved.
6. **Builder agreements** (3 pending) — non-technical.
7. **OAuth env/redirect** verification per `docs/CLAUDE_CODE_MASTER_v2.md` §4.

## Temp diag script to delete

`scripts/_rera-status.ts` — I had no `rm` permission; the file is now a stub with a deletion note. Please `rm scripts/_rera-status.ts` in the main session.

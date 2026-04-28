# P1-R2 Week 1 Day 1 — Audit Fields Investigation

> Read-only investigation. No schema or code touched. Output: this file +
> `task_plan.md` + `progress.md`. Day 2 generates the migration.

## §14 Verdict

`[OK]` — investigation complete on `p1-audit-fields-day1` off `840282f`.
- Schema delta is small (12 new columns + 3 indices, no FKs, all nullable or
  defaulted). 6 open questions resolved at ≥80% confidence; defaults locked.
- Two RERA scraper routes exist (`/api/rera-fetch` + `/api/admin/rera-verify`)
  — neither caches; both are stateless. Day 2 cache lands on Project, not a
  side table.

---

## §1 State of main when Day 1 started

- Local main is at `840282f` ("feat(admin): cosmetic revamp …"), one commit
  ahead of `origin/main` at `1e09dd7`. The originating prompt assumed main =
  `1e09dd7`; the cosmetic revamp had already landed locally and is described
  as "WIP" in the prompt was actually committed. Working tree was clean.
- `npm run verify` baseline on this state: **162/162 tests, build clean,
  prisma validate ✅, lint 0 errors / 97 warnings (all pre-existing)**. Same
  as the SESSION_HANDOFF baseline.
- Branch: `p1-audit-fields-day1` created off `840282f`.

## §2 Audit-relevant field inventory (current `prisma/schema.prisma`, 481 lines)

> All file paths are `prisma/schema.prisma` unless noted. Lines validated
> against the file as of `840282f`.

### Project (lines 9–76)

- `id` (cuid) — line 10
- `reraNumber String @unique` — line 23 (the field RERA verification keys off)
- `createdAt DateTime @default(now())` — line 61
- `updatedAt DateTime @updatedAt` — line 62
- **No `createdBy` / `updatedBy` / `version` columns.**
- **No `reraVerified` / `reraData` / `reraVerifiedAt` columns.**
- Source-tracked free-text precedent (added after the Vishwanath Sarathya
  insider-note incident — see comment at line 42–49):
  - `analystNoteSource String?` (50), `analystNoteAuthor String?` (51),
    `analystNoteVerifiedAt DateTime?` (52)
  - `honestConcernSource String?` (53), `honestConcernAuthor String?` (54),
    `honestConcernVerifiedAt DateTime?` (55)
- Existing indices: `microMarket`, `isActive`, `decisionTag`,
  `constructionStatus`, `builderName` (lines 71–75). No `updatedBy` index
  (column doesn't exist yet); no `reraVerified` index.

### Builder (lines 78–97)

- `id` (cuid) — line 79
- `builderName String @unique` — line 80
- `createdAt`, `updatedAt` — lines 93–94
- **No `createdBy` / `updatedBy` / `version`.**
- No indices (only the implicit unique on `builderName`).

### PriceHistory (lines 139–147)

- `recordedAt DateTime @default(now())` — line 143
- **No `recordedBy`.** Cannot answer "who set this price?" from the table.
- One index: `@@index([projectId])` (line 146).

### ProjectPricing (lines 395–464) — **precedent for the version+updatedBy pattern**

- `lastUpdated DateTime @updatedAt` — line 457
- `updatedBy String?` — line 458 — **plain String, not FK to User**
- `pricingVersion Int @default(1)` — line 459 — **NOT NULL with default**
- These two columns are the canonical pattern this delta proposes to extend
  to Project + Builder. Any deviation needs justification.

### PricingHistory (lines 466–481)

- `changedBy String?` — line 477 — same plain-String pattern
- `changeReason String?` — line 478
- `changedAt DateTime @default(now())` — line 476
- Index: `@@index([projectId, changedAt])` — line 480
- This is the existing audit row for ProjectPricing writes. AuditLog and
  PricingHistory currently overlap; no consolidation proposed here.

### AuditLog (lines 339–352)

- `action String` (341), `entity String` (342), `entityId String?` (343)
- `data Json?` (344)
- `userEmail String` (345) — **NOT NULL plain String** (no FK to User)
- `createdAt DateTime @default(now())` (346)
- **No `entityVersion`.** Cannot reconstruct "what version of Project X was
  written against by this AuditLog row."
- Indices: `action`, `entity`, `userEmail`, `createdAt` — lines 348–351.

---

## §3 RERA fetch route map

The prompt named one route. **There are two**, with overlapping responsibility:

### `src/app/api/rera-fetch/route.ts` (113 lines)

- **Auth:** admin email gate (line 5).
- **Input:** `POST { reraNumber: string }`.
- **Strategy:**
  1. Lazy-import `puppeteer-core` + `@sparticuz/chromium`, launch headless
     Chromium.
  2. Navigate to `https://gujrera.gujarat.gov.in/project-details?projectno=<reraNumber>`,
     `waitUntil: 'networkidle2'`, 30s timeout (lines 22–23).
  3. `page.evaluate(...)` runs DOM selectors against `h1`,
     `[class*="project"]`, `[class*="developer"]`, etc. Returns
     `{projectName, builderName, possessionDate, totalUnits, reraStatus,
     escrowBank, complaints, rawText}` (lines 24–37).
  4. **Anthropic Claude fallback:** if `data.projectName` is empty, calls
     `claude-sonnet-4-5` with the first 3000 chars of `document.body.innerText`
     and asks for JSON extraction (lines 39–60). Returns
     `{success, data: parsed, source: 'claude'}` on success.
- **Geo-block / timeout handling (lines 75–98):** `msg.includes` matches on
  `timeout`, `etimedout`, `econn*`, `enotfound`, `navigation`, `net::err`,
  `blocked`, `403/502/503/504`. Returns 200 with
  `{ok:false, code:'RERA_GEO_BLOCKED', reason, suggestion}`. UI consumers
  show inline note; admin manual-entry fallback (`RERAManualEntry.tsx`)
  takes over.
- **Caching:** **none.** Every call re-launches Chromium and re-scrapes.
- **Persistence:** **none.** Returned blob is ephemeral; nothing written to
  Project, AuditLog, or any cache table.

### `src/app/api/admin/rera-verify/route.ts` (217 lines)

- **Auth:** admin email gate (line 30).
- **Input:** `POST { reraNumber: string }`. Trim+upper-cases (line 39).
- `maxDuration = 30` (line 18).
- **Strategy:** different — this one navigates to
  `https://gujrera.gujarat.gov.in/certificate-search` (line 50), tries 9
  search-input selectors (lines 57–67), types the cleaned RERA number,
  submits, waits for navigation, then runs a label-based extractor that
  walks `td/th/dt/dd/span/p/div` looking for "project name", "promoter name",
  "completion date" etc. (lines 127–166).
- **Returns:** `{projectName, legalEntity, status, possessionDate,
  startDate, totalUnits, complaints, escrowBank, district, address,
  landArea, reraNumber, scrapedAt}` (lines 187–201). Different shape from
  `/api/rera-fetch`.
- **No-results handling (lines 168–184):** if the body text contains
  "no record" / "not found" / "no data", returns 404. Otherwise 502.
- **Caching:** **none.**
- **Persistence:** **none.**

### Duplicate-surface flag

Two scraper endpoints with overlapping intent:

- `/api/rera-fetch` is wired into `src/app/admin/projects/new/page.tsx:359`
  and `src/app/admin/projects/[id]/page.tsx:396` (operator-facing "Fetch
  from portal" button per `RERAManualEntry.tsx`).
- `/api/admin/rera-verify` is not wired into any UI in `src/app/admin/`
  (verified by grep — only the route file references its path). Likely a
  leftover or experimental path.

**Recommendation for Day 2/3 (not yet locked):** consolidate to one route.
Either delete `/api/admin/rera-verify` or fold its label-extractor into
`/api/rera-fetch` as a third-tier fallback. Out of Day 1 scope.

---

## §4 Schema delta proposal

> All proposed columns are nullable or defaulted. Zero data backfill required
> at migration time. Existing rows pick up `version=1` from the default. The
> `Json?` fields default to NULL.

### Project (additions)

```prisma
createdBy       String?    // operator email at row create. Null on imports / pre-migration.
updatedBy       String?    // operator email at last write. Null on imports / pre-migration.
version         Int        @default(1)  // bumps on every UPDATE via audit-write.ts.
reraVerified    Boolean    @default(false)  // true ONLY when scrape or manual-entry confirmed RERA portal.
reraData        Json?      // raw scrape blob (puppeteer / claude / manual). Null when unverified.
reraVerifiedAt  DateTime?  // wall-clock timestamp of last verify. Drives 7d cache TTL.

@@index([updatedBy])
@@index([reraVerified])
```

### Builder (additions)

```prisma
createdBy String?
updatedBy String?
version   Int     @default(1)

@@index([updatedBy])
```

### PriceHistory (additions)

```prisma
recordedBy String?  // operator email or 'cron' / 'import' for non-human writes.
```

(no new index — the existing `@@index([projectId])` covers the dominant query.)

### AuditLog (additions)

```prisma
entityVersion Int?  // version of target entity at time of write. Null for pre-migration rows.
```

(no new index — `@@index([entity])` plus `@@index([entityId])` already cover
"history for entity X" queries; entityVersion is read-after-filter.)

**Total:** 12 new columns, 3 new indices, 0 FKs, 0 cascade rules.

---

## §5 Reversal SQL

Day 2 migration emits forward DDL. This block is the rollback if Day 4–5
verification flags an unrecoverable problem. Safe to run on Neon **only if
no application code yet reads these columns** (i.e., before audit-write.ts
ships in Day 3).

```sql
-- Project
ALTER TABLE "Project" DROP COLUMN IF EXISTS "createdBy";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "updatedBy";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "version";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "reraVerified";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "reraData";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "reraVerifiedAt";
DROP INDEX IF EXISTS "Project_updatedBy_idx";
DROP INDEX IF EXISTS "Project_reraVerified_idx";

-- Builder
ALTER TABLE "Builder" DROP COLUMN IF EXISTS "createdBy";
ALTER TABLE "Builder" DROP COLUMN IF EXISTS "updatedBy";
ALTER TABLE "Builder" DROP COLUMN IF EXISTS "version";
DROP INDEX IF EXISTS "Builder_updatedBy_idx";

-- PriceHistory
ALTER TABLE "PriceHistory" DROP COLUMN IF EXISTS "recordedBy";

-- AuditLog
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "entityVersion";
```

---

## §6 Six open questions — resolved at ≥80% confidence

### Q1 — `version` nullable or NOT NULL?

**Resolution:** `Int @default(1)` (NOT NULL).
**Confidence:** 95%.
**Why:** `ProjectPricing.pricingVersion Int @default(1)` (line 459) is the
existing precedent. NULL would force every read-site to handle `version ?? 1`
and complicates optimistic-concurrency comparisons in audit-write.ts. The
default backfills existing rows to 1 transparently.
**Tradeoff:** treats every pre-migration row as "version 1" with no way to
distinguish "actually fresh" from "pre-instrumentation". Acceptable; the
distinguisher is `createdBy IS NULL`.

### Q2 — `createdBy` / `updatedBy` as plain `String?` or FK to `User.email`?

**Resolution:** plain `String?` (email or pseudo-identity like `'cron'` /
`'import'`).
**Confidence:** 90%.
**Why:**
- `ProjectPricing.updatedBy` (458), `PricingHistory.changedBy` (477), and
  `AuditLog.userEmail` (345) are **all plain String in this schema** — three
  precedents, zero FKs.
- `ADMIN_EMAIL` env var is the operator identity; the User table only fills
  on first NextAuth sign-in. A FK would block server-side scripts and seed
  jobs that don't go through OAuth.
- Backfill stays trivial — null for unknowns, no User-row creation cascade.
**Tradeoff:** orphan emails accumulate as operators rotate. Acceptable;
AuditLog already has this issue and it has not surfaced as a real problem.

### Q3 — `reraData` raw blob vs normalized columns?

**Resolution:** `Json?` (raw blob).
**Confidence:** 85%.
**Why:**
- The two scrapers (`/api/rera-fetch` and `/api/admin/rera-verify`) return
  **different shapes**: rera-fetch returns `{projectName, builderName,
  possessionDate, totalUnits, reraStatus, escrowBank, complaints, rawText}`;
  rera-verify returns `{legalEntity, status, possessionDate, startDate,
  totalUnits, complaints, escrowBank, district, address, landArea, scrapedAt}`.
  Forcing one column shape now picks a winner before consolidation (§3 flag).
- Manual-entry path (`RERAManualEntry.tsx`) writes whatever the operator
  pastes — operator-trust > schema-uniformity per AGENT_DISCIPLINE §7.
- Existing precedent: `ProjectPricing.bhkConfigs Json?` (line 454) and
  `Project.charges Json` (line 19) both store variable-shape data.
- High-value derived fields (e.g., `reraStatus String?`) can be promoted in
  a future migration if query patterns demand it.
**Tradeoff:** SQL queries inside `reraData` use `->>` operator; Prisma surfaces
this as `JsonValue` requiring TS narrowing. Worth it for evolvability.

### Q4 — Cache TTL?

**Resolution:** **7 days** (168 hours). Treat row as stale and re-fetch when
`now - reraVerifiedAt > 7d`.
**Confidence:** 80%.
**Why:**
- RERA portal data has low refresh velocity: status transitions
  (ongoing → completed) and complaint-count updates trickle in over weeks.
- Geo-blocks and Vercel Hyderabad/SIN-1 routing fail unpredictably; an
  aggressive TTL (1 day) increases failure exposure without proportional
  freshness benefit.
- Manual ops: operator can force-refresh via the existing "Fetch from
  portal" button at any time.
**Tradeoff:** a status flip (ongoing → completed) lags up to 7 days for
buyers. Acceptable; admin can manual-refresh. Reconsider if Mama
operationally hits this.

### Q5 — `RERA_GEO_BLOCKED` behavior on `reraVerified`?

**Resolution:** **do NOT flip `reraVerified=true` on geo-block.** Leave
`reraVerified=false` and `reraData=null`. UI shows "RERA portal unavailable
from this region — verify manually" (existing copy).
**Confidence:** 95%.
**Why:**
- `reraVerified` is a buyer-trust field — false-positive triggers AGENT_DISCIPLINE
  §7 (SCHEMA WRITE PROVENANCE) violation. A geo-block is a non-confirmation,
  not a confirmation.
- The manual-entry fallback (`RERAManualEntry.tsx`) IS allowed to set
  `reraVerified=true` with `reraData = {source:'manual', operatorEmail, raw: <pasted>}`
  and `reraVerifiedAt = now` — operator vouching is a legitimate verification.
- Aligns with the analystNote / honestConcern source-tracking precedent
  (lines 42–55).
**Tradeoff:** projects in regions where the portal is geo-blocked are stuck
at `reraVerified=false` until an operator manually verifies. Acceptable.

### Q6 — `entityVersion` on AuditLog nullable?

**Resolution:** `Int?` (nullable).
**Confidence:** 85%.
**Why:**
- Pre-migration AuditLog rows have no version to claim. Nullable is more
  honest than backfilling to 1 (which falsely implies "this was version 1").
- audit-write.ts (Day 3) sets `entityVersion = Project.version` at the moment
  of write going forward. Forward rows always populated.
- Audit-replay tooling can `WHERE entityVersion IS NOT NULL` to filter to
  the instrumented era.
**Tradeoff:** TS code reading the field must handle null. Acceptable; only
audit-replay/forensic tools touch this column.

---

## §7 Agents B / C / D delta — impact on audit-fields proposal

`git log --oneline 99e5c49..1e09dd7` returned 7 commits across three agents:

- **Agent B (`3d465d9`):** JSON-LD on `/projects/[id]` + `/builders/[id]`
  layouts, H1 enrichment, error-page copy, focus rings, compare 1-selected
  state, dashboard tone. **No schema. No `/api/admin/*` write-path changes.**
- **Agent C (`8f3ad98`):** `/api/pdf-extract` refactored to streaming SSE
  (Anthropic messages.stream). Two new admin client components:
  `PdfStreamProgress.tsx` (Cloudinary upload + SSE consumer) and
  `RERAManualEntry.tsx` (operator paste-and-fill, **no new endpoint** — fills
  existing form fields client-side). `/admin/projects` price-needed pill.
  **No schema.** **Relevant note:** RERAManualEntry.tsx is the manual-entry
  fallback assumed in Q5 — it currently fills form fields but does not
  persist a "manually verified" marker because `reraVerified` does not yet
  exist. Day 3 audit-write.ts will need to wire this surface.
- **Agent D (`d5e2d15`):** `/localities/[slug]` (server-rendered SEO page),
  per-project OG card on `/projects/[id]/opengraph-image.tsx`, sitemap+robots
  polish. **No schema. No write-path changes.**

`git diff 99e5c49..1e09dd7 -- prisma/schema.prisma prisma/migrations/`
returned **empty**. Schema audit-fields proposal is **unaffected** by the
B/C/D wave.

The 162-test baseline used in this investigation is the post-B/C/D number.

---

## §8 Three-line recap

- Schema delta: 12 columns + 3 indices, all nullable or defaulted, follows
  existing `ProjectPricing.updatedBy` / `pricingVersion` precedent.
- RERA: two scraper routes today, neither caches; cache TTL 7d via
  `reraVerifiedAt`. Geo-block must NOT flip `reraVerified=true`.
- All six open questions defaulted at ≥80% confidence; Day 2 generates
  migration without further operator input unless Q3/Q4/Q6 get pushback.

## Discipline checklist applied

- §3 (DB transaction compatibility) — no `$transaction` usage in scope; n/a
- §4 (duplicate-surface) — flagged: two RERA scrapers (§3 above)
- §7 (schema write provenance) — Q5 resolution explicitly enforces this rule
- §9 (verify gates) — baseline 162/162 captured before any work
- §10 (report-back format) — applied
- §11 (sub-agent rules) — no sub-agents fired (single-thread investigation)
- §13 (session handoff) — read at session start, will update at sprint end
  (not Day 1)
- §14 (verdict format) — applied above
- §15 (autonomous decisions) — six decisions made at ≥80% confidence,
  documented for operator override

Skipped: §1, §2, §5, §6, §8, §12 — n/a to a read-only investigation
(no external domains, no env vars, no client/server boundaries, no streaming,
no response-checker rules, no commit-blocked CI).

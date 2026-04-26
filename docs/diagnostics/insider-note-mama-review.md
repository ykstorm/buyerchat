# Insider Notes Needing Mama's Verification

> **What this is**: A short list of `analystNote` entries on live projects
> that contain phrases looking like fabricated stats ("since YYYY",
> "X years experience", "ET Industry Leader", "X+ projects"). Generated
> 2026-04-26 from the same audit pattern as commit `f8ce4df`.
>
> **What you do**: For each row below, open `/admin/projects` → search by
> name → verify or edit the text → click Save. After Save, the source
> badge flips from orange ("unknown") to green ("✓ Verified by you on
> <date>").
>
> **Why this matters**: Buyers see these notes as your authoritative
> commentary. If a phrase is wrong, the trust cost is high.

> **Note on field names**: the codebase column is `analystNote` (the UI
> label is "Analyst Note (insider intel)"). The earlier sprint brief
> referred to it as `insiderNote` — same field.

---

## Suspicious entries (3 rows)

### 1. Riviera Bliss — Goyal & Co. / HN Safal

**Suspicious phrase:** "Goyal & Co. (250+ projects since 1971) + HN Safal (43M sqft)"

**Field:** `analystNote`

**Last updated:** 2026-04-09 (per `import-projects.csv`)

**Current source tag:** `unknown` (orange badge — never verified by an
operator since CSV import)

**Action needed:**
- [ ] Confirm "since 1971" founding year for Goyal & Co. (cite source:
      RERA filing / brochure / builder verbal / other)
- [ ] Confirm "250+ projects" for Goyal & Co. (same)
- [ ] Confirm "43M sqft" for HN Safal (same)
- [ ] If any number is unverifiable → edit on `/admin/projects` and
      remove the unverified clause
- [ ] Save → badge flips green

**How to find**: `/admin/projects` → search "Riviera Bliss" → open →
scroll to Analyst Note section.

---

### 2. Shaligram Pride — Shaligram Group

**Suspicious phrase:** "74/117 units sold"

**Field:** `analystNote`

**Last updated:** 2026-04-09 (per `import-projects.csv`)

**Current source tag:** `unknown`

**Action needed:**
- [ ] Confirm "74 of 117 units sold" — is this still current?
      (sales data goes stale fast)
- [ ] If stale or incorrect → edit on `/admin/projects` and either
      update with today's actual number or remove
- [ ] Save → badge flips green

**Note**: even if the number was true on 2026-04-09, it's stale by
~2-3 weeks now. Either refresh from the builder or remove the
specific count and replace with qualitative copy ("strong sales
velocity" / "majority sold").

**How to find**: `/admin/projects` → search "Shaligram Pride" → open →
scroll to Analyst Note section.

---

### 3. Vishwanath Sarathya West — Vishwanath Builders

**Suspicious phrase:** "34 years Gujarat experience + ET Industry Leader 2023"

**Field:** `analystNote`

**Last updated:** 2026-04-09 (per `import-projects.csv`)

**Current source tag:** `unknown`

**Action needed:**
- [ ] Confirm "34 years Gujarat experience" — when was Vishwanath
      Builders founded? Cite source.
- [ ] Confirm "ET Industry Leader 2023" — is this an actual award
      Vishwanath received? Cite ET article URL or page reference.
- [ ] If either is unverifiable → edit and remove the unverified
      clause. The phrase looks like an LLM-style flourish — verify
      before keeping.
- [ ] Save → badge flips green

**How to find**: `/admin/projects` → search "Vishwanath Sarathya" →
open → scroll to Analyst Note section.

---

## How to verify and clear the badge

1. Open `/admin/projects/<id>` (or use the search on `/admin/projects`).
2. Scroll to the **Analyst Note (insider intel)** section.
3. See the orange/yellow badge: `Source: unknown` or `Source: imported`.
4. Edit the text if needed (remove unverified claims).
5. Click **Save** → badge turns green: `✓ Verified by <your email> on
   <date>`.

## Rules going forward

- **Operator-entered** = green badge, `source = 'operator'`
- **CSV-imported** (this is what the 3 rows above are) = yellow badge,
  `source = 'imported'`
- **AI-generated** = RED badge, **BLOCKED** from being saved (commit
  `f8ce4df` lockdown — `src/lib/project-content-source.ts`)
- **Unknown legacy** = orange badge, prompts review (the 3 rows above)

---

## Operational note (for the next agent reading this)

DB query was not available in the audit-doc context (no shell write
permission); the 3-row count is corroborated against
`docs/diagnostics/insider-note-audit.md` (commit `f8ce4df`,
2026-04-25) and the seed file `import-projects.csv`. No new rows are
expected since the AI write-path lockdown shipped in `f8ce4df`.

If a new agent runs the live query and finds a different count, this
doc is the static fallback — overwrite it with the live result and
note the discrepancy.

# Insider Note Fabrication Audit — 2026-04-25

Scope: `Project.analystNote` (UI label "Analyst Note (insider intel)") and `Project.honestConcern` across all rows.

Projects with non-null notes: **16**
Note fields scanned: **32**
Suspicious phrases found: **3**

## Suspicious phrases found

| Project | Builder | Field | Suspicious phrase | Excerpt | Last updated |
| --- | --- | --- | --- | --- | --- |
| Riviera Bliss | Goyal & Co. / HN Safal | `analystNote` | since YYYY: "since 1971" | Goyal & Co. (250+ projects since 1971) + HN Safal (43M sqft). Premium 3BHK, 4… | 2026-04-09 |
| Shaligram Pride | Shaligram Group | `analystNote` | N projects delivered: "117 units sold" | …ready project in BuyerChat database. 74/117 units sold. 0% project loan + SBI escrow. | 2026-04-09 |
| Vishwanath Sarathya West | Vishwanath Builders | `analystNote` | ET Leader award: "ET Industry Leader 2023" | …menities. 34 years Gujarat experience + ET Industry Leader 2023. | 2026-04-09 |

## Patterns checked

- **since YYYY** — `\bsince\s+\d{4}\b`
- **N years experience** — `\b\d+\s*years?\s+(experience|in\s+gujarat|track\s+record|in\s+the)\b`
- **N projects delivered** — `\b\d+\s*(projects?|units?)\s+(delivered|sold|completed)\b`
- **ET Leader award** — `\bET\s+(Industry\s+)?Leader\s+\d{4}\b`
- **awarded YYYY** — `\baward(?:ed|s)?\s+\d{4}\b`
- **established YYYY** — `\bestablished\s+(?:in\s+)?\d{4}\b`

## Recommendations for operator

1. Review each flagged phrase. If verified against a primary source (RERA filing, ET article URL, builder PR), keep the text and resave from `/admin/projects/<id>` — the API will stamp `analystNoteSource = "operator"` plus your email + verifiedAt.
2. If unverifiable, replace the phrase with a verified alternative or remove it.
3. After backfill migration, every note row will start with `source = "unknown"` until an operator resaves it. The orange "? Source unknown" badge in the admin edit page makes pending review visible at a glance.
4. AI-generated content is now blocked from these fields by `src/lib/project-content-source.ts` — the lock fires a Sentry warning if any code path attempts a write with `source = "ai_generated"`.

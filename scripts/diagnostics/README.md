# Diagnostic scripts

One-shot read-mostly scripts written during specific bug investigations.
Each is dated/scoped — preserved for reproducibility, not part of the
production path.

Run with `tsx`:

```bash
npx tsx scripts/diagnostics/<script>.ts
```

| Script | Sprint / date | Purpose |
| --- | --- | --- |
| `check19-fp-scan.ts` | Sprint 4 | Sample CHECK 19 PRICE_FABRICATION false-positive rate against historical chat logs. |
| `diagnostic-2026-04-29.ts` | 2026-04-29 | Pre-Sprint-7 capture-stage distribution snapshot. |
| `sprint7-capture-check.ts` | Sprint 7 | Verify `captureStage` field state on production sessions before Model A fix. |
| `sprint75-user-distribution.ts` | Sprint 7.5 | User-bound vs anonymous session ratio for the render-gate diagnosis. |
| `sprint85-artifact-payload.ts` | Sprint 8.5 | Inspect `artifactHistory` JSON shape on suspect sessions. |
| `sprint85-verdict-confirm.ts` | Sprint 8.5 | Confirm CASE_C verdict — server persists, client misses. |
| `sprint85-visit-booking-emission.ts` | Sprint 8.5 | Count `visit_booking` CARD emissions vs persistence vs hydration. |

These scripts hit the live database (DATABASE_URL from `.env`) — read-only
unless explicitly noted in the script header. Don't run unfamiliar
diagnostic code against prod without reading it first.

# BuyerChat — Audit Issue Backlog
# Updated: Day 19 | 23 March 2026


## HIGH — Fix before real users
| Issue | Severity | Status | Description | From |
|-------|----------|--------|-------------|------|
| ISSUE-04 | HIGH | OPEN | Rate limiter in-memory, resets on Vercel cold start. Fix: Upstash Redis. Day 31. | Day 14 |
| ISSUE-18/19 | HIGH | OPEN | Context cache in-memory — stale across Vercel instances. Fix: Upstash Redis. Day 31. | Day 14 |
| ISSUE-57 | HIGH | OPEN | Block builder rename if projects attached. Fix in admin PATCH route. Day 23. | Day 19 |
| ISSUE-09 | HIGH | OPEN | Users not saved to DB on sign-in. Add prisma.user.upsert in signIn callback. | Day 14 |

## MEDIUM — Fix in buffer days
| Issue | Severity | Status | Description | From |
|-------|----------|--------|-------------|------|
| SCORE-FIX | MEDIUM | OPEN | deliveryScore max is 30 not 20. Fix score bars, admin label, score-engine.ts weights Day 24. | Day 19 |
| ISSUE-08 | MEDIUM | OPEN | OTP system not built. MSG91 DLT registration pending. | Day 14 |

## LOW — Fix when convenient
| Issue | Severity | Status | Description | From |
|-------|----------|--------|-------------|------|
| ISSUE-06 | LOW | OPEN | FROM_EMAIL is onboarding@resend.dev — change to custom domain before launch. | Day 14 |

## CLOSED — Fixed and auditor-verified
| Issue | Severity | Fixed on | Verified |
|-------|----------|----------|---------|
| ISSUE-01/02 | CRITICAL | Day 19 | BuilderAIContext type guard + response checker business leak |
| ISSUE-03/34 | CRITICAL | Day 17 | ChatSession.sessionId @unique migration run |
| ISSUE-13/25/26 | CRITICAL | Day 17 | partnerStatus/commissionRatePct removed from all public APIs |
| ISSUE-14 | CRITICAL | Day 17 | Upload route file type + size validation |
| ISSUE-15 | CRITICAL | Day 17 | Admin builder POST response stripped |
| ISSUE-45 | CRITICAL | Day 19 | Price history route requires auth |
| ISSUE-46/52 | CRITICAL | Day 19 | Demand route admin-only + date validation |
| ISSUE-47 | CRITICAL | Day 19 | CORS + security headers in next.config.ts |
| ISSUE-27/28 | HIGH | Day 17 | priceHistory/siteVisits stripped from public projects |
| ISSUE-16 | HIGH | Day 17 | Duplicate visit booking check added |
| ISSUE-48/49 | HIGH | Day 19 | Rate limiting on localities + infrastructure |
| ISSUE-50 | HIGH | Day 19 | SavedProject model + real DB persistence |
| ISSUE-51 | HIGH | Day 17 | Deal.attributionToken @unique confirmed |
| ISSUE-54 | HIGH | Day 19 | highDemand 30-day window |
| ISSUE-05 | HIGH | Day 17 | Unicode normalization for injection detection |
| ISSUE-30 | MEDIUM | Day 19 | Hallucination keywords expanded |
| ISSUE-29 | MEDIUM | Day 17 | sg highway removed from out-of-area list |
| ISSUE-55/56 | MEDIUM | Day 19 | Few-shot examples updated (injection/no-match/out-of-area) |
| ISSUE-12 | LOW | Day 19 | Infrastructure.name @unique |
| ISSUE-58 | LOW | Day 19 | SiteVisit onDelete Cascade |
| ISSUE-33 | LOW | Day 17 | visitToken removed from API response |
| ISSUE-03 | CRITICAL | Day 20 | try/catch added to all API routes |
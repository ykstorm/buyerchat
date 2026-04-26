# Master Fix List — Homesty.ai

Generated 2026-04-26. Synthesis of the four parallel audits run for
the P2-WAVE2-PREP sprint, plus untracked-work review and the open
issues already documented in `CLAUDE.md`.

This is the **single source of truth** for "what's broken / what to
ship next." When in doubt, work top-down.

Source documents (all live in `docs/diagnostics/`):
- `pricing-surface-diagnosis.md` — pricing form fragmentation
- `insider-note-mama-review.md` — 3 unverified analyst notes
- `cybersec-sweep-2026-04-26.md` — verified security findings
- `uxseo-sweep-2026-04-26.md` — bundle, a11y, mobile, SEO
- `sentry-resolution-log-2026-04-26.md` — what to close in Sentry UI

---

## How to use this list

- **Severity**: P0 (drop everything) → P1 (this week) → P2 (next 2 weeks) → P3 (backlog).
- **Status**: TODO / IN PROGRESS / DONE / DEFERRED / OPERATOR-ONLY.
- "OPERATOR-ONLY" means Mama / a human has to do it (rotate a secret, click a Neon dashboard button) — no agent can.
- When you finish an item, change the status, leave the row, and add a one-line "DONE in commit `<sha>`" note.

---

## Block A — Convergence (this week, ship-or-die)

| # | Item | Severity | Status | File / Notes |
|---|---|---|---|---|
| A1a | Pricing API lockdown (P2P-1 partial) | P1 | DONE in `129d220` | API POST/PUT reject pricing fields with 400 PRICING_LOCKED + Sentry warn. New-flow redirects to `/admin/projects/[id]/pricing`. Helper at `src/lib/pricing-lockdown.ts`, +8 tests. |
| A1b | Strip inline pricing UI from `/admin/projects/new` Step 3 (replace with explanatory card) | P2 | TODO | Inputs still render but their values are dropped client-side. UX polish only — security/correctness already shipped in A1a. ~30 min. |
| A1c | Strip inline pricing UI from `/admin/projects/[id]` Step 3 + add read-only summary card | P2 | TODO | ~300 line edit in `[id]/page.tsx`. ~1 hr. |
| A2 | Stage A capture: schema drift + chat-client wire-up | P1 | DONE in `a0c6efa` | Added 4 capture columns to schema.prisma, regenerated Prisma client, wired `StageACapture` via new `captureCard` ChatCenter prop, fixed dead `buyerStage` GET-response code. |
| A3 | Insider Note review (3 unverified rows) | P1 | OPERATOR-ONLY | Mama opens `/admin/projects` → reviews/edits `analystNote` for Riviera Bliss, Shaligram Pride, Vishwanath Sarathya West. Doc: `insider-note-mama-review.md`. |
| A4 | Sentry: mark JS-NEXTJS-K, E, J as resolved | P2 | OPERATOR-ONLY | <https://buyerchat.sentry.io/issues>. Reasoning + commit refs in `sentry-resolution-log-2026-04-26.md`. |

---

## Block B — Critical security (this week)

| # | Item | Severity | Status | File / Notes |
|---|---|---|---|---|
| B1 | NextAuth session `maxAge: 12 * 60 * 60` (was implicit 30 days) | P1 | DONE in `6be0fda` | `src/lib/auth.ts`. updateAge=1h keeps active users signed in. |
| B2 | Pin NextAuth from `^5.0.0-beta.25` to `5.0.0-beta.25` (no caret) | P1 | DONE in `6be0fda` | `package.json:43`. |
| B3 | Sentry `beforeSend` PII scrubber (phone + email regex redact) | P2 | DONE in `6be0fda` | New helper `src/lib/sentry-redact.ts` applied to all 3 Sentry configs. |
| B4 | `/api/chat/capture` — always return `{ ok: true }` (drop `alreadyVerified` branch) + tighten rate limit to `capture:${sessionId}:${ip}` | P2 | DONE in `6be0fda` | Per-(session,ip) limit at 4/min, malformed bodies in separate 30/min bucket. |
| B5 | Verify Neon automated backups enabled, 30-day retention | P1 | OPERATOR-ONLY | Neon dashboard. |
| B6 | Rotate `OPENAI_API_KEY` if it ever appeared in any log/issue/PR | – | OPERATOR-ONLY | Sanity check before going live with more buyers. |

---

## Block C — Critical UX (this week)

| # | Item | Severity | Status | File / Notes |
|---|---|---|---|---|
| C1 | iOS keyboard hides VisitBooking CTA (conversion blocker) | P1 | TODO | `src/components/chat/artifacts/VisitBooking.tsx`. Add `visualViewport` listener + dynamic-height CSS var. 40 min. |
| C2 | `prefers-reduced-motion` guards across Framer Motion | P1 | TODO | `ChatCenter.tsx`, `page.tsx`, `artifacts/*`. 45 min. |
| C3 | `robots: { index: false }` on `/dashboard` + `/auth/signin` | P1 | DONE (already shipped) | UX agent flagged this but both layouts already had `robots: { index: false, follow: false }`. |
| C4 | `focus-visible:ring-*` on artifact buttons | P2 | TODO | `ProjectCardV2.tsx`, `ComparisonCard.tsx`, `CostBreakdownCard.tsx`. 25 min. |
| C5 | `/chat` bundle: finish LazyMotion + lazy ReactMarkdown → 278 kB | P2 | TODO | `src/app/chat/chat-client.tsx`, `src/components/chat/ChatCenter.tsx`. 50 min. Closes "323 kB 8% over" CLAUDE.md issue. |
| C6 | Fix `--text-label` contrast (`#454560` on `#1C1917` = 2.1:1, fails AA) | P2 | TODO | Tailwind tokens. 5 min. |

---

## Block D — Observability foundation (next 2 weeks)

| # | Item | Severity | Status | File / Notes |
|---|---|---|---|---|
| D1 | `withSentry(handler)` wrapper on all `/api/*` routes | P2 | TODO | New `src/lib/with-sentry.ts`; apply to ~20 routes. 1.5 hr. Closes silent-catch gap. |
| D2 | Cron failure → Resend email to `ADMIN_EMAIL` + Sentry warn | P2 | TODO | `src/app/api/cron/visit-followups/route.ts:58`. 30 min. |
| D3 | `/api/chat` p95 latency tracking via Sentry measurement | P3 | TODO | `src/app/api/chat/route.ts`. 20 min. |
| D4 | `console.log/error/warn` audit — route prod errors through Sentry | P3 | TODO | ~100 calls across repo. 2 hr. |
| D5 | Apply pgvector migration to Neon (`prisma migrate deploy`) | P2 | OPERATOR-ONLY | `prisma/migrations/20260421000000_add_rag_embeddings/`. RAG retriever silently no-ops until applied. |

---

## Block E — Admin abuse hardening (next 2 weeks)

| # | Item | Severity | Status | File / Notes |
|---|---|---|---|---|
| E1 | `rateLimit('admin:${email}:${ip}', 60, 60_000)` on every `/api/admin/*` POST/PUT/DELETE | P1 | TODO | ~16 routes. 1.5 hr. |
| E2 | Anonymous-vs-authed split rate limit on `/api/chat` (5/min anon, 30/min auth) | P2 | TODO | `src/app/api/chat/route.ts:65`. 10 min. |
| E3 | `INJECTION_KEYWORDS` extension (roleplay / persona / take on the role / system message / bypass / circumvent / simulate / respond only in) | P2 | TODO | `src/app/api/chat/route.ts:38-42`. 10 min. |
| E4 | `/api/rera-fetch` — validate `reraNumber` regex `^[A-Z0-9\-/]+$/i` | P2 | TODO | `src/app/api/rera-fetch/route.ts:8-9`. 10 min. |
| E5 | `ChatMessageLog.content` — redact phone/email on user-side messages before persist | P2 | TODO | `src/app/api/chat/route.ts` audit-write path. 1 hr. |
| E6 | CSP — drop `'unsafe-inline'` (keep `'unsafe-eval'` for Sentry replay), nonce-based for inline scripts | P2 | TODO | `next.config.ts:26` + middleware nonce gen. 1.5 hr. |

---

## Block F — Production polish (next 2-3 weeks)

| # | Item | Severity | Status | File / Notes |
|---|---|---|---|---|
| F1 | `Apartment` JSON-LD schema on `/projects/[id]` | P2 | TODO | 45 min. |
| F2 | `Organization` JSON-LD schema on `/builders/[id]` | P2 | TODO | 30 min. |
| F3 | OG image generation via `next/og` `ImageResponse` for `/` and `/projects/[id]` | P2 | TODO | 60 min. |
| F4 | `/compare` empty-state copy ("1 selected — pick one more") | P3 | TODO | 10 min. |
| F5 | Tap targets <44px (modal close, chevrons) — bump to 40 px | P2 | TODO | 10 min. |
| F6 | iOS scroll jitter during stream (`smooth` → `instant` while streaming) | P2 | TODO | 15 min. |
| F7 | Header crowding on 375px viewport — move artifact pill to left | P3 | TODO | 20 min. |
| F8 | `aria-live="polite"` on AI message stream | P2 | TODO | 10 min. |
| F9 | `role="dialog"` + `aria-modal="true"` on artifact modals | P3 | TODO | 5 min. |
| F10 | Stagger context-chip row appear after AI message | P3 | TODO | 10 min. |
| F11 | ProjectCardV2 save action: animated bookmark loading state | P3 | TODO | 10 min. |
| F12 | StageACapture phone input "(10 digits)" hint | P3 | TODO | 5 min. |
| F13 | Tokenize Navbar (drop hard-coded hex; use theme vars) | P3 | TODO | 30 min. |
| F14 | Locality SEO pages `/localities/[slug]` | P2 | TODO | 2-3 hr. |
| F15 | `OPENAI_API_KEY` daily-spend monitor cron + Sentry warn | P2 | TODO | 1 hr. |

---

## Block G — Bigger refactors (backlog)

| # | Item | Severity | Status | Notes |
|---|---|---|---|---|
| G1 | RAG: actually wire `retrieveChunks` into `buildSystemPrompt` in `/api/chat` | P2 | TODO | Currently retrieval infrastructure exists but isn't injected. Per CLAUDE.md "Known Open Issues". 2-3 hr. |
| G2 | response-checker: move `CONTACT_LEAK` and `BUSINESS_LEAK` from post-stream audit to pre-stream block | P2 | TODO | Currently audit-only — buyer already saw the leak by the time we logged it. |
| G3 | response-checker: add the 13 missing PART 8.5 rule counterparts (2-project hard limit, 100-word cap, language matching, "no I recommend X", etc.) | P2 | TODO | Per CLAUDE.md "Known Open Issues". |
| G4 | TOTP 2FA on admin (Google Authenticator) | P1 | TODO | 3 hr. Hard requirement before more than 1 operator gets admin. |
| G5 | `/api/admin/lockout` endpoint + `User.killSwitchAt` column for revoking compromised sessions | P1 | TODO | 2 hr. |
| G6 | Upstash Redis rollout (bound in-memory rate-limit fallback) | P2 | TODO | 1-2 hr. |

---

## Block H — Operator playbook items (no code)

| # | Item | Status | Notes |
|---|---|---|---|
| H1 | Mama: review 3 analyst notes per `insider-note-mama-review.md` | OPERATOR-ONLY | |
| H2 | Mama: mark JS-NEXTJS-K, E, J resolved on Sentry web UI | OPERATOR-ONLY | |
| H3 | Mama: enable Neon automated backups, 30-day retention | OPERATOR-ONLY | |
| H4 | Mama: confirm `OPENAI_API_KEY` not in any committed file (git log -p .env should show no diff history) | OPERATOR-ONLY | We already verified `.env` is gitignored, but rotating monthly is good hygiene. |
| H5 | Mama: set OpenAI dashboard project-level monthly spend cap | OPERATOR-ONLY | |

---

## Working order suggestion (an agent picks up tomorrow)

1. **A2** Stage A capture wire-up (closes untracked work, small, blocks B-block tests).
2. **A1** Pricing surface consolidation (P2P-1 sprint, ~2 hr).
3. **B1+B2** session maxAge + pin (10 min combined, big security win).
4. **C3** noindex on dashboard/signin (10 min).
5. **B3** Sentry beforeSend (20 min).
6. **B4** capture phone-enum fix (15 min).
7. **C2** prefers-reduced-motion (45 min).
8. **C5** bundle finish (50 min).
9. **C1** iOS keyboard fix (40 min) — manually test on a real iPhone before claiming done.

That gets through Block A + Block B critical-security + Block C
critical-UX in one focused day.

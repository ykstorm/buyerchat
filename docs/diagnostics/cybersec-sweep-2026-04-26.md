# Cybersec / Observability Sweep — 2026-04-26 (P2-WAVE2)

Stack: Next.js 15.2.9 + Prisma 7 + Neon HTTP adapter + NextAuth v5
beta + GPT-4o + Upstash Redis (optional) + Resend + Cloudinary +
Sentry. Single founder-operator (`balveer767@gmail.com`), small buyer
base (~10–15 first users), real-estate (Ahmedabad).

> **Note on methodology**: The original sub-agent that produced this
> sweep flagged 2 P0/P1 findings that I (the synthesizing main agent)
> **fact-checked and downgraded** before writing this doc:
> 1. "`.env` committed to git" — **FALSE**. `.env*` is in `.gitignore`
>    (line 35); `git ls-files` returns no .env files. Local-only file.
>    Removed from this report.
> 2. "`$queryRawUnsafe` SQL injection in RAG retriever" — **FALSE**.
>    `src/lib/rag/retriever.ts:74-82` uses parameterized binds (`$1`,
>    `$2`) with `vecStr` and `effectiveK`. The function name is
>    "Unsafe" but the actual SQL is parameterized. Downgraded to a
>    style-only P3 (consider migrating to `$queryRaw` template literal
>    for readability).
>
> Findings below are the verified subset.

---

## TOP 5 FIX-NOW ITEMS (verified)

1. **P1** — `/api/admin/*` routes have no per-route rate limiting. Single Google OAuth compromise = unlimited admin API calls until JWT expires.
2. **P1** — NextAuth session has no explicit `maxAge`; default is 30 days. Compromised session lives a month.
3. **P2** — Sentry client has `sendDefaultPii: false` (good) but **no `beforeSend` hook** to scrub PII out of breadcrumbs/exception context. Phone/email in error logs flow through.
4. **P2** — `/api/chat/capture` returns `alreadyVerified: true` distinct response — phone-enumeration leak (rate-limited at 8/min/IP, so slow but possible).
5. **P2** — `ChatMessageLog` stores raw user content unredacted. India DPDP Act exposure if a buyer types phone/email mid-message.

---

## DETAILED FINDINGS

### 1. Secret hygiene

**`ADMIN_EMAIL` not validated at startup** — P3
- `src/lib/auth.ts:8-10` — if env is missing/malformed, console-warns but boots. Should `throw new Error(...)` in production.
- Fix: 5 min.

### 2. Rate limiting & abuse

**`/api/admin/*` not rate-limited** — P1
- All admin POST/PUT/DELETE rely solely on `session.user.email === ADMIN_EMAIL`. No second layer.
- Fix: add `await rateLimit(\`admin:${session.user.email}:${ip}\`, 60, 60_000)` at the top of each handler. Or wrap via middleware. ~1.5 hr for ~16 routes.

**`/api/chat` rate limit too lenient for unauth users** — P2
- `src/app/api/chat/route.ts:65` — 30 req/min per IP for everyone. At ~700 tokens/call, unauth flood costs are real.
- Fix: split into auth-vs-anon limits (5/min anon, 30/min auth). 10 min.

### 3. Input validation & injection

**`INJECTION_KEYWORDS` list incomplete** — P2
- `src/app/api/chat/route.ts:38-42` — covers "ignore", "pretend", "jailbreak", "dan", "new rule", "from now on forget", "act as if", "no restrictions", "you are now", "override", "forget your instructions". Missing common variants: "take on the role", "respond only in", "respond as", "system message", "bypass", "circumvent", "roleplay", "persona", "simulate".
- Fix: extend list. 10 min.

**`dangerouslySetInnerHTML` in `src/app/layout.tsx`** — P3
- Used for theme-init script + JSON-LD. Content is server-generated and `JSON.stringify`-escaped, so XSS surface is theoretical, not actual.
- Fix: prefer `<script type="application/ld+json">{JSON.stringify(...)}</script>` form. 15 min, low value.

**`/api/rera-fetch` doesn't validate `reraNumber` format** — P2
- `src/app/api/rera-fetch/route.ts:8-9` — accepts arbitrary string, passes to `puppeteer page.type()`. Format-validation regex (`/^[A-Z0-9\-/]+$/i`) prevents control characters from breaking selectors.
- Fix: 10 min.

### 4. Admin auth strength

**No NextAuth `session.maxAge`** — P1
- Default is 30 days. A compromised session token (XSS, browser malware, leaked from another tab) is good for a month with no rotation.
- Fix: set `session: { strategy: 'jwt', maxAge: 12 * 60 * 60 }` in `src/lib/auth.ts`. 5 min.

**No 2FA on admin** — P1 (longer-term)
- Single email gate; if Mama's Google is compromised, attacker has full admin until JWT expires.
- Fix: TOTP (Google Authenticator) — needs a `User.totpSecret` column + speakeasy/otplib library + UI flow. ~3 hr.

**Hardcoded CSRF origin allowlist** — P3
- `src/middleware.ts:44-49` — allowlist is in code, not env. Adding a staging domain means a redeploy.
- Fix: `process.env.ADMIN_ALLOWED_ORIGINS?.split(',') ?? [<default>]`. 20 min.

### 5. CSP & headers

**`script-src` allows `'unsafe-inline'` and `'unsafe-eval'`** — P2
- `next.config.ts:26` — defeats CSP's XSS mitigation for inline scripts.
- Fix: nonce-based CSP. Requires middleware to generate nonce per request, layout to pass nonce to all `<script>` tags. ~1.5 hr.
- Note: `'unsafe-eval'` is needed by Sentry replay; check whether `'unsafe-inline'` can be dropped without breaking theme init script.

**Missing `Permissions-Policy` directives** — P3
- Add `payment=()`, `usb=()`, `accelerometer=()`, `magnetometer=()` to existing list.
- Fix: 5 min.

### 6. PII / log hygiene

**`ChatMessageLog.content` stores raw user input** — P2
- `prisma/schema.prisma:285+` — if a buyer types "my phone is 9876543210", it sits in the table unredacted. India DPDP Act exposure.
- Fix: redact phone (10-digit `\b\d{10}\b`) + email (`[\w.-]+@[\w.-]+`) in the user-side message before persist. The AI's reply is fine to keep raw. 1 hr.

**Sentry has no `beforeSend` PII scrubber** — P2
- All three Sentry configs (`sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation-client.ts`) set `sendDefaultPii: false` (good) but no `beforeSend` hook. Breadcrumbs containing user messages flow through.
- Fix: add `beforeSend(event) { ... redact ... return event }` to all three configs. 20 min.

**Many `console.log/error` in production paths** — P3
- ~100 calls across the repo. Some leak query results, some are fine.
- Fix: route prod errors through Sentry, dev through console. 2 hr (audit + replace).

### 7. Observability gaps

**Sentry coverage incomplete** — P2
- Several routes catch errors but don't `Sentry.captureException`:
  - `src/app/api/admin/upload/route.ts:51`
  - `src/app/api/chat/capture/route.ts:77, 114`
  - `src/app/api/cron/visit-followups/route.ts:58`
- Fix: wrapper pattern `withSentry(handler)` applied per route. ~1.5 hr for ~20 routes.

**No alerting on failed cron jobs** — P2
- `src/app/api/cron/visit-followups/route.ts` swallows errors silently. Mama doesn't know if followups stopped sending.
- Fix: send Resend email to ADMIN_EMAIL on errors > 0; Sentry warn. 30 min.

**No latency tracking on `/api/chat`** — P3
- p95/p99 latency is invisible. Hard to detect regressions.
- Fix: timestamp pre/post `streamText`, send to Sentry as measurement. 20 min.

### 8. Supply chain

**NextAuth v5 beta** — P2
- `package.json:43` — `^5.0.0-beta.25`. Caret on a beta = surprise breaking change risk.
- Fix: pin to `5.0.0-beta.25` (no caret). 1 min.

### 9. Attack surface — specific routes

**`/api/chat/capture` phone-enum leak** — P2
- Returns `{ ok: true, alreadyVerified: true }` if phone already captured (line 62) and `{ ok: true, alreadyCaptured: true }` if already soft (line 104). Distinguishable from `{ ok: true }`. Rate-limited at 8/min/IP — slow but possible to enumerate.
- Fix: always return `{ ok: true }`. Tighten rate limit to per-session (`capture:${sessionId}:${ip}`). 15 min.

**Cloudinary direct upload** — ✓ secure
- Server-side signed URLs only, folder whitelist `['pdfs', 'buyerchat/projects']`.

**Cron endpoints** — ✓ secure
- `CRON_SECRET` bearer token. Add a length validator (`>= 32` chars) to prevent weak secrets. 5 min.

### 10. Incident-response readiness

**No admin lockout** — P1
- If Mama's Google is compromised, she has no way to revoke active admin sessions remotely. JWT lasts up to 30 days (see "no maxAge" P1 above).
- Fix path:
  1. Ship the `maxAge: 12 * 60 * 60` change first (this alone bounds blast radius to 12 hr).
  2. Add a `/api/admin/lockout` endpoint (admin-only) that flips a kill-switch column on the user, which the auth callback checks.
- Effort: 2 hr for the lockout endpoint.

**No OpenAI usage cap** — P2
- If `OPENAI_API_KEY` leaks, no rate limit on the key itself.
- Fix: set OpenAI dashboard project-level monthly cap. Also: monitor daily token spend via cron + Sentry warn if >2× expected. 1 hr.

**Neon backups** — P1 to verify (out of scope for code)
- Operator action: enable Neon "Automated backups" in the Neon dashboard, set 30-day retention, document restore procedure.

---

## SUMMARY TABLE (verified)

| Category | P0 | P1 | P2 | P3 | Total |
|---|---|---|---|---|---|
| Secret hygiene | 0 | 0 | 0 | 1 | 1 |
| Rate limiting | 0 | 1 | 1 | 0 | 2 |
| Input validation | 0 | 0 | 2 | 1 | 3 |
| Admin auth | 0 | 2 | 0 | 1 | 3 |
| CSP / headers | 0 | 0 | 1 | 1 | 2 |
| PII / logs | 0 | 0 | 2 | 1 | 3 |
| Observability | 0 | 0 | 2 | 1 | 3 |
| Supply chain | 0 | 0 | 1 | 0 | 1 |
| Attack surface | 0 | 0 | 1 | 0 | 1 |
| Incident response | 0 | 1 | 1 | 0 | 2 |
| **Total** | **0** | **4** | **11** | **6** | **21** |

Two original P0/P1 findings were downgraded as false-positives after fact-check (see header).

---

## Recommended priority

**This week (P1, ship before next sprint)**
1. NextAuth `maxAge: 12h` (5 min)
2. Pin NextAuth beta version (1 min)
3. Add `beforeSend` Sentry PII scrubber (20 min)
4. Always-`{ ok:true }` on `/api/chat/capture` (15 min)
5. Verify Neon backups enabled (operator action)

**Next 2 weeks (P2)**
6. Per-admin-route rate limit (1.5 hr)
7. Cron job alert email (30 min)
8. ChatMessageLog PII redaction on user-side messages (1 hr)
9. Sentry `withSentry` wrapper across all routes (1.5 hr)
10. CSP nonce migration (1.5 hr)
11. Anonymous chat rate limit (5/min anon vs 30/min auth) (10 min)

**Backlog (P3)**
12. Console.log audit + structured logging
13. RERA fetch input validation
14. Permissions-Policy expansion
15. Origin allowlist via env var
16. Style migration: `$queryRawUnsafe` → `$queryRaw` template literal in retriever

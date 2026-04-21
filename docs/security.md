# Security Reference

## 1. Threat Model Summary

Homesty/BuyerChat is a consumer-facing real-estate chat product with a single
privileged admin. The attack surface is asymmetric: millions of anonymous visitors can
reach the public chat API, while the admin surface is a single email-gated session.
Three attacker profiles are in scope: **(a) anonymous chat visitors** who may attempt
prompt injection, data exfiltration of builder contact details, or rate-limit bypass;
**(b) authenticated non-admin Google users** who hold a valid JWT but must not access
`/admin` routes or raw builder commercial data; **(c) leaked admin credentials** — if
the admin Google account or `ADMIN_EMAIL` env var is compromised, an attacker gains
full write access to the database via the admin API routes, making secret rotation and
CSRF enforcement critical compensating controls.

---

## 2. Request Path — Preventive Checks

```mermaid
flowchart TD
    A[Browser / API client] --> B[Edge: Next.js Middleware\nsrc/middleware.ts]
    B -- admin routes only --> C{Token present?}
    C -- No --> D[Redirect /auth/signin]
    C -- Yes --> E{Email matches ADMIN_EMAIL?}
    E -- No --> F[Redirect /]
    E -- Yes --> G{Mutation? POST/PUT/DELETE/PATCH}
    G -- Yes --> H{Origin header present\n+ in allowlist?}
    H -- No / mismatch --> I[403 CSRF origin mismatch]
    H -- OK --> J[Route Handler]
    G -- No GET --> J
    B -- public routes --> J

    J --> K{Auth check\nsession.user.email == ADMIN_EMAIL\nor public route}
    K -- Fail --> L[401 / 403 Forbidden]
    K -- Pass --> M{Rate limit\nrateLimit IP, limit, windowMs}
    M -- Exceeded --> N[429 Too Many Requests]
    M -- OK --> O{Zod schema validation\nadmin routes}
    O -- Invalid --> P[400 with flatten errors]
    O -- Valid --> Q{Input sanitization\nsanitize.ts: NFKC, inject blocklist,\n800-char cap}
    Q --> R[Prisma query\nNeon Postgres]
    R --> S{Chat route only:\nOpenAI GPT-4o streaming}
    S --> T[response-checker.ts\npost-stream audit]
    T --> U[ChatMessageLog violations[]]
```

---

## 3. Preventive Controls

| Control | Where | Protects Against |
|---|---|---|
| **Admin email gate** (middleware) | `src/middleware.ts:31-35` | Authenticated non-admin users accessing `/admin` or `/api/admin/*` pages/routes |
| **Admin email gate** (route handler) | Every `/api/admin/*` handler, e.g. `src/app/api/admin/projects/[id]/route.ts:13` | Bypass if middleware is skipped or edge runtime differs |
| **CSRF Origin check** | `src/middleware.ts:38-53` | Cross-site request forgery on admin mutations (POST/PUT/DELETE/PATCH) |
| **Rate limiting — chat** | `src/lib/rate-limit.ts`; 10 req/min per IP | Brute-force prompt injection, AI cost abuse |
| **Rate limiting — projects API** | `src/app/api/projects/[id]/route.ts`; 30 req/min | Enumeration / scraping of project data |
| **Input normalization** | `src/lib/sanitize.ts:sanitizeAdminInput` | Unicode homoglyph smuggling of injections |
| **Injection keyword blocklist** | `src/lib/sanitize.ts:1-15` (13 patterns) | Prompt injection via admin-entered text that reaches AI context |
| **800-char message cap** | `src/lib/sanitize.ts:23` and `/api/chat` handler | Token stuffing, context window abuse |
| **15-message history cap** | `src/app/api/chat/route.ts` | Context window overflow, history poisoning |
| **Zod schema validation** | Admin route handlers (e.g. `BuilderSchema`, `ProjectUpdateSchema`) | Type coercion attacks, out-of-range score values |
| **CSP header** | `next.config.ts:26` | XSS via injected scripts; `frame-ancestors 'none'` blocks clickjacking |
| **HSTS header** | `next.config.ts:27` (`max-age=63072000; includeSubDomains; preload`) | Protocol downgrade / SSL stripping |
| **X-Frame-Options: DENY** | `next.config.ts:22` | Clickjacking (belt-and-suspenders with CSP `frame-ancestors`) |
| **Sensitive-field exclusion** | `src/lib/types/builder-ai-context.ts` | `contactPhone`, `contactEmail`, `commissionRatePct`, `partnerStatus` never reaching AI context — enforced at TypeScript compile time |

---

## 4. Detective Controls

**response-checker** (`src/lib/response-checker.ts`) runs **after** the full GPT-4o
stream has been sent to the client. It is audit-only — violations are logged to
`ChatMessageLog.violations[]` and `ChatSession.violations[]` but the response is
never retracted or blocked.

Checks performed:

| Check | What it detects |
|---|---|
| Hallucination | Capitalised multi-word names that look like project names but are not in `knownProjectNames` |
| Missing CTA | Project mentioned without a site-visit call to action |
| Contact leak | Phone number pattern or email address in AI output |
| Business data leak | Words "commission rate", "partner status", "commission %" |
| Investment guarantee | Legally problematic guarantee language |
| Out-of-area mention | Hard-coded list of micro-markets outside the intended service area |

**Known limitation:** Because the check runs post-stream, a violating response has
already been delivered. To prevent delivery, the check would need to be integrated
into the Vercel AI SDK `onChunk`/`onToken` callback or a proxy content filter. See
`src/lib/response-checker.ts:1-4` comment and CLAUDE.md Known Open Issues.

---

## 5. Secret Management

All secrets are loaded from environment variables. No secrets are committed to the
repository. See `.env.example` for the full variable list.

| Variable | Sensitivity | Notes |
|---|---|---|
| `OPENAI_API_KEY` | CRITICAL | Compromise leads to unbounded AI spend |
| `DATABASE_URL` | CRITICAL | Full Neon Postgres read/write access |
| `DIRECT_URL` | CRITICAL | Direct (non-pooled) Neon connection |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | CRITICAL | JWT signing key — forgery allows admin impersonation |
| `ADMIN_EMAIL` | HIGH | Single-admin gate — leaking this combined with a compromised Google account grants full admin access |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | HIGH | OAuth app credentials |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | HIGH | Image storage write access |
| `MSG91_API_KEY` | MEDIUM | SMS/OTP sending |
| `RESEND_API_KEY` | MEDIUM | Transactional email |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | MEDIUM | Rate-limit store; absence degrades to in-memory fallback, not a hard failure |
| `NEXT_PUBLIC_APP_URL` | LOW | Public — used in CORS allowlist and CSRF origin check |

`AUTH_SECRET` length is checked at startup (`src/lib/auth.ts:8-10`): a warning is
logged if it is missing or shorter than 32 characters in production. The check does
not throw — weak secret allows the app to start but JWT security is degraded.

---

## 6. Known Gaps

| Issue | Description | Reference |
|---|---|---|
| **Post-stream-only response checker** | Violations are detected after tokens are sent; the checker cannot block or redact a violating response mid-stream | `src/lib/response-checker.ts:1-4`; CLAUDE.md Known Open Issues |
| **In-memory rate-limit cold-start reset** | `src/lib/rate-limit.ts` falls back to an in-memory `Map` when Upstash env vars are absent. On Vercel each cold start resets the counter, making the limit bypassable by forcing new serverless instances | CLAUDE.md ISSUE-04 / ISSUE-18/19; `src/lib/rate-limit.ts:22` |
| **Builder rename not blocked** | `Project.onDelete: Restrict` prevents builder deletion but there is no guard against renaming a builder while live projects reference the old `builderName` string FK, which would orphan those projects | CLAUDE.md ISSUE-57 |
| **Injection blocklist completeness** | `src/lib/sanitize.ts` has 13 patterns. The system prompt (`src/lib/system-prompt.ts`) encodes more rules that are not mirrored as input-side blocklist entries — prompt injection via novel phrasing not in the list is not caught at input time | `src/lib/sanitize.ts:1-15` |
| **CORS wildcard risk** | `next.config.ts:14` sets `Access-Control-Allow-Origin` to `NEXT_PUBLIC_APP_URL` for all `/api/*` routes. If that env var is unset, it falls back to `http://localhost:3000`, which is safe in production only if the variable is always set | `next.config.ts:14` |

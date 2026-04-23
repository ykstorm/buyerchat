# SEO + Metadata Audit — homesty.ai

READ-ONLY audit. Stack: Next.js 15 App Router. Date: 2026-04-21.

## 1. Metadata per page

- **Root** `src/app/layout.tsx:31-57` — title, description, keywords, OG, twitter, robots, icons. Brand format inconsistent: root uses em-dash, nested use pipe.
- **`/chat`** `src/app/chat/page.tsx:8-16` — good, but missing `openGraph.url`, `openGraph.siteName`, `twitter.card`.
- **`/projects`** `src/app/projects/layout.tsx:3-11` — good.
- **`/compare`** `src/app/compare/layout.tsx:3-11` — good.
- **`/projects/[id]`** `src/app/projects/[id]/layout.tsx:8-43` — dynamic from DB. Uses `₹L` only (no per-sqft, no BHK). `openGraph.siteName` missing. No `twitter` block. No OG image.
- **`/builders/[id]`** `src/app/builders/[id]/layout.tsx:4-37` — dynamic, includes trust score. No OG image.
- **`/` (homepage)** `src/app/page.tsx:1` — **`'use client'` — cannot export metadata**. Root-layout metadata is therefore the home's metadata. This is actually correct per Next.js (root layout provides the title for `/`), but it means `/` cannot have its own distinct title/description beyond the root. Acceptable; the root metadata is tuned for `/`.
- **`/dashboard`** `src/app/dashboard/page.tsx:1` — client, no metadata. Fine because `/dashboard` is user-only and should be noindex.
- **`/auth/signin`** `src/app/auth/signin/page.tsx:1` — client, no metadata, no noindex. **Gap: indexable.**

Gap: brand format ("| Homesty" vs "| Homesty.ai" vs "— Homesty"). Fix: standardize on `Page | Homesty — The Honest AI Property Advisor`.

## 2. Canonical URLs + alternates

- **No `canonical` or `alternates.canonical`** anywhere in `src/` (grep result: zero matches).
- `metadataBase` is set at `src/app/layout.tsx:35` — good, enables OG URL resolution.
- `www.homesty.ai` vs `homesty.ai` — `middleware.ts:46-47` allow-lists both for CSRF but no canonical enforcement. **Duplicate-content risk** if both resolve.

Fix: add `alternates: { canonical: '/' }` (or absolute) per page; add a host redirect in middleware (apex → www) or Vercel domain config.

## 3. Sitemap + robots

- `src/app/sitemap.ts:6-42` — dynamic, enumerates active projects + all builders. `dynamic = 'force-dynamic'` keeps it fresh. Good.
- Gap: includes `${base}/builders` (line 23) but **no `/builders` page exists** (only `/builders/[id]`) — 404 URL in sitemap.
- `src/app/robots.ts:3-15` — disallows `/admin`, `/api`, `/dashboard`. Good. Gap: `/auth/signin` not disallowed.

## 4. Structured data (JSON-LD)

- **Root only**: `RealEstateAgent` schema at `src/app/layout.tsx:73-102`. Applied to every page (duplicated on project/builder pages — not ideal).
- **Project pages**: NO `Product` / `Residence` / `Apartment` / `RealEstateListing` schema. Big miss for rich results (price, area, address, image in SERP).
- **Builder pages**: NO `Organization` / `LocalBusiness` schema.
- **No `FAQPage`**, no `BreadcrumbList`, no `WebSite` (sitelinks search box).

Fix: inject per-route JSON-LD in each `page.tsx` (server-rendered `<script>` tag) — Project → `Apartment`+`Offer`, Builder → `Organization`+`aggregateRating`.

## 5. Core Web Vitals signals in code

- Fonts: `next/font` with `display: 'swap'` at `layout.tsx:9-29`. Good.
- Hero image: none (text-only). LCP element is likely the `<h1>` with `SplitText` animation — character-by-character animation (`page.tsx:82-96`) can delay LCP paint; `priority` N/A since no image.
- `framer-motion` `motion` is used eagerly in homepage (`page.tsx:4`) — ships to every visitor. LazyMotion is only used in `/chat` surface.
- CLS risk: no fixed dimensions on project preview cards; acceptable.

Fix (medium): swap homepage `motion` to `m` + `LazyMotion` to save ~25 kB on the most-visited URL.

## 6. Images

- **Zero `next/image` usage across `src/app`** (grep: 0 matches). Zero raw `<img>` in public pages either — the site is text + SVG today.
- **No OG images anywhere** — no `openGraph.images`, no `/public/og/*.png`, no `opengraph-image.tsx`. Social shares will render a blank card.

Fix: add `src/app/opengraph-image.tsx` (root) + dynamic `src/app/projects/[id]/opengraph-image.tsx` using `ImageResponse`.

## 7. Viewport + PWA + favicon

- **No `viewport` export** anywhere. Next 15 requires `export const viewport = {...}` separately (not inside `metadata`). Default works, but no `themeColor`.
- **No `manifest.webmanifest`** in `/public` (Glob showed only SVGs + `favicon.svg`).
- Favicon: only `favicon.svg` in `/public`. No PNG 32/192/512, no Apple touch icon.

Fix: add `export const viewport` + `theme-color`, add `manifest.webmanifest`, generate PNG icon set.

## 8. Content shape for ranking

- Project H1: `src/app/projects/[id]/page.tsx:318` → `{project.projectName}` only. **Does not include builder + area** (e.g. "Riviera Springs" not "Riviera Springs by Riviera Group in Shela, Ahmedabad"). Hurts long-tail.
- **No locality pages** — `src/app/localities/[slug]` does not exist (Glob returned nothing). Missing huge ranking opportunity for "3BHK Shela", "flats South Bopal".
- No internal related-project linking on `/projects/[id]` (quick read of file shows no "More in Shela" section).

Fix: enrich H1, add `/localities/shela` + `/localities/south-bopal` pages pulling projects by `microMarket`.

## 9. Brand keywords audit

Hero `src/app/page.tsx:253-268`: "Honesty is rare" + "South Bopal and Shela's first honest property advisor". Good: "honest", "South Bopal", "Shela".

Missing from hero / H1 / title: **"RERA"**, **"verified"**, **"Ahmedabad"**, **"1.5% commission"** (only in marquee line 18 and CTA line 371 — buried, not in any `<title>` or H1). Projects-list title `src/app/projects/layout.tsx:5` does say "RERA-verified" — good.

Fix: add `RERA-verified` to root title/description; add "Ahmedabad" to H1 on `/`.

## 10. Admin + gated paths

- `/admin/*` blocked by `src/middleware.ts:10-35` (redirect) AND `src/app/robots.ts:10` (disallow). Good — two-layer block.
- `/api/*` disallowed in robots. Good.
- `/dashboard` disallowed in robots but **no `noindex` meta** on the page (client component). Disallow-only means Google won't crawl but may still list the URL. Add `robots: { index: false }` via a `layout.tsx`.
- `/auth/signin` — **not disallowed, not noindex**. Indexability risk.
- Admin pages have no `robots: { index: false }` meta — relies on redirect only. Low risk given middleware, but belt-and-suspenders would add noindex.

---

## Top-10 fixes ranked by ranking impact

1. **Per-project JSON-LD (`Apartment`+`Offer`+`PostalAddress`)** — unlocks rich results (price, image, location) on highest-intent pages. Half-day (template + rollout).
2. **Locality pages `/localities/shela` + `/localities/south-bopal`** — captures "3BHK Shela", "flats South Bopal" searches directly. Half-day (route + H1 + project grid + JSON-LD).
3. **Canonical tags site-wide** + apex→www redirect — stops duplicate-content split. 30-min sprint.
4. **Enrich `/projects/[id]` H1 to `{projectName} by {builder} in {area}, Ahmedabad`** — long-tail ranking. 30-min sprint.
5. **OG images** (root static + dynamic for project/builder via `opengraph-image.tsx`) — drives CTR on shares. Half-day.
6. **Fix sitemap `/builders` 404 entry** (`sitemap.ts:23`) — crawlers penalise 404s in sitemaps. 5-min sprint.
7. **Add "RERA-verified" + "Ahmedabad" to root title + hero H1** — currently buried in marquee only. 30-min sprint.
8. **Per-builder `Organization` JSON-LD with trust score as `aggregateRating`** — rich builder listings. 30-min sprint.
9. **`/auth/signin` + `/dashboard` noindex** — prevents low-value pages from indexing. 30-min sprint (add `robots` to metadata / layout).
10. **Viewport export + manifest + PWA icons + themeColor** — mobile UX signal + install prompt. Half-day.

### Indexability risks

- `/auth/signin` is crawlable and indexable today — a generic sign-in page showing up in Google for "Homesty login" is harmless but wastes crawl budget.
- No canonical tags + both `homesty.ai` and `www.homesty.ai` allow-listed in middleware = Google may split PageRank until a canonical signal is added.
- Admin routes are safe (middleware redirect + robots disallow).

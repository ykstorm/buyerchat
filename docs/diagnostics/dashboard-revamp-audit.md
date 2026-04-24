# Dashboard Revamp — Pre-Revamp Audit (Agent Q)

Date: 2026-04-24
Scope: Navbar, `/dashboard`, chat surface nav (ChatSidebar, ChatCenter top-right, FloatingChatWidget),
`/projects` filters, `/compare`, AI floating button. Read-only inventory ahead of a
coordinated revamp.

Related context:
- `docs/diagnostics/i40-deep-audit.md` — Sprint C (C1/C2/C3) duplicate-signin and
  VisitBooking-modal coordination.
- `CLAUDE.md` → "Architecture → Routing" for the authoritative route list.

---

## 1. Current state inventory (facts + file:line refs)

### 1.1 Navbar — `src/components/Navbar.tsx`

- **Rendered routes:** Navbar is conditionally hidden via `pathname` guard at
  `src/components/Navbar.tsx:44`:
  ```
  if (pathname === '/' || pathname?.startsWith('/chat') ||
      pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin') ||
      pathname?.startsWith('/auth')) return null
  ```
  Net: Navbar renders only on `/projects`, `/projects/[id]`, `/builders`,
  `/builders/[id]`, `/compare`. Everything else suppresses it.
- **Global mount:** `src/app/layout.tsx:107` renders `<Navbar />` inside `<Providers>`.
- **Link set** (`Navbar.tsx:48`): `Projects`, `Builders`, `Compare`. No link to
  `/dashboard`, even when signed in.
- **Auth-aware CTA** (Sprint C2, `Navbar.tsx:91-143`):
  - Signed-out → "Sign In" pill → `/auth/signin`.
  - Signed-in → 28px avatar button with dropdown menu; only action is `Sign Out`.
  - No avatar-menu link to `/dashboard` or `/chat`.
- **Mobile:** hamburger at `Navbar.tsx:146-156` toggles full-width panel
  (`Navbar.tsx:162-216`). Mobile panel repeats the 3 nav links + the same
  signed-in/out CTA. Body-scroll-lock at `Navbar.tsx:22-29`.
- **Scroll state:** background flips from transparent to
  `bg-[#09090b]/80 backdrop-blur-md` after scrollY > 20 (`Navbar.tsx:12, 18-20, 60-64`).
- **Color theme:** Navbar uses dark tokens (`#09090b`, `#e0e0ea`, `#8888a8`,
  `#3de8a0` accent) unconditionally — does NOT read `--landing-*` or
  `data-theme="dark"` vars.

### 1.2 `/dashboard` — `src/app/dashboard/page.tsx` + `layout.tsx`

- **Layout:** `layout.tsx:11-13` is a passthrough; sets `robots: { index: false }`
  metadata (`layout.tsx:6-9`).
- **Top bar** at `page.tsx:170-192` — sticky; shows back chevron → `/chat` and
  right-aligned "Dashboard" title. **No reference to Homesty brand or global nav.**
- **Features present:**
  - Stats row (`page.tsx:221-230`): 3 `CountUpStat` cards — Saved count, Visits
    count, Active visits count. Count-up animation via IntersectionObserver
    (`page.tsx:39-68`).
  - Saved Projects list (`page.tsx:233-353`) — fetched from `/api/saved`
    (`page.tsx:107-114`). Each item renders project name, builder, microMarket,
    price range, unit-type chips. "View" link goes to `/projects/[id]`.
  - Site Visits list (`page.tsx:356-472`) — fetched from `/api/visit-requests`
    (`page.tsx:109-124`). Maps `visitCompleted/otpVerified` to 3-state pill
    (`pending`/`confirmed`/`completed`). Shows `visitToken` chip when present.
  - "Find another home" CTA card (`page.tsx:475-513`) → `/chat`.
  - Fixed bottom bar (`page.tsx:518-536`) — duplicate "Back to chat" link.
- **Features missing:**
  - No chat history (that lives only in `ChatSidebar`).
  - No preferences / budget edit / contact info.
  - No auth gate on the page itself — `/api/saved` presumably returns `[]` when
    unauthenticated, so signed-out users see empty-state CTAs but no
    "please sign in" banner.
- **Theme:** uses dark-mode tokens (`var(--bg-base)`, `var(--text-primary)`,
  `var(--bg-surface)`) — respects `data-theme="dark"`.
- **Assessment:** A useful surface (saved + visits + CTA), but presents itself
  as a sub-page of `/chat` rather than a top-level account home. The top bar's
  only back-link is `/chat`, not `/` or a global nav.

### 1.3 Chat surface nav

**ChatSidebar — `src/components/chat/ChatSidebar.tsx`**
- Width: fixed `w-60` (240px) — `ChatSidebar.tsx:343`.
- Desktop: always mounted (`hidden lg:block`, line 470).
- Mobile: off-canvas overlay controlled by `open` prop (`ChatSidebar.tsx:472-478`).
- Header (`ChatSidebar.tsx:349-360`): Homesty wordmark → `/`, `ThemeToggle`,
  mobile close "×", blue "+ New chat" button.
- Search input (`ChatSidebar.tsx:363-375`) filters sessions client-side.
- Sessions list renders `SwipeableSessionItem` (drag-to-delete on mobile,
  hover icons on desktop, rename + confirm-delete states).
- Footer (`ChatSidebar.tsx:414-463`):
  - Signed-in: saved-projects preview (top 3), link to `/dashboard`, user chip +
    "Sign out" button.
  - Signed-out: **muted italic text** "Sign in from the top bar to save chats"
    — deliberately demoted (Sprint C1, comment at `ChatSidebar.tsx:456-458`).
  - ASCII footer also exposes a `/dashboard` link (line 431 & line 440).

**ChatCenter top-right pill — `src/components/chat/ChatCenter.tsx`**
- Absolute `top-3 right-3 z-40` (`ChatCenter.tsx:660-661`).
- Signed-in → avatar image or initial (`ChatCenter.tsx:664-686`).
- Signed-out → "Sign in" pill button (`ChatCenter.tsx:687-697`) that emits
  a `kind: 'signin'` action via `onMessageAction` instead of linking to
  `/auth/signin` directly.
- Comment (`ChatCenter.tsx:652-659`) explicitly calls out the C1 de-dup: sidebar
  footer + ChatCenter pill both gate on `userId` (not `userName`) to prevent
  double signin CTAs.

**FloatingChatWidget — `src/components/FloatingChatWidget.tsx`**
- Mount conditions (`src/components/ChatWidgetWrapper.tsx:9-14`): only on
  `/projects*`, `/builders*`, `/compare*`. Not on `/`, `/chat`, `/dashboard`,
  `/admin`, `/auth`.
- Trigger: `fixed bottom-6 right-6 z-50` 56px green (`#3de8a0`) circular button
  with a chat-bubble icon (`FloatingChatWidget.tsx:161-186`). Pulsing ping ring
  auto-hides after 3s (`FloatingChatWidget.tsx:43-46`).
- On click: opens in-place 380px × 70vh panel (`FloatingChatWidget.tsx:190-361`)
  — it is a **full self-contained chat client**, not a portal to `/chat`. It
  calls `/api/chat` directly (`FloatingChatWidget.tsx:99-108`) with its own
  message state — it does not read or write `ChatSidebar` sessions. When
  closed, all chat state is lost.
- Visit-modal listener (`FloatingChatWidget.tsx:49-58`, C3): hides the widget
  while a `visit-modal-open` CustomEvent is in flight; shown again on
  `visit-modal-close`. Broadcast source: `src/components/VisitBookingModal.tsx:161`.
- Has "Ask Homesty AI" tooltip on hover (`FloatingChatWidget.tsx:181-184`),
  no mobile-specific positioning tweak — same `bottom-6 right-6`.

### 1.4 `/projects` — `src/app/projects/page.tsx`

- **Filter pills** (`projects/page.tsx:236-248`, rendered by `pill()`
  helper at line 189):
  - Area: `All Areas`, `South Bopal`, `Shela`.
  - Status: `All`, `Under Construction`, `Ready to Move`.
  - Sort: `Newest`, `Price ↑`, `Price ↓`, `Trust`.
  - Layout: single horizontal scrolling row with two vertical divider bars
    separating the three groups (`scrollbar-hide`, line 235).
- **Sticky header** at `top-[64px]` (`projects/page.tsx:234`) — presumes a
  ~64px Navbar offset.
- **DB mapping (I40-G):** `src/app/api/projects/route.ts:26-27` — UI pill
  `"Under Construction"` maps to `constructionStatus: { startsWith: 'Active' }`;
  `"Ready to Move"` maps to exact `'Ready to Move'`. Comment at lines 23-25
  documents the UX-vs-DB reconciliation.
- **Search:** none. No free-text input on the page.
- **Unit-type filter:** the API accepts `unitType` (route.ts:14, 28-30) but
  the UI does not expose it.
- **Card click:** whole title + "Learn more" button → `/projects/[id]`
  (`projects/page.tsx:87, 135-139`). Secondary "Chat" button → `/chat?project=...`
  (line 140-144).
- **Card data:** decisionTag pill, builder grade chip, price/sqft, possession,
  units, config preview, honestConcern teaser.
- **Empty state** (`projects/page.tsx:256-267`): "No projects match your filters"
  + "Clear filters" button that resets all three filter states.

### 1.5 `/compare` — `src/app/compare/page.tsx`

- **Selection mechanism:** 3-slot in-memory state `selectedIds: [null,null,null]`
  (`compare/page.tsx:337`). Each slot is a `ProjectSelector` dropdown
  (`compare/page.tsx:106-265`) with autofocusing search input. No URL params,
  no localStorage, no query-string prefill.
- **Data fetch:**
  - `GET /api/projects` on mount (line 344) populates the selector list.
  - `POST /api/compare` with selected `ids` (line 353-357) whenever
    `selectedIds` changes.
- **Comparison rendered directly in page** via `ComparisonRow` helper
  (`compare/page.tsx:267-313`); not a shared component. Reports winners for
  price, sqft, trust, possession, units, amenity count; neutral rows for
  configs, status, RERA.
- **Max projects:** 3 (selectors array `[0,1,2]` at line 442). Renders
  side-by-side only when `projects.length >= 2` (line 456).
- **Mobile:** `grid-cols-1 md:grid-cols-3` for selectors (line 441); the
  comparison table is wrapped in `overflow-x-auto` with `min-w-[600px]`
  (line 457-458) — horizontal scroll on small screens. No collapsed /
  accordion mobile layout.
- **Bottom CTA** (line 601-624): "Ask AI to Compare" → `/chat` (no
  project pre-fill via query param; the chat gets zero context about
  the comparison set).

### 1.6 AI floating button — already covered in §1.3 under FloatingChatWidget.

---

## 2. Inconsistency catalog (prioritized)

### P0 — user-visible UX drift

1. **Three parallel chat entry points with no shared state.**
   - (a) `/chat` full page (`ChatSidebar` + `ChatCenter`) — persists to
     `ChatSession` / `ChatMessageLog`.
   - (b) `FloatingChatWidget` panel on `/projects`, `/builders`, `/compare`
     — calls `/api/chat` directly but does NOT persist a session client-side
     nor surface the conversation in `ChatSidebar` afterward.
   - (c) "Chat" button on a project card → `/chat?project=...` — not honoured
     anywhere: no code path reads `searchParams.project` to seed the chat
     prompt (widget also ignores it since it only mounts on non-chat routes).
   - Result: a buyer who chats via the floating widget then navigates to
     `/chat` sees an empty sidebar; history is lost.

2. **Duplicate sign-in surfaces despite C1/C2.** C1 demoted the `ChatSidebar`
   footer to muted text and C2 made Navbar session-aware. But three sign-in
   surfaces still coexist:
   - Navbar "Sign In" pill (public pages).
   - ChatCenter top-right "Sign in" button (only on `/chat`).
   - `/auth/signin` page itself.
   - Plus `/dashboard` has zero sign-in affordance even when signed out —
     the page will silently render empty states.

3. **Navbar visibility rules hide nav from pages that logically need it.**
   - `/dashboard` hides the Navbar (`Navbar.tsx:44`) but provides only a
     "← Chat" back-link in its custom top bar. A signed-in user on
     `/dashboard` cannot jump to `/projects`, `/builders`, or `/compare`
     without manual URL typing.
   - Landing `/` also hides Navbar — acceptable for hero layout, but it
     means there are effectively four header designs across the site
     (landing custom, Navbar, dashboard top bar, chat ChatSidebar+ChatCenter).

### P1 — affordance and link gaps

4. **No `/dashboard` discovery.** Navbar has no link to `/dashboard` even
   when signed in. Avatar dropdown (`Navbar.tsx:117-141`) only offers
   "Sign Out". Discovery depends on `ChatSidebar` footer links
   (`ChatSidebar.tsx:431, 440`) which a non-chat user will never see.

5. **`/compare` has no URL-shareable state.** Selection is in-memory only;
   you cannot share a comparison link or return to one. Also no "Compare"
   button on `/projects` cards to deep-link into `/compare?ids=…`.

6. **`/projects` filter row collides with Navbar height assumption.** Sticky
   offset is hardcoded `top-[64px]` (`projects/page.tsx:234`); any Navbar
   height change will cause overlap or gap.

7. **Unit-type filter is API-supported but UI-hidden.** `GET /api/projects`
   accepts `unitType` (route.ts:14, 28-30), but `/projects/page.tsx` does
   not render a 2BHK / 3BHK / 4BHK pill group.

### P2 — visual / token consistency

8. **Navbar ignores theme tokens.** Uses hardcoded dark hex (`#09090b`,
   `#e0e0ea`, `#3de8a0`). `/dashboard`, `/projects`, `/compare`, `/chat`
   all use `var(--bg-*)` CSS tokens with `data-theme="dark"`. Result: Navbar
   looks inconsistent on light-themed sub-pages.

9. **Floating widget uses a different accent system** (`#3de8a0` green,
   dark tokens `#0f0f14`) from the rest of the buyer chrome (which leans
   on `#1B4F8A` blue + `#C49B50` gold). Inconsistent brand feel.

10. **Dashboard bottom bar duplicates the top-bar back-link** — both point to
    `/chat`. No meaningful secondary nav.

---

## 3. Three unified-nav proposal options

### Option 1 — "Global Navbar Everywhere"

Render the existing `Navbar` on every public route (including `/`, `/chat`,
`/dashboard`), delete the custom dashboard top bar, and fold the ChatCenter
top-right pill back into Navbar's avatar menu.

- **Pros:** single source of truth for brand + nav; discovery of
  `/dashboard`, `/projects`, etc. is uniform; auth CTA lives in one
  place; easiest mental model for first-time users.
- **Cons:** `/chat` layout assumes full viewport — Navbar would eat
  vertical space from the message area and the `ChatSidebar` already
  hosts a Homesty wordmark + ThemeToggle, creating duplicate header
  chrome. Also the landing page `/` uses a bespoke hero header that
  would need redesign to coexist with a fixed Navbar.

### Option 2 — "Contextual Shells" (RECOMMENDED)

Keep three distinct shells but enforce one shared header component for
navigation across all of them:

- **Shell A — Marketing Navbar** on `/`, `/projects`, `/projects/[id]`,
  `/builders`, `/builders/[id]`, `/compare`, `/dashboard`.
- **Shell B — Chat Shell** on `/chat` (sidebar + ChatCenter) with a slimmed
  header inside the sidebar.
- **Shell C — Admin Shell** on `/admin/*` (unchanged).

The Marketing Navbar gets one extra item — "Dashboard" — and the avatar
menu links to `/dashboard`, `/chat`, and Sign Out. Dashboard stops rendering
its own top bar and sits under the shared Navbar.

- **Pros:** minimal change to the mature `/chat` layout; fixes the
  single biggest gap (dashboard discovery) without re-theming `/chat`;
  lets `/dashboard` become a real account home with nav to everything
  else; theme tokenization of Navbar can happen in isolation.
- **Cons:** still three headers to keep in design-sync; the Floating
  Widget question is unresolved — it should either be removed on
  `/compare` (where users have selected specific projects and a CTA
  already exists) or upgraded to persist into `ChatSession`.

### Option 3 — "Command Palette + Minimal Bar"

Replace Navbar with a thin 40px bar (logo + avatar + `Cmd/Ctrl+K`
search) that uses a command palette for all navigation. Floating widget
becomes the sole chat entry point everywhere (including a repositioned
version on `/chat` that opens the sidebar panel).

- **Pros:** very low visual overhead; scales to 20+ destinations; a
  single "open chat" affordance; feels modern.
- **Cons:** discoverability disaster for first-time buyers who don't
  know the palette exists; requires significant new infra (palette
  component, keyboard shortcuts, search index); the "Compare",
  "Projects", "Builders" nav items are specifically the product — hiding
  them behind a key shortcut hurts conversion.

---

## 4. Preliminary ASCII wireframe — new `/dashboard`

Assumes **Option 2**: shared Marketing Navbar on top, dashboard content below.

```
+---------------------------------------------------------------------------+
|  * Homesty        Projects   Builders   Compare   Dashboard     [Avatar▾] |   <- shared Navbar
+---------------------------------------------------------------------------+

  +---------------------------------------------------------------+
  |  — YOUR JOURNEY                                               |
  |  Property Journey                                             |
  |  Saved projects, visits, and next steps.                      |
  +---------------------------------------------------------------+

  +--------------+  +--------------+  +--------------+
  |  SAVED       |  |  VISITS      |  |  ACTIVE      |
  |   7          |  |   3          |  |   2          |
  +--------------+  +--------------+  +--------------+

  +---------------------------------------------------------------+
  |  ▸ CONTINUE WHERE YOU LEFT OFF                                |
  |  ----------------------------------------------------------   |
  |  [resume chat card]  "Comparing Planet vs Ivana..."  [Open →] |
  +---------------------------------------------------------------+

  +-------------------------- SAVED PROJECTS -------------------- [View all →] +
  |  The Planet · Goyal   | ₹80L–1.2Cr  |  3BHK  |  Saved 21 Apr |  [View]  |
  |  Ivana · Shree        | ₹1.1–1.8Cr  |  4BHK  |  Saved 18 Apr |  [View]  |
  |  ...                                                                    |
  +-------------------------------------------------------------------------+

  +------------------------- SITE VISITS ---------------------- [Add visit] +
  |  The Planet          | Sat 26 Apr    | ● Confirmed   | OTP: 4F2A       |
  |  Ivana               | Mon 28 Apr    | ● Pending                      |
  +-------------------------------------------------------------------------+

  +---------------------------------------------------------------+
  |  Find another home                                            |
  |  Tell Homesty AI what you need — budget, location, unit type. |
  |                       [ Start chatting ]                      |
  +---------------------------------------------------------------+
```

Key deltas vs current dashboard:
1. Drop the custom sticky top bar; rely on shared Navbar (option 2).
2. Add "Continue where you left off" card reading the most recent
   `ChatSession` (closes the chat-history discoverability gap).
3. Saved Projects and Site Visits get explicit "View all" / "Add visit"
   affordances instead of only empty-state CTAs.
4. Remove the fixed bottom "Back to chat" bar — the Navbar handles it.

---

## 5. Recommended next moves (for the revamp sprint)

1. Pick **Option 2** and unblock it with one structural PR:
   - Tokenize Navbar (swap hex for `var(--*)`).
   - Remove `pathname?.startsWith('/dashboard')` from the Navbar guard
     (`Navbar.tsx:44`).
   - Add "Dashboard" link to `navLinks` and to the avatar dropdown menu.
2. Decide the floating-widget fate on `/chat`-adjacent pages before the
   visual revamp — two options:
   - Persist widget conversations into `ChatSession` (requires
     authenticated users only; adds a session ID to `/api/chat`).
   - Or demote the widget to a "Quick ask" affordance that deep-links
     into `/chat?seed=...`, then delete the duplicate chat client in
     `FloatingChatWidget.tsx`.
3. Add a unit-type pill row to `/projects` (API already supports it).
4. Promote `/compare` selection to URL state (`?ids=a,b,c`) so links
   are shareable and `/projects` cards can offer a `+ Compare` chip.

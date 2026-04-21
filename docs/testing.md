# Testing

Reference for the test setup in homesty.ai. Covers the framework,
how to run tests, what is currently covered, what is not, and
conventions for adding new tests.

---

## 1. Framework

**Vitest** (`vitest` ^4.1.5, `@vitest/coverage-v8` ^4.1.5).

Config file: `vitest.config.ts` (repo root).

Key settings:

| Setting | Value | Notes |
|---|---|---|
| `environment` | `node` | No jsdom; no DOM globals. Add jsdom per-file when UI tests are introduced. |
| `include` | `src/**/*.test.ts`, `tests/**/*.test.ts` | Co-located and a top-level `tests/` folder are both valid. |
| `globals` | `false` | `describe`, `it`, `expect` must be imported explicitly from `vitest`. |
| `resolve.alias` | `@` → `src/` | Matches `tsconfig.json` path alias so imports like `@/lib/foo` resolve correctly in tests. |

---

## 2. Running Tests

```bash
# One-shot run (CI / pre-commit)
npm test

# Watch mode (development — re-runs on file save)
npm run test:watch
```

`npm test` maps to `vitest run` (exits with a non-zero code on failure).
`npm run test:watch` maps to `vitest` (interactive, keeps watching).

**Complementary type check:** `npm run build` runs the Next.js production
build, which includes a full TypeScript compile. Use this as a type-level
correctness gate when the unit tests do not yet cover a changed module.
`npx prisma validate` is a fast schema-only check and can be run
independently.

---

## 3. Current Test Coverage

Two test files exist as of this writing.

### `src/lib/decision-engine/score-engine.test.ts`

Tests `calculateWeightedScore` from `src/lib/decision-engine/score-engine.ts`.

| Test | What it verifies |
|---|---|
| Finite total for populated scores | Output is a finite number in `(0, 100]` |
| Weight-sum invariant (balanced) | All-100 input returns exactly 100; confirms weights sum to 1.0 |
| Weight-sum invariant (all priorities) | Runs all 6 priority strings; each must return 100 for all-100 input |
| NaN guard — single missing field | `undefined` category coerced to 50; result stays finite |
| NaN guard — all fields missing | Empty `{}` input → total = 50 (all fields default to 50) |
| NaN guard — null input | `null` passed as scores → result stays finite |
| Clamping out-of-range values | `150`, `-10`, `Infinity`, `NaN` inputs clamped; result in `[0, 100]` |
| Priority behavior — `risk_averse` | Project with high `builderTrust` beats a project with low `builderTrust` under `risk_averse` priority |

### `src/lib/decision-engine/risk-engine.test.ts`

Tests `buildRiskAlerts` from `src/lib/decision-engine/risk-engine.ts`.

| Test | What it verifies |
|---|---|
| A/B direction — B wins builder trust | Safety alert names B as the stronger track record |
| A/B direction — A wins builder trust | Safety alert names A as the stronger track record |
| No alert on tie | Safety alert absent when `builderTrust` winner is `'tie'` |
| No alert when not risk-averse | Safety alert absent when `BuyerContext.riskAverse = false` |
| Builder trust threshold — weak A | High-level alert fires when A `builderTrust < 50` |
| Builder trust threshold — weak B | High-level alert fires when B `builderTrust < 50` |
| Possession urgency — far A | Urgency alert fires for A when A possession > 24 months and `urgencyHigh = true` |

---

## 4. What Is NOT Tested Yet

The following areas have zero automated coverage and are good targets for
future contributors:

- **React component tests** — no jsdom environment configured; none of
  `src/components/**` or `src/app/**` pages are tested.
- **Route handler integration tests** — none of the 33 API routes under
  `src/app/api/` have request/response tests. Particularly valuable:
  `/api/chat` (intent classification, streaming, response-checker),
  `/api/admin/projects` (auth gate, Prisma mutations), and
  `/api/auth/[...nextauth]`.
- **RAG end-to-end** — `src/lib/rag/embed-writer.ts` and
  `src/lib/rag/retriever.ts` have no tests. The retriever's 600 ms
  timeout and `similarity >= 0.30` filter are untested.
- **`response-checker.ts`** — no tests for the hallucination / leakage
  detection rules or the post-stream violation logging.
- **`intent-classifier.ts`** — the 8-intent classifier is untested;
  boundary cases and keyword overlaps are good candidates.
- **`sanitize.ts` and injection blocklist** — input sanitization logic
  has no unit tests.
- **`context-builder.ts`** — context assembly from Prisma rows is
  untested; mock-Prisma tests would catch regressions here.

---

## 5. Conventions

- **Co-location** — test file lives next to the source file:
  `foo.ts` + `foo.test.ts` in the same directory.
  A top-level `tests/` folder is also on the include glob for
  integration / cross-module tests.

- **Explicit imports** — globals are disabled; every test file must
  import `describe`, `it`, `expect` (and any other helpers) from
  `vitest`:
  ```ts
  import { describe, it, expect } from 'vitest'
  ```

- **Describe block names** — match the function under test, optionally
  with a `—` suffix describing the scenario group:
  ```ts
  describe('calculateWeightedScore', () => { ... })
  describe('buildRiskAlerts — risk-averse A/B direction', () => { ... })
  ```

- **Assertions** — use `expect(value).toBe(expected)` /
  `expect(value).toBeGreaterThan(n)` etc. Avoid `assert`; keep
  assertions close to the behaviour they prove.

- **No mocking framework wired yet** — tests that need Prisma should
  use an in-memory SQLite substitute or manual stubs until a
  `vi.mock` pattern is established for this repo.

# Docker — Local Dev & Demo Recording

Docker is **not** used for production (we deploy on Vercel). Use it for:
1. Clean demo recording environments (no host network noise).
2. Reproducible local dev with bundled Postgres ("works on my machine" insurance).
3. Future self-host optionality.

## Local dev quickstart

```bash
docker compose up --build
# App on http://localhost:3000, Postgres on localhost:5432
```

`.env.local` must exist in the repo root before running compose — it is mounted via `env_file`. The compose file overrides `DATABASE_URL` / `DIRECT_URL` to point at the bundled `db` service.

## Run Prisma migrations inside the container

```bash
docker compose exec app npx prisma migrate deploy
# or, for dev migrations:
docker compose exec app npx prisma migrate dev
```

## Reset local DB

```bash
docker compose down -v
docker compose up --build
```

`-v` removes the `pgdata` volume — destroys all local DB state. Production Neon is unaffected.

## Production image

```bash
# Build
docker build -t homesty:latest .

# Run
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgres://..." \
  -e DIRECT_URL="postgres://..." \
  -e NEXTAUTH_SECRET="..." \
  -e AUTH_SECRET="..." \
  -e OPENAI_API_KEY="..." \
  -e ADMIN_EMAIL="..." \
  -e GOOGLE_CLIENT_ID="..." \
  -e GOOGLE_CLIENT_SECRET="..." \
  -e RESEND_API_KEY="..." \
  -e FROM_EMAIL="..." \
  -e CLOUDINARY_CLOUD_NAME="..." \
  -e CLOUDINARY_API_KEY="..." \
  -e CLOUDINARY_API_SECRET="..." \
  homesty:latest
```

The production image is a Next.js standalone server (`output: 'standalone'` in `next.config.ts`). It contains a minimal `node_modules` and is run via `node server.js`.

## When to use Docker vs Vercel

| Scenario                  | Docker | Vercel |
| ------------------------- | :----: | :----: |
| Production traffic        |        |   X    |
| Demo recording (clean)    |   X    |        |
| Reproducible local dev    |   X    |        |
| PR preview deployments    |        |   X    |
| Cron jobs (visit-followups) |      |   X    |
| Self-host evaluation      |   X    |        |

## KNOWN LIMITATION — Neon HTTP adapter vs local Postgres

`src/lib/prisma.ts` uses `@prisma/adapter-neon` (HTTP transport over `@neondatabase/serverless`). This adapter speaks Neon's HTTP protocol, not raw TCP Postgres. Pointing `DATABASE_URL` at the bundled local Postgres container will **fail at query time** — the adapter cannot talk to a vanilla Postgres server.

**Workaround for demo recording:** keep `DATABASE_URL` in `.env.local` pointed at a Neon staging branch. The `db` service is still useful as a placeholder — it satisfies `depends_on` and lets you keep the compose file canonical. Override the URL in `.env.local` and the compose `environment:` block will be shadowed only if you remove it; today the compose file forces local Postgres, so for staging-Neon dev, comment out the two `DATABASE_URL` / `DIRECT_URL` lines under `app.environment` in `docker-compose.yml` (or set them to your Neon URLs explicitly).

**Workaround for true offline dev:** swap `src/lib/prisma.ts` to the standard `@prisma/client` driver (no Neon adapter) and remove the `@neondatabase/serverless` import. This is **out of scope** for this sprint — flagged as a future task if offline dev becomes a recurring need.

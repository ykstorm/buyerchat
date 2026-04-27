# Multi-stage production build for Next.js standalone output.
# - builder: full deps (devDeps required for next build), runs prisma generate + next build
# - runner: minimal production image, runs node server.js from .next/standalone
#
# Note: husky's `prepare` script must NOT run on production-only installs because
# husky 9 is in devDependencies. ENV HUSKY=0 short-circuits husky install.
# See: https://typicode.github.io/husky/how-to.html#with-other-package-managers

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV HUSKY=0
ENV NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]

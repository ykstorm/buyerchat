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
ENV DATABASE_URL=postgres://test:test@localhost:5432/test \
    DIRECT_URL=postgres://test:test@localhost:5432/test \
    NEXTAUTH_SECRET=dummy-build-secret-min-32-chars-long-x \
    AUTH_SECRET=dummy-build-secret-min-32-chars-long-x \
    OPENAI_API_KEY=sk-dummy-for-build \
    ADMIN_EMAIL=ci@example.com \
    GOOGLE_CLIENT_ID=dummy \
    GOOGLE_CLIENT_SECRET=dummy \
    RESEND_API_KEY=dummy \
    FROM_EMAIL=ci@example.com \
    CLOUDINARY_CLOUD_NAME=dummy \
    CLOUDINARY_API_KEY=dummy \
    CLOUDINARY_API_SECRET=dummy \
    VERIFY_METHOD=none
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
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/healthcheck || exit 1
CMD ["node", "server.js"]

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json web/package.json
COPY backend/package.json backend/package.json
RUN npm ci --no-audit --no-fund

FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY turbo.json ./
COPY web ./web
RUN npm run db:generate && npm run build

FROM deps AS production-deps
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:22-alpine AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=:: PORT=3000
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=production-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/web/public ./web/public
COPY --from=builder --chown=nextjs:nodejs /app/web/src/generated/prisma ./web/src/generated/prisma
COPY --chown=nextjs:nodejs web/prisma ./web/prisma
COPY --chown=nextjs:nodejs web/prisma.config.ts web/tsconfig.json web/package.json ./web/
COPY --chown=nextjs:nodejs web/src/lib/schemas.ts web/src/lib/solver-validation.ts web/src/lib/instance.ts ./web/src/lib/
COPY --chown=nextjs:nodejs deploy/migrate.mjs ./deploy/migrate.mjs
USER nextjs
EXPOSE 3000
CMD ["node", "web/server.js"]

FROM builder AS checks
CMD ["sh", "-c", "npm run lint && npm run typecheck && npm run test -w @sipa/web"]

# Railway's default target matches the local runtime image, with migration tools.
FROM runner AS frontend

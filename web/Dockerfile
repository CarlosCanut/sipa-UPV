FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY web/package.json web/package.json
COPY solver/package.json solver/package.json
RUN npm ci --no-audit --no-fund

FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY turbo.json ./
COPY web ./web
RUN npm run db:generate && npm run build

FROM builder AS migrator
CMD ["sh", "-c", "cd web && npx prisma migrate deploy && npx prisma db seed"]

FROM node:22-alpine AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/web/public ./web/public
COPY --from=builder --chown=nextjs:nodejs /app/web/src/generated/prisma ./web/src/generated/prisma
USER nextjs
EXPOSE 3000
CMD ["node", "web/server.js"]

# SIPA conventions

- Two workspaces only: `web` (Next.js) and `backend` (Python). Turbo orchestrates npm tasks.
- Spanish UI; English code and comments. Follow the base plan plus the pilot workflows in `docs/requirements.md`.
- Use Server Components for reads and Server Actions for mutations. Every protected page and action calls `requireRole()`.
- Keep Prisma access and backend calls on the server. Never send names, emails or addresses to the algorithm.
- Change schema locally, run `npm run db:migrate -- --name <change>`, and commit the generated migration. Never use `db push` for deployment.
- Use shared Zod schemas for form actions and CSV rows. Keep Pydantic and Zod contracts aligned. Check record ownership in mutations, not only page guards.
- External research algorithms return `AlgorithmResult` over the configured HTTP endpoint; leave validation and metric computation to `backend/metrics.py`. Never silently fall back to the placeholder.
- Run `npm run lint`, `npm run typecheck`, `npm run test -w @sipa/web`, and `docker compose run --rm backend pytest` before delivery.
- Keep runtime secrets in ignored `.env` files; never commit them. Do not reset existing passwords in the seed.

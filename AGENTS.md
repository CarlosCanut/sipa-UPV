# SIPA conventions

- Two workspaces only: `web` (Next.js) and `solver` (Python). Turbo orchestrates npm tasks.
- Spanish UI; English code and comments. Follow the base plan plus the pilot workflows in `docs/requirements.md`.
- Use Server Components for reads and Server Actions for mutations. Every protected page and action calls `requireRole()`.
- Keep Prisma access and solver calls on the server. Never send names, emails or addresses to the solver.
- Change schema locally, run `npm run db:migrate -- --name <change>`, and commit the generated migration. Never use `db push` for deployment.
- Use shared Zod schemas for form actions and CSV rows. Keep Pydantic and Zod contracts aligned. Check record ownership in mutations, not only page guards.
- New research algorithms return `AlgorithmResult`, register in `solver/algorithms/__init__.py`, and leave metric computation to `metrics.py`.
- Run `npm run lint`, `npm run typecheck`, `npm run test -w @sipa/web`, and `docker compose run --rm solver pytest` before delivery.
- Keep runtime secrets in ignored `.env` files; never commit them. Do not reset existing passwords in the seed.

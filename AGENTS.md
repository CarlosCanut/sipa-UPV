# SIPA conventions

- Two workspaces only: `web` (Next.js) and `solver` (Python). Turbo orchestrates npm tasks.
- Spanish UI; English code and comments. Keep features within the base plan.
- Use Server Components for reads and Server Actions for mutations. Every protected page and action calls `requireRole()`.
- Keep Prisma access and solver calls on the server. Never send names, emails or addresses to the solver.
- Change schema locally, run `npm run db:migrate -- --name <change>`, and commit the generated migration. Never use `db push` for deployment.
- Use the shared Zod schemas for form actions and future CSV rows. Keep Pydantic and Zod contracts aligned.
- New research algorithms return `AlgorithmResult`, register in `solver/algorithms/__init__.py`, and leave metric computation to `metrics.py`.
- Run `npm run lint`, `npm run typecheck`, `npm run test -w @sipa/web`, and `docker compose run --rm solver pytest` before delivery.
- Keep runtime secrets in ignored `.env` files; never commit them. Do not reset existing passwords in the seed.

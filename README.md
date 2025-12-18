# SIPA · Prácticas

A small, self-hosted base for assigning students to company placements and academic tutors. Two npm workspaces coordinated by **Turborepo**: **Next.js 16 / React / TypeScript** in `web`, and **Python 3.12 / FastAPI** in `solver`. PostgreSQL 17 is the only database. UI text is Spanish.

## Run with Docker

Requires Docker Engine/Desktop with Compose v2. From `demo/`:

```sh
cp .env.example .env
# Edit .env: set BETTER_AUTH_SECRET using `openssl rand -base64 32`.
docker compose up -d --build
```

Open **http://127.0.0.1:3000**. `docker compose ps -a` should show healthy `db`, `solver`, and `web`, plus `migrate` exited with code 0. No host Node/Python installation is needed. Port 3000 must be free; the existing reference demo on 8787 is independent.

| Role         | Email                   | Initial password                        |
| ------------ | ----------------------- | --------------------------------------- |
| Coordination | `admin@sipa.local`      | `change-me-now` (`SEED_ADMIN_PASSWORD`) |
| Student      | `estudiante@sipa.local` | `SipaDemo2026!` (`SEED_DEMO_PASSWORD`)  |
| Company      | `empresa@sipa.local`    | Same demo password                      |
| Tutor        | `tutor@sipa.local`      | Same demo password                      |

The seed adds 30 synthetic students (5 priority), 5 companies, 12 offers with 36 seats, 6 tutors, 6 competencies, and 2 forms. Only the listed demo accounts have passwords; other synthetic users are data records. Change the seed passwords before deployment. Upserts preserve existing records and password changes; changing seed environment variables does not reset an existing account.

## What works

- Email/password login, closed sign-up, role checks on every page and action, admin-created accounts with a one-time password display, and password change.
- Read-only data tables with search, sorting and pagination.
- New simulations, automatic refresh while running, metrics and all student assignment rows, parent-linked reruns with prefilled settings, and publishing.
- Published student, company and tutor views, scoped to the current user; unread event notifications.
- Deterministic placeholder solver behind a fixed contract. The real research algorithm can be added without changing the HTTP handlers.

As specified in the base plan, competency/form editing, student preferences and company placements are labeled placeholders. CSV import/export, feedback, geocoding and manual assignment are later work. Papa Parse is deliberately deferred until CSV import exists. This repository implements the supplied base plan; the richer reference demo contains later-phase UX.

## Architecture and files

```text
Browser ── Next.js pages + Server Actions ── PostgreSQL 17
                      │
                      └── private FastAPI solver (IDs, coordinates, levels only)

web/
  src/app/             Spanish routes, Server Actions, auth and health handlers
  src/components/      App shell, forms, tables; ui/ contains shadcn primitives
  src/lib/             Auth/role guards, Prisma client, Zod schemas, simulation lifecycle
  prisma/              Unmodified supplied schema, committed migrations, idempotent seed
  prisma.config.ts     Prisma 7 configuration
  Dockerfile           deps → builder → migrator / non-root runner
solver/
  contract.py          Pydantic request and response contract
  algorithms/          Registry and replaceable greedy baseline
  metrics.py, geo.py   Shared validation, metrics and Haversine distances
  tests/               Contract, capacity, determinism and API tests
  README.md            Researcher integration guide and metric definitions
deploy/Caddyfile        Optional public HTTPS reverse proxy
docker-compose.yml     db, migrate, solver, web; optional caddy
docker-compose.dev.yml Local-only database/solver ports for host development
turbo.json             Task graph, caching and environment forwarding
AGENTS.md              Short contributor conventions
```

A launch stores an immutable anonymized input snapshot, creates a `RUNNING` row, then uses Next.js `after()` to call the solver. An undici dispatcher supports long responses. Completion writes all assignments, metrics and a notification in one transaction. Stale runs fail on list/detail load after the configured limit plus five minutes. Publishing serializes requests with a PostgreSQL advisory lock and atomically replaces the current publication. No queue or extra API service is needed.

`after()` is in-process, so interrupted work must be relaunched. The Docker deployment has no serverless execution limit; other hosting environments must allow the solver time limit plus 60 seconds. Metrics retain `solverStatus` and `log`, including partial timeout outcomes. The placeholder ignores dependency/development metadata; see the solver README for exact semantics.

## Configuration

All application endpoints and secrets are runtime environment variables; the image builds without database access or secrets.

| Variable              | Purpose                                                                                |
| --------------------- | -------------------------------------------------------------------------------------- |
| `POSTGRES_USER`       | Initial PostgreSQL user.                                                               |
| `POSTGRES_PASSWORD`   | Initial database password; keep consistent with `DATABASE_URL`.                        |
| `POSTGRES_DB`         | Initial database name.                                                                 |
| `DATABASE_URL`        | Prisma PostgreSQL URL; Compose uses host `db`; URL-encode special password characters. |
| `APP_URL`             | Exact public origin used by Better Auth, e.g. `http://127.0.0.1:3000`.                 |
| `BETTER_AUTH_SECRET`  | Required session secret of at least 32 characters.                                     |
| `SEED_ADMIN_EMAIL`    | Initial admin email.                                                                   |
| `SEED_ADMIN_PASSWORD` | Initial admin password, at least 12 characters.                                        |
| `SEED_DEMO_DATA`      | `true` adds synthetic pilot data; `false` seeds only the admin.                        |
| `SEED_DEMO_PASSWORD`  | Initial password for the three demo logins.                                            |
| `SOLVER_URL`          | Internal solver origin; Compose uses `http://solver:8000`.                             |
| `SOLVER_TOKEN`        | Optional shared bearer token; set it when splitting solver hosts.                      |
| `DOMAIN`              | Hostname used by the optional Caddy public profile.                                    |

Use the exact `APP_URL` in the browser so auth cookies and origin checks agree. Database and solver ports are private in the default Compose configuration. Changing `POSTGRES_*` after initialization does not change credentials in an existing volume.

## Develop and check

Requires Node 22.12+ (22 LTS recommended) and Python 3.12. Docker remains the shortest path.

```sh
npm ci
python3.12 -m venv solver/.venv
solver/.venv/bin/pip install -r solver/requirements.txt
# Run only PostgreSQL in Docker; Turbo will run both application workspaces.
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
cp .env web/.env
# In web/.env use DATABASE_URL host localhost:5433 and SOLVER_URL http://127.0.0.1:8000.
# If SOLVER_TOKEN is set, export the same value before starting the local Python solver.
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Stop the Docker `web` and `solver` services first if they are already running, to free ports 3000/8000. `npm run db:migrate -- --name <change>` generates schema changes; commit every migration. The initial migration is already included, so the first migration command normally just applies it. Never use `prisma db push` for production.

```sh
npm run lint
npm run typecheck
npm run test                # Web contract tests + Python pytest via Turbo (local venv required)
npm run build
# Docker equivalents:
docker compose run --rm solver pytest
docker compose run --rm --no-deps migrate sh -c 'npm run lint && npm run typecheck && npm run test -w @sipa/web'
```

## Public HTTPS

Point your domain's DNS to the server and allow ports 80/443. Set `DOMAIN=practicas.example.org`, `APP_URL=https://practicas.example.org`, real passwords and a strong auth secret, then run:

```sh
docker compose --profile public up -d --build
```

Caddy obtains and renews certificates. This requires a real domain and is not part of local verification. For a clean non-demo deployment set `SEED_DEMO_DATA=false` before initializing a fresh database.

## Data and backups

`docker compose down` preserves PostgreSQL in the named `pgdata` volume; `up -d` applies migrations and reruns the safe seed. `down -v` deletes the data—do not use it for normal restarts.

```sh
mkdir -p backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/sipa.dump
# Restore into an empty database; stop the web service while restoring:
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' < backups/sipa.dump
```

## Branding

The 52 px `web/public/upv-logo.svg` is a neutral placeholder, not an official UPV mark. Replace it with the official SVG from the UPV brand pack after brand-use approval. The marked CSS tokens in `globals.css` are provisional teal; no institutional red is used as a brand color.

Framework references: [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after), [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next), [Prisma 7 configuration](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference).

## Verification

Verified locally on 22 October 2026: clean-volume Docker startup and migrations; all three long-running services healthy; 11 solver tests and 5 web contract tests; ESLint and TypeScript; browser login for all four roles, automatic completion, 30 assignment rows, linked rerun, publication and notifications; direct HTTP rejection of student admin actions; account/password flow; mobile navigation. After `down` / `up`, the same 30 students, 12 offers, 6 tutors, 5 companies, 2 simulations and 60 assignment rows remained, with one publication. Public-domain HTTPS still requires deployment to a real domain.

# SIPA · Prácticas

A small, self-hosted pilot application for assigning students to company placements and academic tutors. Two npm workspaces coordinated by **Turborepo**: **Next.js 16 / React / TypeScript** in `web`, and **Python 3.12 / FastAPI** in `solver`. PostgreSQL 17 is the only database. UI text is Spanish.

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

- **Coordination:** accounts, editable project data, validated CSV preview/import, competencies/forms, readiness checks, simulations, comparisons, publication, feedback and CSV exports.
- **Students:** ranked offers, competency self-assessment/development interests, location/travel limit, published assignment, contacts and rating.
- **Companies:** offers, capacity/location/competency requirements, deactivation, assigned students, contacts and rating.
- **Tutors:** location/capacity, assigned workload, contacts and rating.
- **Everyone:** profile/password, notifications, an editable pilot questionnaire, responsive navigation and server-side access checks.

The solver is still a **greedy demonstration baseline**, not the validated research model. Development interests and dependencies are not enforced by it. Research integration, real-center validation and impact claims remain pending. See [requirements coverage](docs/requirements.md) and [navigation](docs/navigation.md).

CSV: download a current dataset or template from Datos → Importar CSV, edit it, preview errors, then import. Student/tutor accounts must already exist. Coordinates are entered manually; no geocoding service is needed. Exports of assignments, metrics and ratings are on each simulation; questionnaire exports are in Evaluación del piloto.

## Architecture and files

```text
Browser ── Next.js pages + Server Actions ── PostgreSQL 17
                      │
                      └── private FastAPI solver (IDs, coordinates, levels only)

web/
  src/app/             Spanish routes, Server Actions, auth and health handlers
  src/components/      App shell, forms, tables; ui/ contains shadcn primitives
  src/lib/             Auth/role guards, Prisma client, Zod schemas, simulation lifecycle
  prisma/              Schema + pilot questionnaire extension, migrations, idempotent seed
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
docs/                  Requirement coverage and navigation map
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
npm run test                # Web validation/CSV/scope/metric tests + Python pytest via Turbo (local venv required)
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

Framework references: [Papa Parse CSV](https://www.papaparse.com/docs), [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after), [Better Auth Next.js integration](https://better-auth.com/docs/integrations/next), [Prisma 7 configuration](https://www.prisma.io/docs/orm/v7/reference/prisma-config-reference).

## Verification

Verified 27 October 2026: production Docker build and migration; 12 web tests, 11 solver tests, ESLint and TypeScript; browser checks for all four roles, ranking, profile/offer/catalog saves, assignment feedback, survey, scenario comparison, CSV template download and phone-width navigation. Direct HTTP checks cover admin-only actions, profile/offer ownership, priority escalation, published-assignment feedback, atomic CSV rejection/import and all eight export types. Temporary test records were removed. Existing demo records and publication were preserved.

Base acceptance on 22 October also covered clean-volume startup, simulation/rerun/publication and persistence across restarts. Public HTTPS requires a real domain. Synthetic technical checks do not constitute a field pilot.

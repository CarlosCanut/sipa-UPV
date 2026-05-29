# SIPA · Prácticas

A Spanish-language MVP for coordinating student placements, companies and academic tutors. Two Turborepo workspaces: **`web`** (Next.js/React/TypeScript) and **`backend`** (Python/FastAPI, formerly `solver`). PostgreSQL stores application data, users, hashed credentials and sessions.

## Run locally

Requires Docker with Compose v2. From this directory:

```sh
cp .env.example .env
# Generate two different secrets; paste them into BETTER_AUTH_SECRET and BACKEND_TOKEN.
openssl rand -hex 32
openssl rand -hex 32
docker compose up -d --build
```

Open [SIPA](http://127.0.0.1:3000). `docker compose ps -a` should show healthy **frontend**, **backend**, **db**, and **migrate** exited with code 0. No host Node/Python installation is needed. An existing `.env` should be updated, not overwritten; upgrading from the former service names is covered in the [deployment guide](docs/deployment.md).

| Role         | First login             | Initial password |
| ------------ | ----------------------- | ---------------- |
| Coordination | `admin@sipa.local`      | `change-me-now`  |
| Student      | `estudiante@sipa.local` | `SipaDemo2026!`  |
| Company      | `empresa@sipa.local`    | `SipaDemo2026!`  |
| Tutor        | `tutor@sipa.local`      | `SipaDemo2026!`  |

All **42 fictional users** can sign in: also `estudiante2@sipa.local` through `estudiante30@sipa.local`, `empresa2` through `empresa5`, and `tutor2` through `tutor6` at `sipa.local`. Their password is `SEED_DEMO_PASSWORD`. A fresh database includes 30 students, 5 companies, 12 offers, 6 tutors, competencies, preferences, two completed scenarios, one publication, notifications and clearly labelled sample feedback.

Seeding preserves existing passwords, edited profiles/preferences and existing simulations/publication. Change passwords in Mi perfil; coordination can create accounts or reset another user's access in Usuarios. There is no public signup. For real deployments, choose your own initial admin credentials and set `SEED_DEMO_DATA=false` on an empty database.

## Try the complete flow

1. Coordination reviews **Datos**, creates accounts, imports validated CSV and maintains competencies/forms.
2. Students rank offers, record skills and development interests; center-managed identity and qualification fields are protected. Companies create/copy offers with optional qualification guidance, requirements, seats and dependencies. Tutors set location and capacity.
3. Coordination creates simulations, adjusts preference/competency/development/distance weights and tutor travel/load balance, compares proposals and publishes one.
4. Each participant sees their own assignments and contacts, submits a rating, and completes the pilot questionnaire, including optional decision-time measurements. Coordination exports results and feedback.

The built-in algorithm is a capacity-aware **demonstration heuristic**. To use a research service, set `USE_PLACEHOLDER_ALGORITHM=false`, `EXTERNAL_ALGORITHM_URL` and, if required, `EXTERNAL_ALGORITHM_TOKEN`. External errors fail the simulation; they never silently switch algorithms. See the [algorithm contract](backend/README.md) and [proposal coverage](docs/requirements.md). The validated research algorithm and real-center pilot evidence still need to be supplied.

## Architecture and files

```text
Browser ── frontend:3000 ── PostgreSQL:5432
           Next.js            users, credentials, sessions, pilot data
               │
               └── backend:8000 ── placeholder OR external algorithm endpoint
                   FastAPI         IDs, coordinates and skills only

migrate (one-shot, frontend image) ── Prisma migrations + optional seed ── PostgreSQL
```

Authentication and database mutations run in Next.js on the server. The browser never receives backend credentials. The Python container validates assignments and computes common metrics; it does not need database access. **Prisma migrations run from the frontend image; PostgreSQL runs separately with persistent storage.** Railway uses the same image in a pre-deploy job.

| Path                                         | Contents                                                             |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `web/src/app/`                               | Pages, protected Server Actions, authentication and health routes    |
| `web/src/components/`, `web/src/lib/`        | Forms/UI, auth/role checks, validation, CSV and simulation lifecycle |
| `web/prisma/`                                | Database schema, committed migrations, idempotent seed               |
| `backend/`                                   | FastAPI, contracts, placeholder, external adapter and tests          |
| `web/Dockerfile`, `backend/Dockerfile`       | Separate production images, non-root processes                       |
| `deploy/migrate.mjs`                         | Shared local/Railway migration and seed entry point                  |
| `docker-compose*.yml`                        | Local stack, development ports, external-contract example            |
| `docs/deployment.md`                         | Local operations, Railway setup, environment variables and backups   |
| `docs/requirements.md`, `docs/navigation.md` | Coverage, limits and navigation map                                  |

## Checks and development

```sh
docker compose run --rm backend pytest
docker compose --profile checks run --build --rm checks
```

For host development, use Node 22.12+ and Python 3.12. Run `npm ci`, create `backend/.venv`, install `backend/requirements.txt`, and start PostgreSQL with `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db`. Copy `.env` to `web/.env`; change its database host to `127.0.0.1:5433` and `BACKEND_URL` to `http://127.0.0.1:8000`. Export `BACKEND_TOKEN` and the algorithm settings in the shell. Stop container frontend/backend before `npm run dev` to free their ports.

`npm run db:generate` builds Prisma types. `npm run db:migrate -- --name <change>` generates/applies development migrations; commit them. `npm run db:seed` seeds with a running backend (or `SEED_DEMO_RESULTS=false`). Use `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` for host checks. Deployment uses `migrate deploy`, never `db push`.

Simulation execution uses Next.js `after()` in a long-running process. For this MVP keep one frontend replica, disable service sleeping and avoid redeploying during runs. Interrupted runs are marked failed after their limit plus five minutes when viewed, and can be relaunched. See [operational limits](docs/deployment.md#operational-limits).

The logo and teal brand tokens remain provisional; the included SVG is not an official UPV mark.

UI components use the existing Radix primitives and shared design tokens. `HelpPopover` supplies optional explanations on click, touch or keyboard; essential instructions stay beside the fields. Simulation settings separate advanced options, and shared tables include search recovery and visible sort direction. There are no additional UI dependencies.

Verified 29 October 2026: production Docker build, fresh installation and existing-data upgrade, 43 unit tests, lint/types, real database authentication and role flows, external HTTP success/failure, and data preservation after reseeding/restarts. See [verification details](docs/verification.md).

UI cleanup verified 30 October: four role views, keyboard-accessible help, mobile layouts down to 320px and table/form feedback. Type checking also rejects unused locals and parameters.

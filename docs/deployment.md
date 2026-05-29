# Local Docker and Railway deployment

The persistent topology is **frontend + backend + PostgreSQL**. The frontend image also contains Prisma CLI and the seed runner. Locally, `migrate` is a one-shot container; Railway runs the same command before deploying frontend. Neither migrations nor the seed start a database server.

## Local setup and upgrades

Follow the root README to create `.env`, generate separate auth/backend secrets and start Compose. Startup order: database/backend health → migrations → optional seed → frontend. Both images build without database access or runtime secrets.

```sh
docker compose up -d --build
docker compose ps -a
docker compose logs --tail=80 migrate frontend backend
curl --fail http://127.0.0.1:3000/api/health
```

Normal `docker compose down` preserves the `pgdata` volume. Do not use `down -v` unless you intend to erase all data. Do not change `POSTGRES_*` on an existing volume expecting PostgreSQL to change its credentials.

When upgrading the old `web`/`solver` stack: back up the database first, replace `SOLVER_URL`/`SOLVER_TOKEN` with `BACKEND_URL=http://backend:8000` and a new `BACKEND_TOKEN` of at least 32 characters; add `SEED_DATABASE=true` and the algorithm variables from `.env.example`. Then:

```sh
docker compose up -d --build --remove-orphans
```

This replaces the old application containers while retaining the same `sipa-demo_pgdata` volume. Existing simulations/publication and passwords survive. The additive migration introduces questionnaire timing columns and enforces one credential per provider/account identity. On failure, inspect `migrate` logs; do not reset the database.

To rerun migrations/seeding explicitly, with database/backend running:

```sh
docker compose run --rm --no-deps migrate
```

For a second isolated demo, copy your configured `.env` to `.env.acceptance`, set `APP_URL=http://127.0.0.1:3001`, then:

```sh
SIPA_ENV_FILE=.env.acceptance FRONTEND_PORT=3001 \
  docker compose --env-file .env.acceptance -p sipa-acceptance up -d --build
```

The alternate project gets its own database volume. Use the same environment/project options for later commands. The default stack exposes only frontend on loopback; the development override optionally exposes DB on 5433 and backend on 8000.

## Environment variables

| Variable                                            | Where                    | Meaning                                                                                   |
| --------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                      | frontend/migrate         | PostgreSQL connection string; Compose host `db`; URL-encode credentials                   |
| `APP_URL`                                           | frontend                 | Exact public origin, without a path; HTTPS on Railway                                     |
| `BETTER_AUTH_SECRET`                                | frontend                 | Stable random secret, 32+ characters; changing it invalidates sessions                    |
| `BACKEND_URL`                                       | frontend/migrate         | Private backend origin, e.g. `http://backend:8000` locally                                |
| `BACKEND_TOKEN`                                     | frontend/backend/migrate | Same random bearer secret on both services, 32+ characters                                |
| `USE_PLACEHOLDER_ALGORITHM`                         | backend                  | `true` uses the demo baseline; `false` requires the external endpoint                     |
| `EXTERNAL_ALGORITHM_URL`                            | backend                  | Full HTTP(S) POST endpoint, e.g. `https://research.example/solve`                         |
| `EXTERNAL_ALGORITHM_TOKEN`                          | backend                  | Optional bearer token sent only to the external service                                   |
| `SEED_DATABASE`                                     | migrate/pre-deploy       | Exactly `true` runs the seed after migrations; migrations always run                      |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`           | seed                     | Initial admin; password 12+ characters                                                    |
| `SEED_DEMO_DATA`                                    | seed                     | Exactly `true` adds fictional accounts/data; otherwise admin only                         |
| `SEED_DEMO_PASSWORD`                                | seed                     | Initial password for all 41 non-admin demo accounts, 12+ characters                       |
| `SEED_DEMO_RESULTS`                                 | seed                     | `false` skips sample scenarios/feedback; otherwise created only when no simulations exist |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | local db                 | Initial PostgreSQL settings; match `DATABASE_URL`                                         |
| `PORT`, `HOSTNAME`                                  | runtime                  | Backend honors `PORT` (8000 default); frontend uses 3000 and `HOSTNAME=::`                |
| `FRONTEND_PORT`, `SIPA_ENV_FILE`                    | Compose                  | Optional published port and env-file overrides                                            |

The seed never resets existing passwords or edited nested data. An existing database with simulations keeps its results instead of replacing them with seeded scenarios. `SEED_DEMO_DATA=false` does not delete existing demo data; use a separate empty database for a real pilot. Account creation and password resets are available in Usuarios; new/reset passwords are displayed once, and resets revoke existing sessions. Participants change passwords in Mi perfil. No email delivery service is assumed.

## Railway

Use one Railway project/environment with three services named **Postgres**, **backend**, **frontend**. Keep the database volume attached and configure backups. This guide assumes `demo/` is the Git repository root (as in this workspace). If the parent repository is uploaded instead, use `/demo` and `/demo/backend` as the respective roots.

New Railway services no longer accept legacy `railway.json`/`railway.toml` configuration, according to the current [Config as Code documentation](https://docs.railway.com/config-as-code). The settings below use the dashboard and Dockerfiles. No Railway deployment is created by running local Compose.

1. Create PostgreSQL from Railway's [PostgreSQL service](https://docs.railway.com/databases/postgresql). Keep its persistent volume. Use its private `DATABASE_URL` reference in frontend, not the public TCP proxy.
2. Add **backend** from the repository. Set root directory `/backend`; Railway detects `Dockerfile`. Keep its Docker start command (`python start.py`). Set healthcheck `/health`, timeout 60 seconds, `PORT=8000`, `BACKEND_TOKEN=<generated secret>` and `USE_PLACEHOLDER_ALGORITHM=true`. Leave it private. Deploy it and wait for a healthy service.
3. Add **frontend** from the same repository. Keep root directory `/` (it needs the workspace lockfile). Set `RAILWAY_DOCKERFILE_PATH=web/Dockerfile`. Keep its Docker start command (`node web/server.js`). Set healthcheck `/api/health`, timeout 120 seconds, and the pre-deploy command below, with a 300-second timeout. See [custom Dockerfile paths](https://docs.railway.com/builds/dockerfiles) and [monorepo roots](https://docs.railway.com/deployments/monorepo).

```text
node deploy/migrate.mjs
```

Railway [pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command) have private networking and runtime variables; a nonzero exit stops deployment. Our image includes everything this command needs. Keep this command on frontend only, so two services do not race to seed.

Set frontend variables (service reference names must match your project):

```dotenv
DATABASE_URL=${{Postgres.DATABASE_URL}}
BACKEND_URL=http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:8000
BACKEND_TOKEN=${{backend.BACKEND_TOKEN}}
PORT=3000
HOSTNAME=::
APP_URL=https://YOUR-FRONTEND-DOMAIN
BETTER_AUTH_SECRET=YOUR-DIFFERENT-RANDOM-SECRET
SEED_DATABASE=true
SEED_ADMIN_EMAIL=YOUR-ADMIN-EMAIL
SEED_ADMIN_PASSWORD=YOUR-INITIAL-ADMIN-PASSWORD
SEED_DEMO_DATA=true
SEED_DEMO_PASSWORD=YOUR-INITIAL-DEMO-PASSWORD
SEED_DEMO_RESULTS=true
```

Generate a frontend Railway domain targeting port 3000, set `APP_URL` to that exact HTTPS origin, then deploy/redeploy frontend. This address is used for authentication origin checks and cookies. Both processes listen on IPv4/IPv6; backend calls use Railway's [private network](https://docs.railway.com/networking/private-networking). Only frontend needs a public domain. Railway terminates HTTPS; do not deploy the optional Caddy service there.

For a real pilot rather than a public demo, set `SEED_DEMO_DATA=false` before the first frontend deployment. After initial seed succeeds, set `SEED_DATABASE=false` and remove seed password variables. Migrations continue on every deployment. Keep `BETTER_AUTH_SECRET` stable. Set one replica per application service and disable sleeping/serverless mode for the MVP.

A PostgreSQL service outside Railway is also supported: supply its connection URL as `DATABASE_URL`, with its required TLS parameters/certificate and network access from Railway. Use a direct PostgreSQL connection for migrations; the current single URL serves both runtime and migrations. Do not put PostgreSQL inside an ephemeral frontend/backend container. Database lifecycle, backups and restore testing remain your responsibility whichever host is selected.

## Switch the algorithm

Set backend `USE_PLACEHOLDER_ALGORITHM=false`, `EXTERNAL_ALGORITHM_URL` and optional `EXTERNAL_ALGORITHM_TOKEN`, then redeploy backend. Frontend discovers the enabled mode from `/algorithms`; no rebuild or browser secret is required. Existing snapshots/results remain intact. Relaunching a proposal uses the currently available mode. The external service must implement the [typed contract](../backend/README.md).

For a completely local test of the external HTTP path:

```sh
docker compose -f docker-compose.yml -f docker-compose.external-demo.yml up -d --build
```

Create a new simulation; its algorithm is “Algoritmo externo”. The additional `external-demo` container runs the same demonstration heuristic behind HTTP with a distinct token, and labels its log accordingly. It is a contract fixture, not the research algorithm. Restore the default mode with `docker compose up -d --remove-orphans` when `.env` has `USE_PLACEHOLDER_ALGORITHM=true`.

## Backups and release checks

Before applying schema changes:

```sh
mkdir -p backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/sipa.dump
```

Restore into a separately initialized empty PostgreSQL database with matching major version; stop frontend while restoring. Do not overlay a populated database:

```sh
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner' < backups/sipa.dump
```

On Railway enable/test volume backups and retain an independent logical dump for important releases. Rollbacks of application images do not undo migrations; use additive migrations and a tested recovery plan.

Acceptance after deployment: healthcheck succeeds; all four roles sign in; a new simulation completes; comparison/export works; publishing changes the participant views; a password change survives restart; data survives restart. Test external mode separately before using a real algorithm. Run `docker compose run --rm backend pytest` and `docker compose --profile checks run --build --rm checks` before a release.

## Operational limits

Simulation jobs run in the frontend's `after()` callback. They survive browser navigation, but not a killed/redeployed process. Keep one frontend replica with sleeping disabled; avoid deployment during a run. A stale RUNNING row becomes FAILED on list/detail access after `timeLimitSec + 300s`, and the administrator can relaunch it. A durable worker/queue is a future scaling step, not part of this minimal three-service deployment.

Results are checked for IDs, capacities, distance, tutors and dependencies before persistence. External calls have a wall-clock deadline, a 5 MB response limit and no automatic retry or fallback. Use an authenticated HTTPS endpoint for an algorithm outside the private network. Logs and the API contract identify demonstration results; synthetic outcomes are not evidence of research validity or field impact.

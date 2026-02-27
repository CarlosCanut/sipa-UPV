# SIPA backend

Python 3.12 / FastAPI assignment service, formerly `solver`. The frontend owns authentication, database access and workflow; backend receives pseudonymous IDs, coordinates, preferences and skill levels. Names, emails and street addresses are excluded. Coordinates and linked IDs are still potentially identifying and require appropriate handling in a real pilot.

## Run and configure

```sh
docker compose up -d --build backend
docker compose run --rm backend pytest
```

`BACKEND_TOKEN` is required (32+ characters). `USE_PLACEHOLDER_ALGORITHM=true` enables the built-in demonstration. `false` requires `EXTERNAL_ALGORITHM_URL`; optional `EXTERNAL_ALGORITHM_TOKEN` becomes its bearer token. Invalid settings fail startup. `PORT` defaults to 8000; `start.py` listens on IPv4/IPv6 for Docker and Railway. The default Compose network keeps this port private.

| Endpoint          | Authentication                        | Result                                                  |
| ----------------- | ------------------------------------- | ------------------------------------------------------- |
| `GET /health`     | None                                  | Health and enabled algorithm mode                       |
| `GET /algorithms` | `Authorization: Bearer BACKEND_TOKEN` | Single configured key, display name, default parameters |
| `POST /solve`     | Same                                  | Validated assignments, unassigned IDs, computed metrics |

The development Compose override exposes port 8000 on loopback; `/docs` and `/openapi.json` describe the exact schema. `contract.py` is the source of truth, mirrored in frontend Zod schemas.

## External algorithm contract

Backend POSTs a `SolveRequest` to the configured full URL, with `algorithm: "external"`. The request includes:

- `simulationId`, `algorithm`, and `params`: weights (`preference`, `competency`, `distance`, `development`), `maxDistanceKm`, `assignTutors`, `tutorTravelWeight` (0–1), `timeLimitSec`, `seed`.
- `students`: ID, nullable coordinate pair/personal distance limit, priority, ordered offer IDs, competency levels 1–5 and development flags.
- `placements`: ID, company ID, coordinates, seats, competency requirements and nullable `dependsOn` offer ID.
- `tutors`: ID, coordinates and capacity.

Return **AlgorithmResult**, not the complete public `/solve` response:

```json
{
  "status": "feasible",
  "assignments": [
    {
      "studentId": "s1",
      "placementId": "p1",
      "tutorId": "t1",
      "score": 0.8,
      "distanceKm": 3.61
    }
  ],
  "log": "Model version and relevant solver diagnostics"
}
```

Allowed statuses: `optimal`, `feasible`, `infeasible`, `timeout`. Only use `optimal` if the model proved it. Unassigned students are omitted from this array. Return null tutor IDs when tutor allocation is disabled. Timeout may contain a valid partial solution; infeasible must have an empty array. Scores must be finite in [0,1]. Unknown fields are rejected. The external response contains no `metrics` or `unassigned`; backend calculates these consistently.

`metrics.py` checks unique known students, offer/tutor capacities, coordinate availability, the tighter personal/global distance limit, accurate Haversine distances (0.01 km tolerance), required/disabled tutors and dependencies. A used dependent offer requires **at least one occupied seat** in its prerequisite. The UI restricts dependency authoring to the same company, rejects cycles, and prevents active dependents of unavailable offers. This is explicit MVP semantics; adapt/version the contract if the validated model uses a different dependency definition.

The adapter uses the configured time limit as a wall-clock deadline, rejects redirects, limits responses to 5 MB and log text to 20,000 characters. Errors return 502 with a safe message; no automatic retry, placeholder fallback or remote source-code execution occurs. The frontend marks that run failed, retaining its input for review and relaunch.

`examples/external_service.py` is a runnable HTTP adapter fixture. Use the root `docker-compose.external-demo.yml` override to exercise it. Replace its call to the placeholder with your actual model in your separately hosted algorithm service. Validate with representative instances before a real pilot; the research model source is not included in this repository.

## Demonstration semantics and metrics

The deterministic greedy baseline orders priority students first, then students with fewer reachable options (seeded tie order). It combines normalized weights for ranked preferences, competency fit, development interests and proximity. Skill requirements are soft scores; capacity and distance are hard constraints. Dependencies can unlock later assignment passes. Missing locations leave students unassigned.

Tutor selection balances current capacity utilization with additional tutor-to-workplace travel. Weight 0 favors load distribution; 1 favors travel reduction. Repeated visits to the same offer cost zero additional travel in this approximation. It is sequential allocation, not joint optimal three-party assignment, route optimization or the validated research model.

Common metrics: first-choice percentage among assigned students, average rank among ranked matches, total/average student km, unassigned count, priority assignment percentage and tutor load standard deviation. Distances are one-way straight-line Haversine estimates. Frontend comparison adds distinct tutor/offer visit km and cohort-aware travel/social indicators. Decision-time questionnaire values are self-reported, separate from computation duration.

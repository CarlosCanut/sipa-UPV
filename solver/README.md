# SIPA solver

Python 3.12 + FastAPI. `contract.py` is the integration contract. No database or personal identity data enters this service.

From the repository root:

```sh
docker compose up -d solver --build
docker compose run --rm solver pytest
```

For local work: create `solver/.venv` with Python 3.12, install `requirements.txt`, then use `npm run dev -w @sipa/solver` or `npm run test -w @sipa/solver`.

## Add an algorithm

1. Add `algorithms/my_algorithm.py` with `solve(instance: SolveRequest) -> AlgorithmResult`.
2. Register its function in `REGISTRY` in `algorithms/__init__.py`. Its key appears automatically in the web algorithm selector.
3. Return status (`optimal`, `feasible`, `infeasible`, or `timeout`), assignments, and a log. Honor `params.timeLimitSec`; `timeout` may include a valid partial solution.
4. Add tests against `tests/fixtures/small.json`. Do not edit `app.py` or calculate metrics in the algorithm.

`metrics.complete()` checks identifiers, duplicate students, travel limits, placement/tutor capacity and distances, then derives unassigned students and comparable metrics. A student with no assignment is returned in `unassigned`. When tutoring is enabled, an assigned student must have a tutor. The web validates the response again before committing it.

`GET /health` is public. `GET /algorithms` and `POST /solve` require `Authorization: Bearer <SOLVER_TOKEN>` when the environment variable is set. Keep the service private; configure this token on both hosts if separating deployments.

## Baseline semantics

Priority students precede others; within each group students with fewer feasible options go first. The seed breaks student-order ties. The best free placement balances ranked preferences, competency fit and straight-line Haversine distance. A personal distance limit can tighten, never loosen, the global limit. The nearest available tutor is measured from the student's location.

Missing coordinates make that actor ineligible. Competencies are soft scores, not eligibility rules. `wantsToDevelop` and placement `dependsOn` are reserved for research algorithms and are deliberately ignored by the placeholder. This greedy baseline never claims optimality or proves global infeasibility; `infeasible` means it produced no assignments.

Metric definitions: first choice percentage is over assigned students; mean preference rank is over assigned placements that were ranked; distance metrics cover assigned students; priority percentage is over all priority students; tutor load is population standard deviation across all tutors, including zero loads. Empty denominators return zero.

import pytest
from pydantic import ValidationError

from algorithms.placeholder import solve
from contract import AlgorithmResult, Assignment, SolveRequest
from metrics import complete


def scenario():
    return SolveRequest.model_validate({
        "simulationId": "objectives",
        "params": {"maxDistanceKm": 100, "assignTutors": False},
        "students": [{"id": "s1", "lat": 0, "lng": 0, "competencies": {"c1": {"level": 1, "wantsToDevelop": True}, "c2": {"level": 1}}}],
        "placements": [{"id": "p1", "companyId": "c", "lat": 0, "lng": 0, "seats": 1, "requirements": {"c1": 3}},
                       {"id": "p2", "companyId": "c", "lat": 0, "lng": 0, "seats": 1, "requirements": {"c2": 3}}],
    })


def test_development_interest_changes_selection():
    instance = scenario()
    instance.params.weights.preference = instance.params.weights.competency = instance.params.weights.distance = 0
    instance.params.weights.development = 1
    assert solve(instance).assignments[0].placementId == "p1"
    instance.students[0].competencies["c1"].wantsToDevelop = False
    instance.students[0].competencies["c2"].wantsToDevelop = True
    assert solve(instance).assignments[0].placementId == "p2"


def test_dependencies_unlock_and_are_enforced():
    instance = scenario()
    instance.placements[1].dependsOn = "p1"
    instance.students.append(instance.students[0].model_copy(update={"id": "s2"}))
    result = solve(instance)
    assert {a.placementId for a in complete(instance, result).assignments} == {"p1", "p2"}
    instance.placements[0].seats = 0
    assert not solve(instance).assignments
    invalid = AlgorithmResult(status="feasible", assignments=[Assignment(studentId="s1", placementId="p2", score=1, distanceKm=0)])
    with pytest.raises(ValueError, match="dependency"):
        complete(instance, invalid)


def test_cycles_rejected():
    instance = scenario().model_dump()
    instance["placements"][0]["dependsOn"] = "p2"
    instance["placements"][1]["dependsOn"] = "p1"
    with pytest.raises(ValidationError, match="Cyclic"):
        SolveRequest.model_validate(instance)


def test_tutor_travel_targets_workplace_and_load_can_be_balanced():
    data = scenario().model_dump()
    data["placements"] = [dict(data["placements"][0], lng=0.5, seats=4)]
    data["students"] = [dict(data["students"][0], id=f"s{i}") for i in range(4)]
    data["tutors"] = [{"id": "near-student", "lat": 0, "lng": 0, "capacity": 4},
                      {"id": "near-workplace", "lat": 0, "lng": 0.5, "capacity": 4}]
    instance = SolveRequest.model_validate(data)
    instance.params.assignTutors = True
    instance.params.tutorTravelWeight = 1
    assert {row.tutorId for row in solve(instance).assignments} == {"near-workplace"}
    instance.params.tutorTravelWeight = 0
    result = complete(instance, solve(instance))
    assert result.metrics.tutorLoadStdDev == 0

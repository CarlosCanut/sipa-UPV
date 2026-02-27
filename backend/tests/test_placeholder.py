import json
from collections import Counter
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from algorithms.placeholder import solve
from app import app
from contract import SolveRequest
from geo import haversine_km
from metrics import complete
from settings import settings


@pytest.fixture
def instance():
    return SolveRequest.model_validate_json((Path(__file__).parent / "fixtures/small.json").read_text())


def test_solves_and_partitions_every_student(instance):
    response = complete(instance, solve(instance))
    assert response.status == "feasible"
    assert len(response.assignments) == 3
    assert response.unassigned == ["s4"]
    assert sorted([row.studentId for row in response.assignments] + response.unassigned) == sorted(s.id for s in instance.students)
    assert response.metrics.priorityAssignedPct == 100
    assert response.metrics.unassignedCount == 1


def test_capacity_and_reproducibility(instance):
    result = solve(instance)
    assert result == solve(instance)
    for key, count in Counter(a.placementId for a in result.assignments).items():
        assert count <= next(p.seats for p in instance.placements if p.id == key)
    for key, count in Counter(a.tutorId for a in result.assignments).items():
        assert count <= next(t.capacity for t in instance.tutors if t.id == key)


def test_priority_gets_scarce_seat(instance):
    instance.placements[1].seats = 0
    assert [row.studentId for row in solve(instance).assignments] == ["s1"]


def test_personal_distance_and_missing_coordinates(instance):
    instance.students[0].maxDistanceKm = 0.01
    instance.students[1].lat = instance.students[1].lng = None
    result = complete(instance, solve(instance))
    assert {"s1", "s2", "s4"} <= set(result.unassigned)


def test_tutors_optional_but_required_when_enabled(instance):
    instance.tutors = []
    assert not solve(instance).assignments
    instance.params.assignTutors = False
    assert len(solve(instance).assignments) == 3
    assert all(a.tutorId is None for a in solve(instance).assignments)


def test_empty_instance(instance):
    instance.students = []
    result = complete(instance, solve(instance))
    assert result.metrics.totalKm == 0
    assert result.unassigned == []


def test_metrics_reject_invalid_plugin_result(instance):
    result = solve(instance)
    result.assignments.append(result.assignments[0])
    with pytest.raises(ValueError, match="duplicate"):
        complete(instance, result)


def test_metrics_reject_distance_fabrication(instance):
    result = solve(instance)
    result.assignments[0].distanceKm = 99
    with pytest.raises(ValueError, match="distance"):
        complete(instance, result)


def test_contract_rejects_private_data_and_duplicate_ids(instance):
    payload = instance.model_dump()
    payload["students"][0]["email"] = "private@example.test"
    with pytest.raises(ValidationError):
        SolveRequest.model_validate(payload)
    payload = instance.model_dump()
    payload["students"].append(payload["students"][0])
    with pytest.raises(ValidationError):
        SolveRequest.model_validate(payload)


def test_geo():
    assert haversine_km(39, -0.3, 39, -0.3) == 0
    assert 110 < haversine_km(0, 0, 1, 0) < 112


def test_http_contract_and_auth(instance, monkeypatch):
    monkeypatch.setenv("BACKEND_TOKEN", "test-secret-" * 4)
    monkeypatch.setenv("USE_PLACEHOLDER_ALGORITHM", "true")
    settings.cache_clear()
    with TestClient(app) as client:
        assert client.get("/health").json() == {"ok": True, "algorithm": "placeholder"}
        assert client.post("/solve", json=instance.model_dump()).status_code == 401
        headers = {"Authorization": "Bearer " + "test-secret-" * 4}
        assert client.get("/algorithms", headers=headers).json()[0]["key"] == "placeholder"
        response = client.post("/solve", json=instance.model_dump(), headers=headers)
        assert response.status_code == 200
        assert response.json()["metrics"]["unassignedCount"] == 1
        payload = json.loads(instance.model_dump_json())
        payload["algorithm"] = "missing"
        assert client.post("/solve", json=payload, headers=headers).status_code == 400
    settings.cache_clear()

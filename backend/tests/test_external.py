import json
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

import external
from algorithms.placeholder import solve
from app import app
from contract import SolveRequest
from settings import settings


@pytest.fixture
def configuration(monkeypatch):
    monkeypatch.setenv("BACKEND_TOKEN", "test-backend-secret-" * 3)
    monkeypatch.setenv("USE_PLACEHOLDER_ALGORITHM", "false")
    monkeypatch.setenv("EXTERNAL_ALGORITHM_URL", "https://algorithm.example.test/solve")
    monkeypatch.setenv("EXTERNAL_ALGORITHM_TOKEN", "upstream-only-secret")
    settings.cache_clear()
    yield
    settings.cache_clear()


@pytest.fixture
def instance():
    value = SolveRequest.model_validate_json((Path(__file__).parent / "fixtures/small.json").read_text())
    value.algorithm = "external"
    return value


def transport(monkeypatch, handler):
    client = httpx.AsyncClient
    monkeypatch.setattr(external.httpx, "AsyncClient", lambda **kwargs: client(transport=httpx.MockTransport(handler), **kwargs))


def request(instance):
    with TestClient(app) as client:
        assert client.get("/health").json()["algorithm"] == "external"
        headers = {"Authorization": "Bearer " + "test-backend-secret-" * 3}
        assert client.get("/algorithms", headers=headers).json()[0]["key"] == "external"
        return client.post("/solve", headers=headers, json=instance.model_dump())


def test_external_contract_validated_and_metrics_computed(configuration, instance, monkeypatch):
    def handler(req):
        assert req.headers["Authorization"] == "Bearer upstream-only-secret"
        assert json.loads(req.content) == instance.model_dump()
        assert "email" not in req.content.decode()
        return httpx.Response(200, json=solve(instance).model_dump())
    transport(monkeypatch, handler)
    response = request(instance)
    assert response.status_code == 200
    assert response.json()["metrics"]["unassignedCount"] == 1


@pytest.mark.parametrize("failure", ["http", "redirect", "timeout", "json", "invalid", "capacity", "large"])
def test_external_failure_never_falls_back(configuration, instance, monkeypatch, failure):
    def handler(req):
        if failure == "http":
            return httpx.Response(503, text="sensitive upstream details")
        if failure == "redirect":
            return httpx.Response(307, headers={"Location": "https://other.example.test"})
        if failure == "timeout":
            raise httpx.ReadTimeout("secret upstream details", request=req)
        if failure == "json":
            return httpx.Response(200, text="not json")
        if failure == "invalid":
            return httpx.Response(200, json={"status": "optimal", "assignments": [], "unexpected": "data"})
        if failure == "large":
            return httpx.Response(200, content=b" " * 5_000_001)
        result = solve(instance)
        result.assignments.append(result.assignments[0])
        return httpx.Response(200, json=result.model_dump())
    transport(monkeypatch, handler)
    response = request(instance)
    assert response.status_code == 502
    assert "assignments" not in response.json()
    assert "secret" not in response.text and "sensitive" not in response.text


@pytest.mark.parametrize("name,value", [
    ("BACKEND_TOKEN", ""),
    ("USE_PLACEHOLDER_ALGORITHM", "maybe"),
    ("EXTERNAL_ALGORITHM_URL", ""),
    ("EXTERNAL_ALGORITHM_URL", "file:///tmp/algorithm.py"),
    ("EXTERNAL_ALGORITHM_URL", "https://user:password@example.test"),
])
def test_invalid_configuration_fails_startup(configuration, monkeypatch, name, value):
    monkeypatch.setenv(name, value)
    with pytest.raises(ValueError), TestClient(app):
        pass

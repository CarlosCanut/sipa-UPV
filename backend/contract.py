"""Versioned integration boundary. Names and contact information never enter the solver."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Weights(Model):
    preference: float = Field(default=0.5, ge=0, le=1)
    competency: float = Field(default=0.3, ge=0, le=1)
    distance: float = Field(default=0.2, ge=0, le=1)
    development: float = Field(default=0.1, ge=0, le=1)

    @model_validator(mode="after")
    def nonzero(self):
        if self.preference + self.competency + self.distance + self.development <= 0:
            raise ValueError("At least one weight must be positive")
        return self


class Params(Model):
    weights: Weights = Field(default_factory=Weights)
    maxDistanceKm: float = Field(default=40, gt=0, le=1000)
    assignTutors: bool = True
    timeLimitSec: int = Field(default=300, ge=1, le=3600)
    seed: int = Field(default=1, ge=0, le=2147483647)
    tutorTravelWeight: float = Field(default=0.5, ge=0, le=1)


class Location(Model):
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)

    @model_validator(mode="after")
    def coordinate_pair(self):
        if (self.lat is None) != (self.lng is None):
            raise ValueError("Coordinates must be supplied together")
        return self


class Competency(Model):
    level: int = Field(ge=1, le=5)
    wantsToDevelop: bool = False


class Student(Location):
    id: str = Field(min_length=1)
    maxDistanceKm: float | None = Field(default=None, gt=0, le=1000)
    priority: bool = False
    preferences: list[str] = Field(default_factory=list)
    competencies: dict[str, Competency] = Field(default_factory=dict)


class Placement(Location):
    id: str = Field(min_length=1)
    companyId: str = Field(min_length=1)
    seats: int = Field(ge=0)
    requirements: dict[str, int] = Field(default_factory=dict)
    dependsOn: str | None = None

    @model_validator(mode="after")
    def levels(self):
        if any(level < 1 or level > 5 for level in self.requirements.values()):
            raise ValueError("Requirement levels must be between 1 and 5")
        return self


class Tutor(Location):
    id: str = Field(min_length=1)
    capacity: int = Field(ge=0)


class SolveRequest(Model):
    simulationId: str = Field(min_length=1)
    algorithm: str = "placeholder"
    params: Params = Field(default_factory=Params)
    students: list[Student]
    placements: list[Placement]
    tutors: list[Tutor] = Field(default_factory=list)

    @model_validator(mode="after")
    def identifiers(self):
        for collection in (self.students, self.placements, self.tutors):
            if len({item.id for item in collection}) != len(collection):
                raise ValueError("Duplicate identifiers")
        placement_ids = {item.id for item in self.placements}
        for student in self.students:
            if len(set(student.preferences)) != len(student.preferences):
                raise ValueError("Duplicate preferences")
            if not set(student.preferences) <= placement_ids:
                raise ValueError("Unknown preferred placement")
        for placement in self.placements:
            if placement.dependsOn is not None and placement.dependsOn not in placement_ids:
                raise ValueError("Unknown placement dependency")
        dependencies = {p.id: p.dependsOn for p in self.placements}
        for placement in self.placements:
            seen = set()
            current = placement.id
            while current is not None:
                if current in seen:
                    raise ValueError("Cyclic placement dependency")
                seen.add(current)
                current = dependencies[current]
        return self


class Assignment(Model):
    studentId: str
    placementId: str
    tutorId: str | None = None
    score: float = Field(ge=0, le=1)
    distanceKm: float = Field(ge=0)


class AlgorithmResult(Model):
    status: Literal["optimal", "feasible", "infeasible", "timeout"]
    assignments: list[Assignment]
    log: str = Field(default="", max_length=20000)


class Metrics(Model):
    firstChoicePct: float
    avgPreferenceRank: float
    totalKm: float
    avgKm: float
    unassignedCount: int
    priorityAssignedPct: float
    tutorLoadStdDev: float


class SolveResponse(AlgorithmResult):
    unassigned: list[str]
    metrics: Metrics

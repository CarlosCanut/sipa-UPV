"""Deterministic greedy baseline, deliberately not an optimisation guarantee."""
import random
import time

from contract import AlgorithmResult, Assignment, Placement, SolveRequest, Student
from geo import haversine_km


def score(student: Student, placement: Placement, distance: float, instance: SolveRequest) -> float:
    preferences = student.preferences
    preference = (1 - preferences.index(placement.id) / len(preferences)) if placement.id in preferences else 0
    fits = []
    for key, required in placement.requirements.items():
        skill = student.competencies.get(key)
        fits.append(min(1, skill.level / required) if skill else 0)
    competency = sum(fits) / len(fits) if fits else 1
    limit = min(student.maxDistanceKm or instance.params.maxDistanceKm, instance.params.maxDistanceKm)
    proximity = max(0, 1 - distance / limit)
    weights = instance.params.weights
    total = weights.preference + weights.competency + weights.distance
    return (weights.preference * preference + weights.competency * competency + weights.distance * proximity) / total


def solve(instance: SolveRequest) -> AlgorithmResult:
    deadline = time.monotonic() + instance.params.timeLimitSec
    rng = random.Random(instance.params.seed)
    options: dict[str, list[tuple[Placement, float]]] = {}
    for student in instance.students:
        options[student.id] = []
        if student.lat is None or student.lng is None:
            continue
        for placement in instance.placements:
            if placement.lat is None or placement.lng is None or placement.seats == 0:
                continue
            distance = haversine_km(student.lat, student.lng, placement.lat, placement.lng)
            limit = min(student.maxDistanceKm or instance.params.maxDistanceKm, instance.params.maxDistanceKm)
            if distance <= limit:
                options[student.id].append((placement, distance))
    students = sorted(instance.students, key=lambda student: student.id)
    rng.shuffle(students)
    students.sort(key=lambda student: (not student.priority, len(options[student.id])))
    seats = {placement.id: placement.seats for placement in instance.placements}
    capacity = {tutor.id: tutor.capacity for tutor in instance.tutors}
    assignments = []
    timed_out = False
    for student in students:
        if time.monotonic() >= deadline:
            timed_out = True
            break
        candidates = [(p, km) for p, km in options[student.id] if seats[p.id] > 0]
        if not candidates:
            continue
        tutor_id = None
        if instance.params.assignTutors:
            tutors = [t for t in instance.tutors if capacity[t.id] > 0 and t.lat is not None and t.lng is not None]
            if not tutors:
                continue
            tutor = min(tutors, key=lambda t: (haversine_km(student.lat, student.lng, t.lat, t.lng), t.id))
            tutor_id = tutor.id
        placement, distance = max(candidates, key=lambda item: (score(student, item[0], item[1], instance), item[0].id))
        seats[placement.id] -= 1
        if tutor_id:
            capacity[tutor_id] -= 1
        assignments.append(Assignment(studentId=student.id, placementId=placement.id, tutorId=tutor_id,
                                      score=round(score(student, placement, distance, instance), 6), distanceKm=distance))
    return AlgorithmResult(
        status="timeout" if timed_out else "feasible" if assignments or not students else "infeasible",
        assignments=assignments,
        log="Greedy baseline; no optimality guarantee. Missing coordinates are ineligible. "
            "Competencies are soft scores. wantsToDevelop and dependsOn are reserved for research algorithms.",
    )

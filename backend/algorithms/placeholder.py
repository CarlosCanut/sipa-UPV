"""Capacity-aware greedy demonstration; no optimality or research-validation claim."""
import random
import time
from collections import Counter

from contract import AlgorithmResult, Assignment, Placement, SolveRequest, Student
from geo import haversine_km


def score(student: Student, placement: Placement, distance: float, instance: SolveRequest) -> float:
    preferences = student.preferences
    preference = (1 - preferences.index(placement.id) / len(preferences)) if placement.id in preferences else 0
    fits, interests = [], []
    for key, required in placement.requirements.items():
        skill = student.competencies.get(key)
        fits.append(min(1, skill.level / required) if skill else 0)
        interests.append(float(bool(skill and skill.wantsToDevelop)))
    competency = sum(fits) / len(fits) if fits else 1
    development = sum(interests) / len(interests) if interests else 0
    limit = min(student.maxDistanceKm or instance.params.maxDistanceKm, instance.params.maxDistanceKm)
    proximity = max(0, 1 - distance / limit)
    weights = instance.params.weights
    total = weights.preference + weights.competency + weights.distance + weights.development
    return (weights.preference * preference + weights.competency * competency + weights.distance * proximity
            + weights.development * development) / total


def solve(instance: SolveRequest) -> AlgorithmResult:
    deadline = time.monotonic() + instance.params.timeLimitSec
    rng = random.Random(instance.params.seed)
    options: dict[str, list[tuple[Placement, float]]] = {}
    for student in instance.students:
        options[student.id] = []
        if student.lat is None or student.lng is None:
            continue
        for placement in instance.placements:
            if time.monotonic() >= deadline:
                return AlgorithmResult(status="timeout", assignments=[], log="Time limit reached during candidate preparation.")
            if placement.lat is None or placement.lng is None or placement.seats == 0:
                continue
            distance = haversine_km(student.lat, student.lng, placement.lat, placement.lng)
            limit = min(student.maxDistanceKm or instance.params.maxDistanceKm, instance.params.maxDistanceKm)
            if distance <= limit:
                options[student.id].append((placement, distance))
    students = sorted(instance.students, key=lambda student: student.id)
    rng.shuffle(students)
    students.sort(key=lambda student: (not student.priority, len(options[student.id])))
    placed, tutor_load = Counter(), Counter()
    visits = set()
    assignments, assigned = [], set()
    timed_out = False
    # A later assignment can unlock a prerequisite for a previously skipped student.
    while True:
        before = len(assignments)
        for student in students:
            if time.monotonic() >= deadline:
                timed_out = True
                break
            if student.id in assigned:
                continue
            candidates = [(p, km) for p, km in options[student.id]
                          if placed[p.id] < p.seats and (not p.dependsOn or placed[p.dependsOn] > 0)]
            if not candidates:
                continue
            placement, distance = max(candidates, key=lambda item: (score(student, item[0], item[1], instance), item[0].id))
            tutor_id = None
            if instance.params.assignTutors:
                tutors = [t for t in instance.tutors if tutor_load[t.id] < t.capacity and t.lat is not None and t.lng is not None]
                if not tutors:
                    continue
                weight = instance.params.tutorTravelWeight
                def tutor_cost(tutor):
                    # Reuse a visit to the same centre; otherwise estimate the new trip.
                    km = 0 if (tutor.id, placement.id) in visits else haversine_km(tutor.lat, tutor.lng, placement.lat, placement.lng)
                    return (weight * km / instance.params.maxDistanceKm + (1 - weight) * tutor_load[tutor.id] / tutor.capacity, tutor.id)
                tutor_id = min(tutors, key=tutor_cost).id
                tutor_load[tutor_id] += 1
                visits.add((tutor_id, placement.id))
            placed[placement.id] += 1
            assigned.add(student.id)
            assignments.append(Assignment(studentId=student.id, placementId=placement.id, tutorId=tutor_id,
                                          score=round(score(student, placement, distance, instance), 6), distanceKm=distance))
        if timed_out or len(assignments) == before:
            break
    return AlgorithmResult(
        status="timeout" if timed_out else "feasible" if assignments or not students else "infeasible",
        assignments=assignments,
        log="Demonstration greedy baseline, not the validated research model. Priority students first; competencies and "
            "development interests are soft scores. A dependent offer needs at least one assigned prerequisite seat. "
            "Tutor choice balances utilization and additional tutor-to-workplace travel. No optimality guarantee.",
    )

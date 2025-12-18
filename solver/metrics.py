"""Validate plugin results and compute comparable metrics outside algorithms."""
from collections import Counter
from math import isclose
from statistics import mean, pstdev

from contract import AlgorithmResult, Metrics, SolveRequest, SolveResponse
from geo import haversine_km


def complete(instance: SolveRequest, result: AlgorithmResult) -> SolveResponse:
    students = {student.id: student for student in instance.students}
    placements = {placement.id: placement for placement in instance.placements}
    tutors = {tutor.id: tutor for tutor in instance.tutors}
    seen: set[str] = set()
    placement_load: Counter = Counter()
    tutor_load: Counter = Counter()
    ranks = []
    distances = []
    for row in result.assignments:
        if row.studentId not in students or row.studentId in seen or row.placementId not in placements:
            raise ValueError("Invalid or duplicate assignment")
        student, placement = students[row.studentId], placements[row.placementId]
        if None in (student.lat, student.lng, placement.lat, placement.lng):
            raise ValueError("Assigned locations require coordinates")
        km = haversine_km(student.lat, student.lng, placement.lat, placement.lng)
        limit = min(student.maxDistanceKm or instance.params.maxDistanceKm, instance.params.maxDistanceKm)
        if km > limit + 1e-6 or not isclose(row.distanceKm, km, abs_tol=0.01):
            raise ValueError("Invalid assignment distance")
        if instance.params.assignTutors and row.tutorId is None:
            raise ValueError("Missing required tutor")
        if not instance.params.assignTutors and row.tutorId is not None:
            raise ValueError("Unexpected tutor")
        if row.tutorId is not None:
            if row.tutorId not in tutors:
                raise ValueError("Unknown tutor")
            tutor_load[row.tutorId] += 1
            if tutor_load[row.tutorId] > tutors[row.tutorId].capacity:
                raise ValueError("Tutor capacity exceeded")
        placement_load[row.placementId] += 1
        if placement_load[row.placementId] > placement.seats:
            raise ValueError("Placement capacity exceeded")
        seen.add(row.studentId)
        distances.append(km)
        if placement.id in student.preferences:
            ranks.append(student.preferences.index(placement.id) + 1)
    priority = [student.id for student in instance.students if student.priority]
    total = len(seen)
    metrics = Metrics(
        firstChoicePct=round(100 * ranks.count(1) / total, 2) if total else 0,
        avgPreferenceRank=round(mean(ranks), 2) if ranks else 0,
        totalKm=round(sum(distances), 2),
        avgKm=round(mean(distances), 2) if distances else 0,
        unassignedCount=len(students) - total,
        priorityAssignedPct=round(100 * len(set(priority) & seen) / len(priority), 2) if priority else 0,
        tutorLoadStdDev=round(pstdev([tutor_load[t.id] for t in instance.tutors]), 2) if instance.tutors else 0,
    )
    return SolveResponse(**result.model_dump(), unassigned=[s.id for s in instance.students if s.id not in seen], metrics=metrics)

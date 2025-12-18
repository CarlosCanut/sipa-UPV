import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultParams, type SolveInstance } from "../src/lib/schemas";
import { validateResult } from "../src/lib/solver-validation";
const input: SolveInstance = {
  simulationId: "test",
  algorithm: "placeholder",
  params: defaultParams,
  students: ["s1", "s2"].map((id) => ({
    id,
    lat: 39.48,
    lng: -0.34,
    maxDistanceKm: null,
    priority: false,
    preferences: ["p1"],
    competencies: {},
  })),
  placements: [
    {
      id: "p1",
      companyId: "e1",
      lat: 39.47,
      lng: -0.38,
      seats: 1,
      requirements: {},
      dependsOn: null,
    },
  ],
  tutors: [{ id: "t1", lat: 39.48, lng: -0.35, capacity: 1 }],
};
function result() {
  return {
    status: "feasible",
    assignments: [
      {
        studentId: "s1",
        placementId: "p1",
        tutorId: "t1",
        score: 0.8,
        distanceKm: 3.6,
      },
    ],
    unassigned: ["s2"],
    metrics: {
      firstChoicePct: 100,
      avgPreferenceRank: 1,
      totalKm: 3.6,
      avgKm: 3.6,
      unassignedCount: 1,
      priorityAssignedPct: 0,
      tutorLoadStdDev: 0,
    },
    log: "test",
  };
}
test("valid partial result covers every student", () =>
  assert.equal(validateResult(input, result()).unassigned.length, 1));
test("missing, duplicate or foreign student fails", () => {
  for (const unassigned of [[], ["s1"], ["unknown"]])
    assert.throws(() => validateResult(input, { ...result(), unassigned }));
});
test("unknown placement and overcapacity fail before persistence", () => {
  const unknown = result();
  unknown.assignments[0].placementId = "foreign";
  assert.throws(() => validateResult(input, unknown));
  const over = result();
  over.assignments.push({ ...over.assignments[0], studentId: "s2" });
  over.unassigned = [];
  assert.throws(() => validateResult(input, over));
});
test("a required tutor and travel limit are enforced", () => {
  const tooFar = result();
  tooFar.assignments[0].distanceKm = 41;
  assert.throws(() => validateResult(input, tooFar));
  assert.throws(() =>
    validateResult(input, {
      ...result(),
      assignments: [{ ...result().assignments[0], tutorId: null }],
    }),
  );
});
test("nonfinite scores and inconsistent metric counts fail", () => {
  const invalid = result();
  invalid.assignments[0].score = NaN;
  assert.throws(() => validateResult(input, invalid));
  const wrongCount = result();
  wrongCount.metrics.unassignedCount = 0;
  assert.throws(() => validateResult(input, wrongCount));
});

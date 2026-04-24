import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePlacementGraph } from "../src/lib/placement-dependencies";
import { pilotSchema } from "../src/lib/editor-schemas";
import { defaultParams, paramsSchema } from "../src/lib/schemas";

const offers = [
  { id: "p1", companyId: "c1", active: true, seats: 1, dependsOnId: null },
  { id: "p2", companyId: "c1", active: true, seats: 1, dependsOnId: "p1" },
];
test("offer dependencies reject cycles, other companies and unavailable prerequisites", () => {
  assert.doesNotThrow(() => validatePlacementGraph(offers));
  for (const change of [
    { dependsOnId: "p2" },
    { companyId: "c2" },
    { active: false },
    { seats: 0 },
  ]) {
    assert.throws(() =>
      validatePlacementGraph([{ ...offers[0], ...change }, offers[1]]),
    );
  }
  assert.throws(() =>
    validatePlacementGraph([{ ...offers[0], dependsOnId: "unknown" }]),
  );
  assert.doesNotThrow(() =>
    validatePlacementGraph(
      offers.map((offer) => ({ ...offer, active: false })),
    ),
  );
});
test("old snapshots get new optional objective defaults and all-zero weights fail", () => {
  const { tutorTravelWeight, ...old } = defaultParams;
  const { development, ...weights } = old.weights;
  const migrated = paramsSchema.parse({ ...old, weights });
  assert.equal(migrated.tutorTravelWeight, tutorTravelWeight);
  assert.equal(migrated.weights.development, development);
  assert.equal(
    paramsSchema.safeParse({
      ...defaultParams,
      weights: { preference: 0, competency: 0, distance: 0, development: 0 },
    }).success,
    false,
  );
});
test("pilot timings are optional, finite and nonnegative", () => {
  const response = {
    usability: 4,
    usefulness: 5,
    satisfaction: 4,
    barriers: "",
  };
  assert.equal(pilotSchema.safeParse(response).success, true);
  assert.equal(
    pilotSchema.safeParse({
      ...response,
      decisionMinutes: 12,
      previousMethodMinutes: 25,
    }).success,
    true,
  );
  for (const decisionMinutes of [-1, Infinity, 10081])
    assert.equal(
      pilotSchema.safeParse({ ...response, decisionMinutes }).success,
      false,
    );
});

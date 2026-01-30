import { test } from "node:test";
import assert from "node:assert/strict";
import { parseImport, toCsv, csvColumns } from "../src/lib/csv";
import {
  preferencesSchema,
  profileSchema,
  feedbackSchema,
} from "../src/lib/editor-schemas";
import { assignmentScope } from "../src/lib/assignment-scope";
import { evaluateScenario } from "../src/lib/evaluation";
import { defaultParams } from "../src/lib/schemas";

const student = {
  email: "student@example.org",
  name: "Test Student",
  program: "Software",
  address: "Valencia",
  lat: 39.47,
  lng: -0.37,
  maxDistanceKm: null,
  priority: false,
};
test("CSV round trip preserves coordinates, quoted text and optional distance", () => {
  const csv = toCsv(
    [{ ...student, name: 'Student, "Name"' }],
    csvColumns.estudiantes,
  );
  const parsed = parseImport("estudiantes", csv);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.rows[0].kind, "estudiantes");
  if (parsed.rows[0].kind !== "estudiantes") throw Error("Wrong row kind");
  assert.equal(parsed.rows[0].data.lng, -0.37);
  assert.equal(parsed.rows[0].data.maxDistanceKm, null);
  assert.equal(parsed.rows[0].data.name, 'Student, "Name"');
});
test("CSV preview identifies malformed rows, duplicate actors and mismatched locations", () => {
  const csv = toCsv(
    [student, student, { ...student, email: "second@example.org", lat: null }],
    csvColumns.estudiantes,
  );
  assert.deepEqual(
    parseImport("estudiantes", csv).errors.map((e) => e.row),
    [3, 4],
  );
  assert.ok(parseImport("estudiantes", "email,name\nbad,Name").errors.length);
  assert.ok(parseImport("estudiantes", "x".repeat(500001)).errors.length);
});
test("CSV rejects invalid booleans, levels, nonfinite and missing capacities", () => {
  assert.ok(
    parseImport(
      "estudiantes",
      toCsv([{ ...student, priority: "yes" }], csvColumns.estudiantes),
    ).errors.length,
  );
  const placement = {
    id: "",
    title: "Placement",
    companyId: "c1",
    description: "",
    seats: 2,
    address: "",
    lat: 39.47,
    lng: -0.37,
    competencyFormId: "f1",
    active: true,
    requirements: '{"skill":6}',
  };
  assert.ok(
    parseImport("plazas", toCsv([placement], csvColumns.plazas)).errors.length,
  );
  assert.ok(
    parseImport(
      "plazas",
      toCsv(
        [{ ...placement, requirements: "{}", seats: "" }],
        csvColumns.plazas,
      ),
    ).errors.length,
  );
  assert.ok(
    parseImport(
      "estudiantes",
      toCsv([{ ...student, lat: "Infinity" }], csvColumns.estudiantes),
    ).errors.length,
  );
});
test("exports neutralize spreadsheet formulas and still produce empty headers", () => {
  assert.match(toCsv([{ comment: '=HYPERLINK("bad")' }]), /'=HYPERLINK/);
  assert.equal(toCsv([], ["email", "name"]), "\uFEFFemail,name\r\n");
});
test("shared form validation rejects duplicate preferences and invalid feedback", () => {
  assert.equal(
    preferencesSchema.safeParse({
      placementIds: ["p1", "p1"],
      competencies: {},
    }).success,
    false,
  );
  assert.equal(
    feedbackSchema.safeParse({ assignmentId: "a", rating: 0, comment: "" })
      .success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({
      ...student,
      department: "",
      maxStudents: 8,
      lat: null,
    }).success,
    false,
  );
});
test("each participant's assignment scope is restricted, including an unlinked company", () => {
  assert.deepEqual(
    assignmentScope({ id: "s", role: "STUDENT", companyId: null }),
    { student: { userId: "s" } },
  );
  assert.deepEqual(
    assignmentScope({ id: "t", role: "TUTOR", companyId: null }),
    { tutor: { userId: "t" } },
  );
  assert.deepEqual(
    assignmentScope({ id: "u", role: "COMPANY", companyId: "c" }),
    { placement: { companyId: "c" } },
  );
  assert.deepEqual(
    assignmentScope({ id: "u", role: "COMPANY", companyId: null }),
    { id: "" },
  );
});
test("pilot travel counts each tutor/centre visit once and distinguishes absent priority groups", () => {
  const input = {
    simulationId: "s",
    algorithm: "placeholder",
    params: defaultParams,
    students: ["s1", "s2"].map((id) => ({
      id,
      lat: 0,
      lng: 0,
      maxDistanceKm: null,
      priority: false,
      preferences: [],
      competencies: {},
    })),
    placements: [
      {
        id: "p",
        companyId: "c",
        lat: 0,
        lng: 1,
        seats: 2,
        requirements: {},
        dependsOn: null,
      },
    ],
    tutors: [{ id: "t", lat: 0, lng: 0, capacity: 2 }],
  };
  const rows = ["s1", "s2"].map((studentId) => ({
    studentId,
    placementId: "p",
    tutorId: "t",
  }));
  const evaluation = evaluateScenario(input, rows)!;
  assert.ok(Math.abs(evaluation.tutorVisitKm! - 111.195) < 0.01);
  assert.equal(evaluation.priorityAssignedPct, null);
  assert.equal(evaluation.otherAssignedPct, 100);
  assert.equal(evaluateScenario({}, rows), null);
});

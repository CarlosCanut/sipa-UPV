import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../src/generated/prisma/client";
import { buildInstance } from "../src/lib/instance";
import { defaultParams, paramsSchema } from "../src/lib/schemas";
import { validateResult } from "../src/lib/solver-validation";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function seedAccount(
  id: string,
  email: string,
  name: string,
  role: Role,
  password: string,
  companyId?: string,
) {
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: { id, email, name, role, companyId },
  });
  if (user.role !== role || (companyId && user.companyId !== companyId))
    throw new Error(
      `Seed account ${email} already belongs to another role/company`,
    );
  const credential = await db.account.findUnique({
    where: {
      providerId_accountId: { providerId: "credential", accountId: user.id },
    },
  });
  if (!credential)
    await db.account.create({
      data: {
        id: `credential-${user.id}`,
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: await hashPassword(password),
      },
    });
  return user;
}

async function seedResults(adminId: string) {
  if (
    process.env.SEED_DEMO_RESULTS === "false" ||
    (await db.simulation.count())
  )
    return;
  const url = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!url || !process.env.BACKEND_TOKEN)
    throw new Error(
      "Set BACKEND_URL and BACKEND_TOKEN to seed demo results, or SEED_DEMO_RESULTS=false",
    );
  const headers = {
    Authorization: `Bearer ${process.env.BACKEND_TOKEN}`,
    "Content-Type": "application/json",
  };
  const available = await fetch(`${url}/algorithms`, {
    headers,
    signal: AbortSignal.timeout(10000),
  });
  if (!available.ok)
    throw new Error("Backend unavailable for demo simulations");
  const algorithms = (await available.json()) as { key: string }[];
  if (!algorithms[0]?.key)
    throw new Error("No algorithm enabled for demo simulations");
  const scenarios = await Promise.all(
    [
      "Demostración · Equilibrio de preferencias",
      "Demostración · Proximidad",
    ].map(async (name, index) => {
      const id = `seed-simulation-${index + 1}`;
      const params = paramsSchema.parse({
        ...defaultParams,
        timeLimitSec: 30,
        maxDistanceKm: index ? 3 : 40,
      });
      const input = await buildInstance(db, id, algorithms[0].key, params);
      const started = new Date();
      const result = await fetch(`${url}/solve`, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(60000),
      });
      if (!result.ok)
        throw new Error(`Demo simulation failed (${result.status})`);
      const output = validateResult(input, await result.json());
      return { id, name, index, input, params, started, output };
    }),
  );
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(740112)`;
    if (await tx.simulation.count()) return;
    for (const {
      id,
      name,
      index,
      input,
      params,
      started,
      output,
    } of scenarios) {
      await tx.simulation.create({
        data: {
          id,
          name,
          algorithm: input.algorithm,
          params,
          input,
          metrics: {
            ...output.metrics,
            solverStatus: output.status,
            log: output.log,
          },
          createdById: adminId,
          createdAt: started,
          finishedAt: new Date(),
          status: "COMPLETED",
          publishedAt: index === 0 ? new Date() : null,
          parentId: index ? "seed-simulation-1" : null,
        },
      });
      await tx.assignment.createMany({
        data: [
          ...output.assignments.map((a) => ({ ...a, simulationId: id })),
          ...output.unassigned.map((studentId) => ({
            simulationId: id,
            studentId,
          })),
        ],
      });
    }
    const first = await tx.assignment.findFirst({
      where: {
        simulationId: "seed-simulation-1",
        studentId: "s1",
        placementId: { not: null },
      },
      include: {
        student: true,
        tutor: true,
        placement: { include: { company: { include: { users: true } } } },
      },
    });
    if (first) {
      const users = [
        first.student.userId,
        first.tutor?.userId,
        first.placement?.company.users[0]?.id,
      ].filter((id): id is string => Boolean(id));
      await tx.assignmentFeedback.createMany({
        data: users.map((userId) => ({
          assignmentId: first.id,
          userId,
          rating: 4,
          comment:
            "Ejemplo de demostración: la propuesta encaja con el perfil y la ubicación.",
        })),
      });
    }
    const users = await tx.user.findMany();
    await tx.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        type: "ASSIGNMENT_PUBLISHED",
        title: "La propuesta de demostración ya está disponible.",
        href:
          user.role === "ADMIN"
            ? "/simulaciones/seed-simulation-1"
            : user.role === "STUDENT"
              ? "/mi-asignacion"
              : user.role === "TUTOR"
                ? "/mis-estudiantes"
                : "/asignados",
      })),
    });
    for (const role of ["ADMIN", "STUDENT", "COMPANY", "TUTOR"] as const) {
      const user = users.find((user) => user.role === role);
      if (user)
        await tx.pilotResponse.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            usability: 4,
            usefulness: 5,
            satisfaction: 4,
            barriers:
              "Respuesta de demostración; no procede de un piloto real.",
            decisionMinutes: 12,
            previousMethodMinutes: 25,
          },
        });
    }
  });
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12+ characters).",
    );
  const admin = await seedAccount(
    "admin",
    email.toLowerCase(),
    "Ana García · Coordinación",
    "ADMIN",
    password,
  );
  if (process.env.SEED_DEMO_DATA !== "true") return;
  const demoPassword = process.env.SEED_DEMO_PASSWORD;
  if (!demoPassword || demoPassword.length < 12)
    throw new Error("Set SEED_DEMO_PASSWORD (12+ characters).");
  const competencies = [
    "Programación",
    "Análisis de datos",
    "Sistemas",
    "Comunicación",
    "Trabajo en equipo",
    "Autonomía",
  ];
  for (const [i, name] of competencies.entries())
    await db.competency.upsert({
      where: { id: `c${i + 1}` },
      update: {},
      create: { id: `c${i + 1}`, name },
    });
  for (const [i, name] of ["Técnico", "Transversal"].entries())
    await db.competencyForm.upsert({
      where: { id: `f${i + 1}` },
      update: {},
      create: {
        id: `f${i + 1}`,
        name,
        items: {
          create: Array.from({ length: 3 }, (_, j) => ({
            competencyId: `c${i * 3 + j + 1}`,
            position: j,
          })),
        },
      },
    });
  const companies = [
    "Nébula Digital",
    "Llevant Sistemas",
    "Turia Data",
    "Mediterrània Studio",
    "Albufera Tecnología",
  ];
  const contacts = [
    "Paula Serrano",
    "Sergio Ibáñez",
    "Marta Cervera",
    "Víctor Bosch",
    "Isabel Pons",
  ];
  for (const [i, name] of companies.entries()) {
    await db.company.upsert({
      where: { id: `e${i + 1}` },
      update: {},
      create: { id: `e${i + 1}`, name, taxId: `DEMO-B000000${i + 1}` },
    });
    await seedAccount(
      i === 0 ? "company-demo" : `company-${i + 1}`,
      i === 0 ? "empresa@sipa.local" : `empresa${i + 1}@sipa.local`,
      contacts[i],
      "COMPANY",
      demoPassword,
      `e${i + 1}`,
    );
  }
  const titles = [
    "Desarrollo web",
    "Análisis de datos",
    "Soporte de sistemas",
    "Diseño de producto",
    "Automatización",
    "Aplicaciones móviles",
  ];
  for (let i = 0; i < 12; i++)
    await db.placement.upsert({
      where: { id: `p${i + 1}` },
      update: {},
      create: {
        id: `p${i + 1}`,
        companyId: `e${(i % 5) + 1}`,
        title: titles[i % titles.length],
        program: i % 3 === 0 ? "DAW / DAM" : null,
        seats: 3,
        description: `Prácticas en ${titles[i % titles.length].toLowerCase()} con acompañamiento del equipo. Participarás en un proyecto, revisiones semanales y una presentación final.`,
        address: [
          "València · Benimaclet",
          "València · Camins al Grau",
          "València · Algirós",
          "València · Quatre Carreres",
        ][i % 4],
        lat: 39.455 + (i % 4) * 0.008,
        lng: -0.39 + (i % 5) * 0.009,
        competencyFormId: `f${(i % 2) + 1}`,
        dependsOnId: i === 5 ? "p1" : null,
        requirements: {
          create: Array.from({ length: 3 }, (_, j) => ({
            competencyId: `c${(i % 2) * 3 + j + 1}`,
            level: 2 + ((i + j) % 3),
          })),
        },
      },
    });
  const names = [
    "Lucía Martínez",
    "Pablo Torres",
    "Sara Vidal",
    "Marc Ferrer",
    "Ana Soler",
    "Hugo Navarro",
    "Carla Rubio",
    "Leo García",
    "Nuria Costa",
    "David Romero",
    "Julia Ribes",
    "Adrián Molina",
    "Aitana Pérez",
    "Diego Campos",
    "Laia Esteve",
    "Bruno Ortiz",
    "Clara Gil",
    "Eric Sanchis",
    "Irene Moya",
    "Javier Ferrando",
    "Marina Roca",
    "Álvaro Segura",
    "Lara Belda",
    "Daniel Vives",
    "Elena Mas",
    "Álex Cerdá",
    "Sofía Lloret",
    "Raúl Solano",
    "Eva Miralles",
    "Iván Alcaraz",
  ];
  for (let i = 0; i < 30; i++) {
    const user = await seedAccount(
      `student-${i + 1}`,
      i === 0 ? "estudiante@sipa.local" : `estudiante${i + 1}@sipa.local`,
      names[i],
      "STUDENT",
      demoPassword,
    );
    await db.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        id: `s${i + 1}`,
        userId: user.id,
        address: ["València", "Alboraia", "Mislata", "Burjassot", "Paterna"][
          i % 5
        ],
        program: ["DAW", "DAM", "ASIR"][i % 3],
        lat: 39.45 + (i % 6) * 0.009,
        lng: -0.4 + (i % 5) * 0.012,
        priority: i < 5,
        competencies: {
          create: Array.from({ length: 6 }, (_, j) => ({
            competencyId: `c${j + 1}`,
            level: 1 + ((i + j) % 5),
            wantsToDevelop: j % 2 === 0,
          })),
        },
        preferences: {
          create: Array.from({ length: 4 }, (_, j) => ({
            placementId: `p${((i + j) % 12) + 1}`,
            rank: j + 1,
          })),
        },
      },
    });
  }
  for (const [i, name] of [
    "Carmen López",
    "Vicent Roig",
    "Ana Beltrán",
    "Miguel Sáez",
    "Elena Pastor",
    "Joan Martí",
  ].entries()) {
    const user = await seedAccount(
      `tutor-${i + 1}`,
      i === 0 ? "tutor@sipa.local" : `tutor${i + 1}@sipa.local`,
      name,
      "TUTOR",
      demoPassword,
    );
    await db.tutor.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        id: `t${i + 1}`,
        userId: user.id,
        department: "Informática",
        address: "Campus de Vera, València",
        lat: 39.45 + i * 0.009,
        lng: -0.4 + (i % 5) * 0.012,
        maxStudents: 8,
      },
    });
  }
  await seedResults(admin.id);
  console.info(
    "Demo ready: 42 sign-in accounts, 30 students, 12 offers, 5 companies and 6 tutors. Existing passwords, preferences and publications preserved.",
  );
}
main().finally(() => db.$disconnect());

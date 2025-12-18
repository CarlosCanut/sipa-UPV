import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function seedAccount(
  id: string,
  email: string,
  name: string,
  role: Role,
  password?: string,
  companyId?: string,
) {
  const hash = password ? await hashPassword(password) : undefined;
  return db.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: {},
      create: { id, email, name, role, companyId },
    });
    if (hash)
      await tx.account.upsert({
        where: { id: `credential-${user.id}` },
        update: {},
        create: {
          id: `credential-${user.id}`,
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hash,
        },
      });
    return user;
  });
}
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12+ characters).",
    );
  await seedAccount(
    "admin",
    email.toLowerCase(),
    "Coordinación SIPA",
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
  for (const [i, name] of ["Técnico", "Transversal"].entries()) {
    const id = `f${i + 1}`;
    await db.competencyForm.upsert({
      where: { id },
      update: {},
      create: { id, name },
    });
    for (let j = 0; j < 3; j++) {
      const competencyId = `c${i * 3 + j + 1}`;
      await db.competencyFormItem.upsert({
        where: { formId_competencyId: { formId: id, competencyId } },
        update: {},
        create: { formId: id, competencyId, position: j },
      });
    }
  }
  const companies = [
    "Nébula Digital",
    "Llevant Sistemas",
    "Turia Data",
    "Mediterrània Studio",
    "Albufera Tecnología",
  ];
  for (const [i, name] of companies.entries())
    await db.company.upsert({
      where: { id: `e${i + 1}` },
      update: {},
      create: { id: `e${i + 1}`, name },
    });
  await seedAccount(
    "company-demo",
    "empresa@sipa.local",
    "Contacto Nébula",
    "COMPANY",
    demoPassword,
    "e1",
  );
  const titles = [
    "Desarrollo web",
    "Análisis de datos",
    "Soporte de sistemas",
    "Diseño de producto",
    "Automatización",
    "Aplicaciones móviles",
  ];
  for (let i = 0; i < 12; i++) {
    const id = `p${i + 1}`;
    await db.placement.upsert({
      where: { id },
      update: {},
      create: {
        id,
        companyId: `e${(i % 5) + 1}`,
        title: titles[i % titles.length],
        seats: 3,
        address: `València · sede ${i + 1}`,
        lat: 39.455 + (i % 4) * 0.008,
        lng: -0.39 + (i % 5) * 0.009,
        competencyFormId: `f${(i % 2) + 1}`,
      },
    });
    for (let j = 0; j < 3; j++) {
      const competencyId = `c${(i % 2) * 3 + j + 1}`;
      await db.placementRequirement.upsert({
        where: { placementId_competencyId: { placementId: id, competencyId } },
        update: {},
        create: { placementId: id, competencyId, level: 2 + ((i + j) % 3) },
      });
    }
  }
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
  ];
  for (let i = 0; i < 30; i++) {
    const id = `s${i + 1}`;
    const user = await seedAccount(
      `student-${i + 1}`,
      i === 0 ? "estudiante@sipa.local" : `estudiante${i + 1}@sipa.local`,
      `${names[i % 10]}${i >= 10 ? ` ${i + 1}` : ""}`,
      "STUDENT",
      i === 0 ? demoPassword : undefined,
    );
    await db.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        id,
        userId: user.id,
        address: `València · zona ${i + 1}`,
        program: ["DAW", "DAM", "ASIR"][i % 3],
        lat: 39.45 + (i % 6) * 0.009,
        lng: -0.4 + (i % 5) * 0.012,
        priority: i < 5,
      },
    });
    for (let j = 0; j < 6; j++) {
      const competencyId = `c${j + 1}`;
      await db.studentCompetency.upsert({
        where: { studentId_competencyId: { studentId: id, competencyId } },
        update: {},
        create: {
          studentId: id,
          competencyId,
          level: 1 + ((i + j) % 5),
          wantsToDevelop: j % 2 === 0,
        },
      });
    }
    for (let rank = 1; rank <= 4; rank++) {
      const placementId = `p${((i + rank - 1) % 12) + 1}`;
      await db.studentPreference.upsert({
        where: { studentId_placementId: { studentId: id, placementId } },
        update: {},
        create: { studentId: id, placementId, rank },
      });
    }
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
      i === 0 ? demoPassword : undefined,
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
  console.info(
    "Seed ready: 30 students, 12 placements, 5 companies, 6 tutors. Existing records preserved.",
  );
}
main().finally(() => db.$disconnect());

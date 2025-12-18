import "dotenv/config";
import { defineConfig } from "prisma/config";

// process.env (not env()) so `prisma generate` works in the Docker build
// stage, where no DATABASE_URL exists. migrate/seed get the real URL at runtime.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});

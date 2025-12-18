import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

function createAuth() {
  if (
    !process.env.APP_URL ||
    !process.env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET.length < 32
  ) {
    throw new Error(
      "Set APP_URL and a BETTER_AUTH_SECRET of at least 32 characters",
    );
  }
  return betterAuth({
    baseURL: process.env.APP_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(db, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
    },
    user: {
      additionalFields: {
        role: {
          type: ["ADMIN", "TUTOR", "STUDENT", "COMPANY"],
          input: false,
          defaultValue: "STUDENT",
          required: true,
        },
      },
    },
    plugins: [nextCookies()],
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
// Lazy configuration allows image builds without runtime secrets or a database.
export function getAuth() {
  return (instance ??= createAuth());
}

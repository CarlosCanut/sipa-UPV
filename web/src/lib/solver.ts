import "server-only";
import { Agent, fetch } from "undici";
import { db } from "@/lib/db";
import { buildInstance as buildInput } from "@/lib/instance";
import {
  paramsSchema,
  type SolveInstance,
  type SimulationParams,
} from "@/lib/schemas";
import { validateResult } from "@/lib/solver-validation";
import { z } from "zod";

function solverUrl(path: string) {
  if (!process.env.BACKEND_URL) throw new Error("Falta BACKEND_URL.");
  return `${process.env.BACKEND_URL.replace(/\/$/, "")}${path}`;
}
function authHeaders() {
  return process.env.BACKEND_TOKEN
    ? { Authorization: `Bearer ${process.env.BACKEND_TOKEN}` }
    : {};
}
export async function getAlgorithms() {
  const response = await fetch(solverUrl("/algorithms"), {
    headers: authHeaders(),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("No se pudo consultar el solver.");
  return z
    .array(
      z.object({
        key: z.string(),
        name: z.string(),
        defaultParams: paramsSchema,
      }),
    )
    .parse(await response.json());
}
export async function buildInstance(
  id: string,
  algorithm: string,
  params: SimulationParams,
) {
  return buildInput(db, id, algorithm, params);
}
export async function callSolver(input: SolveInstance) {
  const dispatcher = new Agent({ headersTimeout: 0, bodyTimeout: 0 });
  try {
    const response = await fetch(solverUrl("/solve"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(input),
      dispatcher,
      signal: AbortSignal.timeout((input.params.timeLimitSec + 60) * 1000),
    });
    if (!response.ok)
      throw new Error(`El solver devolvió un error (${response.status}).`);
    return validateResult(input, await response.json());
  } finally {
    await dispatcher.close();
  }
}

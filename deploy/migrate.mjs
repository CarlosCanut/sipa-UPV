import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cwd = fileURLToPath(new URL("../web/", import.meta.url));
for (const args of [
  ["../node_modules/prisma/build/index.js", "migrate", "deploy"],
  ...(process.env.SEED_DATABASE === "true"
    ? [["--import", "tsx", "prisma/seed.ts"]]
    : []),
]) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

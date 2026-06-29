/** Push local .env to Railway. Requires: railway login && railway link */
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(process.cwd());
const envPath = resolve(root, ".env");

if (!existsSync(envPath)) {
  console.error("Missing .env — copy from .env.example and fill in yours first.");
  process.exit(1);
}

const skipKeys = new Set(["PORT"]);

function buildRailwayEnv(): string {
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  const out: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (skipKeys.has(key) || !value) continue;

    out.push(`${key}=${value}`);
  }

  return out.join("\n");
}

const railwayEnv = buildRailwayEnv();

if (process.argv.includes("--print")) {
  console.log(railwayEnv);
  process.exit(0);
}

console.log("Pushing .env variables to Railway...\n");

const tmpPath = resolve(root, ".env.railway.tmp");
writeFileSync(tmpPath, `${railwayEnv}\n`, "utf8");

try {
  const result = spawnSync(
    "npx",
    ["@railway/cli", "variable", "import", "--file", tmpPath, "--yes"],
    { stdio: "inherit", shell: true, cwd: root },
  );

  if (result.status !== 0) {
    console.error("\nRailway import failed. Authenticate and link first:");
    console.error("  npx @railway/cli login");
    console.error("  npx @railway/cli link");
    console.error("  npm run railway:env");
    console.error("\nOr paste into Railway → Service → Variables → Raw Editor:");
    console.error("  npm run railway:env -- --print");
    process.exit(result.status ?? 1);
  }
} finally {
  if (existsSync(tmpPath)) unlinkSync(tmpPath);
}

console.log("\nVariables imported. Railway will redeploy automatically.");

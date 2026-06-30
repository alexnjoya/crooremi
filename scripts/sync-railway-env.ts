/**
 * Push .env.railway variables to linked Railway service.
 * Run: npm run railway:env
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const envPath = resolve(process.cwd(), ".env.railway");

function parseEnvFile(raw: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) vars[key] = value;
  }
  return vars;
}

function main(): void {
  let raw: string;
  try {
    raw = readFileSync(envPath, "utf8");
  } catch {
    console.error("Missing .env.railway — copy from .env.railway.example");
    process.exit(1);
  }

  const vars = parseEnvFile(raw);
  const keys = Object.keys(vars);
  console.log(`\nSyncing ${keys.length} variables to Railway (crooremi)…\n`);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    const value = vars[key]!;
    const skipDeploy = i < keys.length - 1 ? " --skip-deploys" : "";
    console.log(`  set ${key}`);
    execSync(
      `npx @railway/cli variable set ${key} --stdin${skipDeploy}`,
      {
        input: value,
        stdio: ["pipe", "inherit", "inherit"],
        cwd: process.cwd(),
      },
    );
  }

  console.log("\nRailway variables updated. Deploy triggered on last variable.\n");
}

main();

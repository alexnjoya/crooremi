import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StoredPolicy } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const POLICY_DIR = resolve(__dirname, "../../data/policies");

function policyFilePath(policyId: string): string {
  const safe = policyId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safe) {
    throw new Error("Invalid policyId");
  }
  return join(POLICY_DIR, `${safe}.json`);
}

async function ensurePolicyDir(): Promise<void> {
  if (!existsSync(POLICY_DIR)) {
    await mkdir(POLICY_DIR, { recursive: true });
  }
}

export async function savePolicy(delivery: StoredPolicy): Promise<void> {
  await ensurePolicyDir();
  await writeFile(
    policyFilePath(delivery.policyId),
    JSON.stringify(delivery, null, 2),
    "utf8",
  );
}

export async function loadPolicy(policyId: string): Promise<StoredPolicy | null> {
  const path = policyFilePath(policyId);
  if (!existsSync(path)) {
    return null;
  }
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as StoredPolicy;
}

export function toStoredPolicy(
  delivery: Omit<StoredPolicy, "createdAt">,
): StoredPolicy {
  return {
    ...delivery,
    createdAt: new Date().toISOString(),
  };
}

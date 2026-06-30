import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StoredPolicy } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** In-process fallback when disk is not writable (e.g. misconfigured deploy). */
const memoryStore = new Map<string, StoredPolicy>();

let policyDir: string | undefined;

function getPolicyDir(): string {
  if (policyDir) {
    return policyDir;
  }
  if (process.env.REMIFI_POLICY_DIR?.trim()) {
    policyDir = resolve(process.env.REMIFI_POLICY_DIR.trim());
    return policyDir;
  }
  policyDir = resolve(__dirname, "../../data/policies");
  return policyDir;
}

function policyFilePath(id: string, dir = getPolicyDir()): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safe) {
    throw new Error("Invalid policyId");
  }
  return join(dir, `${safe}.json`);
}

async function writeToDisk(delivery: StoredPolicy): Promise<boolean> {
  const dir = getPolicyDir();
  try {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(
      policyFilePath(delivery.policyId, dir),
      JSON.stringify(delivery, null, 2),
      "utf8",
    );
    return true;
  } catch (err) {
    const tmpDir = join(tmpdir(), "remifi-policies");
    try {
      if (!existsSync(tmpDir)) {
        await mkdir(tmpDir, { recursive: true });
      }
      policyDir = tmpDir;
      await writeFile(
        policyFilePath(delivery.policyId, tmpDir),
        JSON.stringify(delivery, null, 2),
        "utf8",
      );
      console.warn(
        "[remifi] policy store: using temp dir",
        tmpDir,
        "(set REMIFI_POLICY_DIR or fix data/ permissions for persistence)",
      );
      return true;
    } catch {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[remifi] policy disk save failed, in-memory only:", message);
      return false;
    }
  }
}

export async function savePolicy(delivery: StoredPolicy): Promise<void> {
  memoryStore.set(delivery.policyId, delivery);
  await writeToDisk(delivery);
}

export async function loadPolicy(policyId: string): Promise<StoredPolicy | null> {
  const cached = memoryStore.get(policyId);
  if (cached) {
    return cached;
  }

  const dirs = [
    getPolicyDir(),
    join(tmpdir(), "remifi-policies"),
    resolve(__dirname, "../../data/policies"),
  ];

  for (const dir of dirs) {
    const path = policyFilePath(policyId, dir);
    if (!existsSync(path)) {
      continue;
    }
    try {
      const raw = await readFile(path, "utf8");
      const parsed = JSON.parse(raw) as StoredPolicy;
      memoryStore.set(policyId, parsed);
      return parsed;
    } catch {
      // try next location
    }
  }

  return null;
}

export function toStoredPolicy(
  delivery: Omit<StoredPolicy, "createdAt">,
): StoredPolicy {
  return {
    ...delivery,
    createdAt: new Date().toISOString(),
  };
}

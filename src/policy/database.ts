import pg from "pg";
import { env } from "../config.js";
import type { StoredPolicy } from "./types.js";

const { Pool } = pg;

let pool: pg.Pool | undefined;
let ready = false;

export function isDatabaseEnabled(): boolean {
  return Boolean(env.DATABASE_URL?.trim());
}

export function isDatabaseReady(): boolean {
  return ready;
}

export async function initPolicyDatabase(): Promise<void> {
  const url = env.DATABASE_URL?.trim();
  if (!url) {
    console.log("[remifi] policy store: DATABASE_URL not set — using file/memory fallback");
    return;
  }

  pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 5,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS remifi_policies (
      policy_id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS remifi_policies_created_at_idx
    ON remifi_policies (created_at DESC)
  `);

  ready = true;
  console.log("[remifi] policy store: PostgreSQL ready");
}

export async function savePolicyToDatabase(delivery: StoredPolicy): Promise<void> {
  if (!ready || !pool) {
    return;
  }

  await pool.query(
    `INSERT INTO remifi_policies (policy_id, payload, created_at)
     VALUES ($1, $2::jsonb, $3::timestamptz)
     ON CONFLICT (policy_id) DO UPDATE
     SET payload = EXCLUDED.payload`,
    [delivery.policyId, JSON.stringify(delivery), delivery.createdAt],
  );
}

export async function loadPolicyFromDatabase(
  policyId: string,
): Promise<StoredPolicy | null> {
  if (!ready || !pool) {
    return null;
  }

  const result = await pool.query<{ payload: StoredPolicy }>(
    `SELECT payload FROM remifi_policies WHERE policy_id = $1`,
    [policyId],
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0]!.payload;
}

export async function loadLatestPolicyFromDatabase(): Promise<StoredPolicy | null> {
  if (!ready || !pool) {
    return null;
  }

  const result = await pool.query<{ payload: StoredPolicy }>(
    `SELECT payload FROM remifi_policies ORDER BY created_at DESC LIMIT 1`,
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0]!.payload;
}

export async function closePolicyDatabase(): Promise<void> {
  await pool?.end();
  pool = undefined;
  ready = false;
}

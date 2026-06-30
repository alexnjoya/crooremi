import { DEFAULT_GUIDE_TOTAL_USDC } from "./execution-guide.js";
import type { ExecuteBatchInput } from "./types.js";

const POLICY_ID_RE = /pol_[a-f0-9]+/i;

function dollarsToUsdcUnits(value: number): string {
  return String(Math.round(value * 1_000_000));
}

function parseUsdcAmount(value: unknown): string | null {
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    if (Number.isInteger(value) && value >= 1000) {
      return String(value);
    }
    return dollarsToUsdcUnits(value);
  }
  return null;
}

/** Agent Store fund-transfer services often send only `{ "principal_amount": 1 }`. */
export function parseAgentStoreExecuteRequirements(
  json: unknown,
  options: { fundAmount?: string } = {},
): Partial<ExecuteBatchInput> | null {
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return null;
  }

  const record = json as Record<string, unknown>;
  const policyId =
    typeof record.policyId === "string"
      ? record.policyId.match(POLICY_ID_RE)?.[0]?.toLowerCase() ?? null
      : null;

  const totalUsdc =
    parseUsdcAmount(record.totalUsdc) ??
    parseUsdcAmount(record.principal_amount) ??
    parseUsdcAmount(record.principalAmount) ??
    parseUsdcAmount(record.amount) ??
    parseUsdcAmount(record.fundAmount) ??
    (options.fundAmount?.trim() ? options.fundAmount.trim() : null);

  if (!policyId && !totalUsdc) {
    return null;
  }

  return {
    ...(policyId ? { policyId } : {}),
    totalUsdc: totalUsdc ?? DEFAULT_GUIDE_TOTAL_USDC,
  };
}

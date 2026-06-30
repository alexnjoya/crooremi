import { env } from "../config.js";
import { buildExecuteBatchPlan, executeBatchSchema } from "./execute-batch.js";
import { interpretExecutePayrollText } from "./llm.js";
import {
  hasLlmKeys,
  llmRequiredError,
  tryParseJson,
  unwrapNaturalLanguage,
} from "./requirements-utils.js";
import type { ExecuteBatchInput, ExecuteBatchPlan } from "./types.js";

async function buildFromLlmDraft(text: string): Promise<ExecuteBatchPlan> {
  const draft = await interpretExecutePayrollText(text);
  return buildExecuteBatchPlan({
    policyId: draft.policyId,
    totalUsdc: draft.totalUsdc,
  });
}

export async function parseExecutePayrollPlan(
  requirements: string,
): Promise<ExecuteBatchPlan> {
  const trimmed = requirements.trim();
  if (!trimmed) {
    throw new Error("executePaymentJob requirements cannot be empty");
  }

  const asJson = tryParseJson(trimmed);

  if (asJson === null) {
    return buildFromLlmDraft(trimmed);
  }

  const naturalLanguage = unwrapNaturalLanguage(asJson);
  if (naturalLanguage !== null) {
    return buildFromLlmDraft(naturalLanguage);
  }

  if (hasLlmKeys()) {
    return buildFromLlmDraft(trimmed);
  }

  const batch = executeBatchSchema.safeParse(asJson);
  if (!batch.success) {
    throw new Error(
      `${llmRequiredError("executePaymentJob")} Expected { "policyId": "pol_...", "totalUsdc": "1000000" }.`,
    );
  }

  return buildExecuteBatchPlan(batch.data as ExecuteBatchInput);
}

/** Provider AA wallet receives payroll principal at accept. */
export async function resolveExecuteFundAddress(
  _requirements: string,
): Promise<`0x${string}`> {
  const address = env.PROVIDER_AA_WALLET_ADDRESS?.trim();
  if (!address) {
    throw new Error(
      "PROVIDER_AA_WALLET_ADDRESS is required — copy AA Wallet Address from CROO dashboard",
    );
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("PROVIDER_AA_WALLET_ADDRESS must be a valid 0x address");
  }
  return address.toLowerCase() as `0x${string}`;
}

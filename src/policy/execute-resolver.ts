import type { AgentClient } from "@croo-network/sdk";
import { getProviderAaWalletAddress } from "../chain/provider-wallet.js";
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
  client: AgentClient,
  _requirements: string,
): Promise<`0x${string}`> {
  return getProviderAaWalletAddress(client);
}

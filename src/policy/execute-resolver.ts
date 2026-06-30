import type { AgentClient } from "@croo-network/sdk";
import { getProviderAaWalletAddress } from "../chain/provider-wallet.js";
import { buildExecuteBatchPlan, executeBatchSchema } from "./execute-batch.js";
import { DEFAULT_GUIDE_TOTAL_USDC } from "./execution-guide.js";
import { interpretExecutePayrollText } from "./llm.js";
import {
  hasLlmKeys,
  llmRequiredError,
  tryParseJson,
  unwrapNaturalLanguage,
} from "./requirements-utils.js";
import type { ExecuteBatchInput, ExecuteBatchPlan } from "./types.js";

const POLICY_ID_RE = /pol_[a-f0-9]+/i;

function normalizePolicyId(value: string): string | null {
  const trimmed = value.trim();
  if (!POLICY_ID_RE.test(trimmed)) {
    return null;
  }
  return trimmed.match(POLICY_ID_RE)![0]!.toLowerCase();
}

function extractPolicyIdFromText(text: string): string | null {
  return text.match(POLICY_ID_RE)?.[0]?.toLowerCase() ?? null;
}

function extractTotalUsdcFromText(text: string): string | null {
  const jsonMatch = text.match(/"totalUsdc"\s*:\s*"(\d+)"/);
  if (jsonMatch) {
    return jsonMatch[1]!;
  }

  const usdcMatch =
    text.match(/(\d+(?:\.\d+)?)\s*USDC/i) ?? text.match(/\$(\d+(?:\.\d+)?)/);
  if (usdcMatch) {
    const dollars = Number.parseFloat(usdcMatch[1]!);
    if (Number.isFinite(dollars) && dollars > 0) {
      return String(Math.round(dollars * 1_000_000));
    }
  }

  return null;
}

function extractExecuteInput(text: string): ExecuteBatchInput | null {
  const policyId = extractPolicyIdFromText(text);
  if (!policyId) {
    return null;
  }

  return {
    policyId,
    totalUsdc: extractTotalUsdcFromText(text) ?? DEFAULT_GUIDE_TOTAL_USDC,
  };
}

async function buildFromLlmDraft(
  text: string,
  fallbackSource: string,
): Promise<ExecuteBatchPlan> {
  const draft = await interpretExecutePayrollText(text);
  let policyId = normalizePolicyId(draft.policyId);
  if (!policyId) {
    policyId = extractPolicyIdFromText(fallbackSource);
  }
  if (!policyId) {
    throw new Error(
      'Could not resolve policyId. Use Schema requirements: { "policyId": "pol_...", "totalUsdc": "1000000" }.',
    );
  }

  return buildExecuteBatchPlan({
    policyId,
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
    const extracted = extractExecuteInput(trimmed);
    if (extracted) {
      return buildExecuteBatchPlan(extracted);
    }
    if (!hasLlmKeys()) {
      throw new Error(
        `${llmRequiredError("executePaymentJob")} Expected { "policyId": "pol_...", "totalUsdc": "1000000" }.`,
      );
    }
    return buildFromLlmDraft(trimmed, trimmed);
  }

  const naturalLanguage = unwrapNaturalLanguage(asJson);
  if (naturalLanguage !== null) {
    const extracted = extractExecuteInput(naturalLanguage);
    if (extracted) {
      return buildExecuteBatchPlan(extracted);
    }
    if (!hasLlmKeys()) {
      throw new Error(
        `${llmRequiredError("executePaymentJob")} Expected { "policyId": "pol_...", "totalUsdc": "1000000" }.`,
      );
    }
    return buildFromLlmDraft(naturalLanguage, trimmed);
  }

  const batch = executeBatchSchema.safeParse(asJson);
  if (batch.success) {
    return buildExecuteBatchPlan(batch.data as ExecuteBatchInput);
  }

  const extracted = extractExecuteInput(trimmed);
  if (extracted) {
    return buildExecuteBatchPlan(extracted);
  }

  if (hasLlmKeys()) {
    return buildFromLlmDraft(trimmed, trimmed);
  }

  throw new Error(
    `${llmRequiredError("executePaymentJob")} Expected { "policyId": "pol_...", "totalUsdc": "1000000" }.`,
  );
}

/** Provider AA wallet receives payroll principal at accept. */
export async function resolveExecuteFundAddress(
  client: AgentClient,
  _requirements: string,
): Promise<`0x${string}`> {
  return getProviderAaWalletAddress(client);
}

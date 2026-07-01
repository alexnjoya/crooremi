import type { AgentClient } from "@croo-network/sdk";
import { env } from "../config.js";
import { getProviderFundAddress } from "../chain/provider-wallet.js";
import { buildExecuteBatchPlan, executeBatchSchema } from "./execute-batch.js";
import { DEFAULT_GUIDE_TOTAL_USDC } from "./execution-guide.js";
import { interpretExecutePayrollText } from "./llm.js";
import { resolvePolicyIdFromRequester } from "./policy-lookup.js";
import { loadLatestPolicy, type PolicyLoadContext } from "./store.js";
import { parseAgentStoreExecuteRequirements } from "./store-requirements.js";
import {
  hasLlmKeys,
  llmRequiredError,
  tryParseJson,
  unwrapNaturalLanguage,
} from "./requirements-utils.js";
import type { ExecuteBatchInput, ExecuteBatchPlan } from "./types.js";

const POLICY_ID_RE = /pol_[a-f0-9]+/i;

export type ExecuteParseContext = {
  client?: AgentClient;
  requesterAgentId?: string;
  fundAmount?: string;
  orderCreatedAt?: string;
};

function policyLoadContext(ctx?: ExecuteParseContext): PolicyLoadContext | undefined {
  const createPolicyServiceId = env.CROO_SERVICE_ID_CREATE_POLICY?.trim();
  if (!ctx?.client || !createPolicyServiceId) {
    return undefined;
  }
  return {
    client: ctx.client,
    requesterAgentId: ctx.requesterAgentId,
    createPolicyServiceId,
  };
}

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

async function resolveMissingPolicyId(
  ctx: ExecuteParseContext | undefined,
): Promise<string | null> {
  const serviceId = env.CROO_SERVICE_ID_CREATE_POLICY?.trim();
  if (ctx?.client && ctx.requesterAgentId && serviceId) {
    const fromRequester = await resolvePolicyIdFromRequester(
      ctx.client,
      ctx.requesterAgentId,
      serviceId,
      ctx.orderCreatedAt,
    );
    if (fromRequester) {
      console.log(
        `[remifi] execute: resolved policyId ${fromRequester} from requester createPolicy history`,
      );
      return fromRequester;
    }
  }

  const latest = await loadLatestPolicy();
  if (latest) {
    console.log(
      `[remifi] execute: resolved policyId ${latest.policyId} from latest stored policy`,
    );
    return latest.policyId;
  }

  return null;
}

async function finalizeExecuteInput(
  partial: Partial<ExecuteBatchInput>,
  ctx?: ExecuteParseContext,
): Promise<ExecuteBatchInput> {
  let policyId = partial.policyId
    ? normalizePolicyId(partial.policyId)
    : null;
  if (!policyId) {
    policyId = await resolveMissingPolicyId(ctx);
  }
  if (!policyId) {
    throw new Error(
      'Could not resolve policyId. Hire USDC Split Policy first, or send { "policyId": "pol_...", "totalUsdc": "1000000" }.',
    );
  }

  return {
    policyId,
    totalUsdc: partial.totalUsdc ?? ctx?.fundAmount ?? DEFAULT_GUIDE_TOTAL_USDC,
    ...(partial.policy ? { policy: partial.policy } : {}),
  };
}

async function buildFromLlmDraft(
  text: string,
  fallbackSource: string,
  ctx?: ExecuteParseContext,
): Promise<ExecuteBatchPlan> {
  const draft = await interpretExecutePayrollText(text);
  let policyId = normalizePolicyId(draft.policyId);
  if (!policyId) {
    policyId = extractPolicyIdFromText(fallbackSource);
  }

  const input = await finalizeExecuteInput(
    {
      ...(policyId ? { policyId } : {}),
      totalUsdc: draft.totalUsdc,
    },
    ctx,
  );

  return buildExecuteBatchPlan(input, policyLoadContext(ctx));
}

async function buildFromStoreJson(
  asJson: unknown,
  ctx?: ExecuteParseContext,
): Promise<ExecuteBatchPlan | null> {
  const storePartial = parseAgentStoreExecuteRequirements(asJson, {
    fundAmount: ctx?.fundAmount,
  });
  if (!storePartial) {
    return null;
  }

  const batch = executeBatchSchema.safeParse(asJson);
  const input = await finalizeExecuteInput(
    {
      ...storePartial,
      ...(batch.success ? (batch.data as ExecuteBatchInput) : {}),
    },
    ctx,
  );
  return buildExecuteBatchPlan(input, policyLoadContext(ctx));
}

export async function parseExecutePayrollPlan(
  requirements: string,
  ctx?: ExecuteParseContext,
): Promise<ExecuteBatchPlan> {
  const trimmed = requirements.trim();
  if (!trimmed) {
    throw new Error("executePaymentJob requirements cannot be empty");
  }

  const asJson = tryParseJson(trimmed);

  if (asJson === null) {
    const extracted = extractExecuteInput(trimmed);
    if (extracted) {
      return buildExecuteBatchPlan(
        await finalizeExecuteInput(extracted, ctx),
        policyLoadContext(ctx),
      );
    }
    if (!hasLlmKeys()) {
      throw new Error(
        `${llmRequiredError("executePaymentJob")} Expected { "policyId": "pol_...", "totalUsdc": "1000000" } or Agent Store principal_amount.`,
      );
    }
    return buildFromLlmDraft(trimmed, trimmed, ctx);
  }

  const fromStore = await buildFromStoreJson(asJson, ctx);
  if (fromStore) {
    return fromStore;
  }

  const naturalLanguage = unwrapNaturalLanguage(asJson);
  if (naturalLanguage !== null) {
    const extracted = extractExecuteInput(naturalLanguage);
    if (extracted) {
      return buildExecuteBatchPlan(
        await finalizeExecuteInput(extracted, ctx),
        policyLoadContext(ctx),
      );
    }
    if (!hasLlmKeys()) {
      throw new Error(
        `${llmRequiredError("executePaymentJob")} Expected { "policyId": "pol_...", "totalUsdc": "1000000" }.`,
      );
    }
    return buildFromLlmDraft(naturalLanguage, trimmed, ctx);
  }

  const batch = executeBatchSchema.safeParse(asJson);
  if (batch.success) {
    return buildExecuteBatchPlan(
      await finalizeExecuteInput(batch.data as ExecuteBatchInput, ctx),
      policyLoadContext(ctx),
    );
  }

  const extracted = extractExecuteInput(trimmed);
  if (extracted) {
    return buildExecuteBatchPlan(
      await finalizeExecuteInput(extracted, ctx),
      policyLoadContext(ctx),
    );
  }

  if (hasLlmKeys()) {
    return buildFromLlmDraft(trimmed, trimmed, ctx);
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
  return getProviderFundAddress(client);
}

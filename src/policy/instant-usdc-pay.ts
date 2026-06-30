import { z } from "zod";
import type { Order } from "@croo-network/sdk";
import { baseExplorerTx } from "../config.js";
import { resolveAddressInput } from "./ens.js";
import { interpretInstantUsdcPayText } from "./llm.js";
import {
  hasLlmKeys,
  llmRequiredError,
  tryParseJson,
  unwrapNaturalLanguage,
} from "./requirements-utils.js";
import type { InstantUsdcPayDelivery } from "./types.js";

export type InstantUsdcPayInput = {
  to: string;
  amount: string;
  reference?: string;
};

export type InstantUsdcPayResolved = InstantUsdcPayInput & {
  address: `0x${string}`;
  ens?: string;
};

export type InstantUsdcPayParseContext = {
  fundAmount?: string;
};

const instantPayJsonSchema = z.object({
  to: z.string().min(1).optional(),
  recipient: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  totalUsdc: z.union([z.string(), z.number()]).optional(),
  principal_amount: z.union([z.string(), z.number()]).optional(),
  principalAmount: z.union([z.string(), z.number()]).optional(),
  reference: z.string().optional(),
  memo: z.string().optional(),
});

function parseUsdcAmount(value: unknown): string | null {
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    if (Number.isInteger(value) && value >= 1000) {
      return String(value);
    }
    return String(Math.round(value * 1_000_000));
  }
  return null;
}

function formatUsdcDisplay(baseUnits: string): string {
  const whole = BigInt(baseUnits);
  const dollars = Number(whole) / 1_000_000;
  return dollars.toFixed(6).replace(/\.?0+$/, "") || "0";
}

function extractFromNaturalLanguage(text: string): InstantUsdcPayInput | null {
  const sendTo = text.match(
    /send\s+(\d+(?:\.\d+)?)\s*usdc\s+to\s+(.+)/i,
  );
  if (sendTo) {
    const amount = parseUsdcAmount(Number.parseFloat(sendTo[1]!));
    const to = sendTo[2]!.trim().replace(/[.\s]+$/, "");
    if (amount && to) {
      return { to, amount };
    }
  }

  const toSend = text.match(
    /send\s+(.+?)\s+(\d+(?:\.\d+)?)\s*usdc/i,
  );
  if (toSend) {
    const amount = parseUsdcAmount(Number.parseFloat(toSend[2]!));
    const to = toSend[1]!.trim();
    if (amount && to) {
      return { to, amount };
    }
  }

  return null;
}

function mergeAmount(
  parsed: Partial<InstantUsdcPayInput>,
  ctx?: InstantUsdcPayParseContext,
): string | null {
  return (
    (parsed.amount ? parseUsdcAmount(parsed.amount) : null) ??
    (ctx?.fundAmount?.trim() ? parseUsdcAmount(ctx.fundAmount.trim()) : null)
  );
}

export async function parseInstantUsdcPayRequirements(
  requirements: string,
  ctx: InstantUsdcPayParseContext = {},
): Promise<InstantUsdcPayInput> {
  const trimmed = requirements.trim();
  if (!trimmed) {
    throw new Error("Instant USDC Pay requires recipient and amount");
  }

  const asJson = tryParseJson(trimmed);

  if (asJson !== null && typeof asJson === "object" && !Array.isArray(asJson)) {
    const naturalLanguage = unwrapNaturalLanguage(asJson);
    if (naturalLanguage) {
      return parseInstantUsdcPayRequirements(naturalLanguage, ctx);
    }

    const record = instantPayJsonSchema.parse(asJson);
    const to = record.to ?? record.recipient ?? record.address;
    const amount = mergeAmount(
      {
        amount:
          parseUsdcAmount(record.amount) ??
          parseUsdcAmount(record.totalUsdc) ??
          parseUsdcAmount(record.principal_amount) ??
          parseUsdcAmount(record.principalAmount) ??
          undefined,
      },
      ctx,
    );

    if (to && amount) {
      return {
        to: to.trim(),
        amount,
        reference: record.reference ?? record.memo,
      };
    }

    if (to && ctx.fundAmount) {
      const fromFund = parseUsdcAmount(ctx.fundAmount);
      if (fromFund) {
        return {
          to: to.trim(),
          amount: fromFund,
          reference: record.reference ?? record.memo,
        };
      }
    }
  }

  const fromText = extractFromNaturalLanguage(trimmed);
  if (fromText) {
    return fromText;
  }

  if (hasLlmKeys()) {
    const draft = await interpretInstantUsdcPayText(trimmed);
    const amount = parseUsdcAmount(draft.amount) ?? mergeAmount({}, ctx);
    if (!amount) {
      throw new Error("Instant USDC Pay could not determine amount");
    }
    return {
      to: draft.to.trim(),
      amount,
      reference: draft.reference,
    };
  }

  throw new Error(
    `${llmRequiredError("Instant USDC Pay")} ` +
      'Expected JSON like { "to": "0x...", "amount": "500000" } or ' +
      '"Send 0.50 USDC to 0x...".',
  );
}

export async function resolveInstantUsdcPay(
  input: InstantUsdcPayInput,
): Promise<InstantUsdcPayResolved> {
  const { address, ens } = await resolveAddressInput(input.to);
  return {
    ...input,
    address,
    ens: input.to.includes(".") ? input.to.trim() : ens,
  };
}

export async function resolveInstantPayFundAddress(
  requirements: string,
  ctx: InstantUsdcPayParseContext = {},
): Promise<`0x${string}`> {
  const parsed = await parseInstantUsdcPayRequirements(requirements, ctx);
  const resolved = await resolveInstantUsdcPay(parsed);
  console.log("[remifi] instant USDC pay accept →", {
    to: resolved.address,
    ens: resolved.ens,
    amount: resolved.amount,
  });
  return resolved.address;
}

export function buildInstantUsdcPayDelivery(
  order: Order,
  resolved: InstantUsdcPayResolved,
): InstantUsdcPayDelivery {
  const fundTxHash = order.payTxHash?.trim();
  if (!fundTxHash) {
    throw new Error(
      "Order missing payTxHash — CAP payOrder must complete before delivery",
    );
  }

  if (!order.providerFundAddress?.trim()) {
    throw new Error(
      "Order missing providerFundAddress — fund-transfer accept must declare recipient",
    );
  }

  const expectedFund = BigInt(resolved.amount);
  if (order.fundAmount && BigInt(order.fundAmount) !== expectedFund) {
    throw new Error(
      `Fund amount mismatch: payment needs ${expectedFund} base units, ` +
        `order fundAmount is ${order.fundAmount}`,
    );
  }

  const providerFund = order.providerFundAddress.trim().toLowerCase();
  if (providerFund !== resolved.address.toLowerCase()) {
    throw new Error(
      `Order fund address ${providerFund} does not match recipient ${resolved.address}`,
    );
  }

  return {
    success: true,
    to: resolved.address,
    toInput: resolved.to,
    ens: resolved.ens,
    amount: resolved.amount,
    amountUsdc: formatUsdcDisplay(resolved.amount),
    reference: resolved.reference,
    fundTxHash,
    txHash: fundTxHash,
    baseExplorer: baseExplorerTx(fundTxHash),
    settlement: "direct_cap",
  };
}

import { z } from "zod";
import { amountFromBps } from "./bps.js";
import { loadPolicy } from "./store.js";
import type { ExecutePayoutLeg, SplitRecipient } from "./types.js";

const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/)
  .transform((value) => value as `0x${string}`);

const executeDirectSchema = z.object({
  policyId: z.string().min(1),
  recipient: z.object({
    address: addressSchema,
    label: z.string().min(1),
    amount: z.string().regex(/^\d+$/),
  }),
});

const executeByReferenceSchema = z
  .object({
    policyId: z.string().min(1),
    totalUsdc: z.string().regex(/^\d+$/),
    recipient: z.string().min(1).optional(),
    recipientIndex: z.number().int().nonnegative().optional(),
  })
  .refine(
    (input) => input.recipient !== undefined || input.recipientIndex !== undefined,
    { message: "Provide recipient (label) or recipientIndex" },
  );

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function findPolicyRecipient(
  recipients: SplitRecipient[],
  label: string | undefined,
  index: number | undefined,
): SplitRecipient {
  if (label !== undefined) {
    const match = recipients.find(
      (r) => r.label.toLowerCase() === label.toLowerCase(),
    );
    if (!match) {
      const labels = recipients.map((r) => r.label).join(", ");
      throw new Error(
        `Recipient "${label}" not found in policy. Available: ${labels}`,
      );
    }
    return match;
  }

  if (index === undefined || index >= recipients.length) {
    throw new Error(
      `Recipient index ${index ?? "undefined"} is out of range ` +
        `(policy has ${recipients.length} recipient(s))`,
    );
  }
  return recipients[index]!;
}

async function resolveByReference(
  input: z.infer<typeof executeByReferenceSchema>,
): Promise<ExecutePayoutLeg> {
  const stored = await loadPolicy(input.policyId);
  if (!stored) {
    throw new Error(
      `Policy "${input.policyId}" not found. Hire USDC Split Policy first ` +
        "(policies are saved when the provider delivers successfully).",
    );
  }

  const match = findPolicyRecipient(
    stored.policy.recipients,
    input.recipient,
    input.recipientIndex,
  );
  const total = BigInt(input.totalUsdc);
  const amount = amountFromBps(total, match.bps);

  return {
    policyId: input.policyId,
    recipient: {
      address: match.address,
      label: match.label,
      amount: amount.toString(),
    },
  };
}

export async function parseExecutePayoutLeg(
  requirements: string,
): Promise<ExecutePayoutLeg> {
  const trimmed = requirements.trim();
  if (!trimmed) {
    throw new Error("executePaymentJob requirements cannot be empty");
  }

  const asJson = tryParseJson(trimmed);
  if (asJson === null) {
    throw new Error("executePaymentJob requires Schema JSON input");
  }

  const direct = executeDirectSchema.safeParse(asJson);
  if (direct.success) {
    return direct.data;
  }

  const byRef = executeByReferenceSchema.safeParse(asJson);
  if (byRef.success) {
    return resolveByReference(byRef.data);
  }

  throw new Error(
    "executePaymentJob requires either " +
      '{ policyId, totalUsdc, recipient } or ' +
      '{ policyId, recipient: { address, label, amount } }',
  );
}

/** CROO routes USDC to this address at payOrder time. */
export async function resolveExecuteFundAddress(
  requirements: string,
): Promise<`0x${string}`> {
  const leg = await parseExecutePayoutLeg(requirements);
  return leg.recipient.address;
}

import { z } from "zod";
import { amountFromBps } from "./bps.js";
import { loadPolicy } from "./store.js";
import type { ExecutePayoutLeg, SplitRecipient } from "./types.js";

const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/i)
  .transform((value) => value.toLowerCase() as `0x${string}`);

const executeDirectSchema = z.object({
  policyId: z.string().min(1),
  recipient: z.object({
    address: addressSchema,
    label: z.string().min(1),
    amount: z.string().regex(/^\d+$/),
  }),
});

const policySnapshotSchema = z.object({
  recipients: z
    .array(
      z.object({
        address: addressSchema,
        label: z.string().min(1),
        bps: z.number().int().positive(),
      }),
    )
    .min(1),
});

const executeByReferenceSchema = z
  .object({
    policyId: z.string().min(1),
    totalUsdc: z.string().regex(/^\d+$/),
    recipient: z.string().min(1).optional(),
    recipientIndex: z.number().int().nonnegative().optional(),
    policy: policySnapshotSchema.optional(),
  })
  .refine(
    (input) => input.recipient !== undefined || input.recipientIndex !== undefined,
    { message: "Provide recipient (label or 0x address) or recipientIndex" },
  );

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isAddressLike(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/i.test(value.trim());
}

function findPolicyRecipient(
  recipients: SplitRecipient[],
  labelOrAddress: string | undefined,
  index: number | undefined,
): SplitRecipient {
  if (labelOrAddress !== undefined) {
    const needle = labelOrAddress.trim();
    if (isAddressLike(needle)) {
      const addr = needle.toLowerCase();
      const byAddress = recipients.find((r) => r.address.toLowerCase() === addr);
      if (byAddress) {
        return byAddress;
      }
    }

    const byLabel = recipients.find(
      (r) => r.label.toLowerCase() === needle.toLowerCase(),
    );
    if (byLabel) {
      return byLabel;
    }

    const labels = recipients.map((r) => `${r.label} (${r.address})`).join(", ");
    throw new Error(
      `Recipient "${labelOrAddress}" not found in policy. Available: ${labels}`,
    );
  }

  if (index === undefined || index >= recipients.length) {
    throw new Error(
      `Recipient index ${index ?? "undefined"} is out of range ` +
        `(policy has ${recipients.length} recipient(s))`,
    );
  }
  return recipients[index]!;
}

async function loadPolicyRecipients(
  policyId: string,
  inline?: z.infer<typeof policySnapshotSchema>,
): Promise<SplitRecipient[]> {
  const stored = await loadPolicy(policyId);
  if (stored) {
    return stored.policy.recipients;
  }
  if (inline) {
    return inline.recipients;
  }
  throw new Error(
    `Policy "${policyId}" not found. Use executionGuide requirements from your ` +
      "policy delivery (direct address + amount), or re-hire USDC Split Policy.",
  );
}

async function resolveByReference(
  input: z.infer<typeof executeByReferenceSchema>,
): Promise<ExecutePayoutLeg> {
  const recipients = await loadPolicyRecipients(input.policyId, input.policy);
  const match = findPolicyRecipient(
    recipients,
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
      '{ policyId, recipient: { address, label, amount } } (recommended) or ' +
      '{ policyId, totalUsdc, recipient }',
  );
}

/** CROO routes USDC to this address at payOrder time. */
export async function resolveExecuteFundAddress(
  requirements: string,
): Promise<`0x${string}`> {
  const leg = await parseExecutePayoutLeg(requirements);
  return leg.recipient.address;
}

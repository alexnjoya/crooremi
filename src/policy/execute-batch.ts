import { z } from "zod";
import { amountFromBps } from "./bps.js";
import { loadPolicy } from "./store.js";
import type { ExecuteBatchInput, ExecuteBatchPlan, ExecutePayoutLeg, SplitRecipient } from "./types.js";

export const executeBatchSchema = z.object({
  policyId: z.string().min(1),
  totalUsdc: z.string().regex(/^\d+$/),
  policy: z
    .object({
      recipients: z
        .array(
          z.object({
            address: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
            label: z.string().min(1),
            bps: z.number().int().positive(),
          }),
        )
        .min(1),
    })
    .optional(),
});

async function loadRecipients(
  policyId: string,
  inline?: ExecuteBatchInput["policy"],
): Promise<SplitRecipient[]> {
  const stored = await loadPolicy(policyId);
  if (stored) {
    return stored.policy.recipients;
  }
  if (inline) {
    return inline.recipients.map((r) => ({
      address: r.address.toLowerCase() as `0x${string}`,
      label: r.label,
      bps: r.bps,
    }));
  }
  throw new Error(
    `Policy "${policyId}" not found. Re-hire USDC Split Policy or include policy snapshot.`,
  );
}

export async function buildExecuteBatchPlan(
  input: ExecuteBatchInput,
): Promise<ExecuteBatchPlan> {
  const recipients = await loadRecipients(input.policyId, input.policy);
  const total = BigInt(input.totalUsdc);
  const allocatedBps = recipients.reduce((sum, r) => sum + r.bps, 0);

  const legs: ExecutePayoutLeg[] = recipients.map((recipient) => {
    const amount = amountFromBps(total, recipient.bps);
    return {
      policyId: input.policyId,
      recipient: {
        address: recipient.address,
        label: recipient.label,
        amount: amount.toString(),
      },
    };
  });

  const fundAmount = legs.reduce((sum, leg) => sum + BigInt(leg.recipient.amount), 0n);

  return {
    policyId: input.policyId,
    totalUsdc: input.totalUsdc,
    legs,
    fundAmount: fundAmount.toString(),
    allocatedBps,
    remainderBps: 10_000 - allocatedBps,
  };
}

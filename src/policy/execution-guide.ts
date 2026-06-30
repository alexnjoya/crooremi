import { amountFromBps } from "./bps.js";
import type { CreatePolicyDelivery, ExecutionGuide } from "./types.js";

/** Default example principal for executionGuide (1.00 USDC). */
export const DEFAULT_GUIDE_TOTAL_USDC = "1000000";

/** Flat execution service fee in 6-decimal USDC units (1.00 USDC). */
export const EXECUTE_SERVICE_FEE_USDC = "1000000";

export function buildExecutionGuide(
  delivery: Pick<
    CreatePolicyDelivery,
    "policyId" | "policy" | "remainderBps"
  >,
  totalUsdc: string = DEFAULT_GUIDE_TOTAL_USDC,
): ExecutionGuide {
  const principal = BigInt(totalUsdc);
  const fee = BigInt(EXECUTE_SERVICE_FEE_USDC);

  const hires = delivery.policy.recipients.map((recipient, index) => {
    const amount = amountFromBps(principal, recipient.bps);
    return {
      step: index + 1,
      service: "USDC Split Execution" as const,
      requirements: {
        policyId: delivery.policyId,
        totalUsdc,
        recipient: recipient.label,
      },
      recipientAddress: recipient.address,
      amount: amount.toString(),
      serviceFeeUsdc: EXECUTE_SERVICE_FEE_USDC,
      estimatedPayUsdc: (amount + fee).toString(),
    };
  });

  return {
    totalUsdc,
    hires,
    note:
      "Hire USDC Split Execution once per step. Paste each requirements block — " +
      "no need to copy addresses or calculate amounts.",
    ...(delivery.remainderBps > 0 ? { remainderBps: delivery.remainderBps } : {}),
  };
}

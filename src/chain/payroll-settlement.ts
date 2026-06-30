import type { Order } from "@croo-network/sdk";
import { baseExplorerTx } from "../config.js";
import type {
  ExecuteBatchPlan,
  ExecutePaymentDelivery,
  ExecutePayoutLeg,
} from "../policy/types.js";

function assertPayrollFundTransfer(order: Order, plan: ExecuteBatchPlan): void {
  const payTxHash = order.payTxHash?.trim();
  if (!payTxHash) {
    throw new Error(
      "Order missing payTxHash — CROO payOrder must complete before payroll delivery",
    );
  }

  if (!order.providerFundAddress?.trim()) {
    throw new Error(
      "Order missing providerFundAddress — fund-transfer accept must declare provider AA wallet",
    );
  }

  const expectedFund = BigInt(plan.fundAmount);
  if (order.fundAmount && BigInt(order.fundAmount) !== expectedFund) {
    throw new Error(
      `Fund amount mismatch: payroll needs ${expectedFund} base units, ` +
        `order fundAmount is ${order.fundAmount}`,
    );
  }
}

/**
 * CROO SDK payroll settlement — no local wallet signing.
 *
 * 1. acceptNegotiationWithFundAddress(provider AA wallet)
 * 2. requester payOrder → fundAmount USDC lands on provider AA wallet (payTxHash)
 * 3. deliverOrder → CROO disburses from AA wallet; deliverTxHash is on-chain proof
 */
export function buildPayrollDelivery(
  order: Order,
  plan: ExecuteBatchPlan,
  deliverTxHash?: string,
): ExecutePaymentDelivery {
  if (plan.legs.length === 0) {
    throw new Error("Payroll execution requires at least one recipient");
  }

  assertPayrollFundTransfer(order, plan);

  const fundTxHash = order.payTxHash!.trim();
  const disbursementTxHash = deliverTxHash?.trim() || order.deliverTxHash?.trim();

  const recipients = plan.legs.map((leg) => toRecipientRow(leg, disbursementTxHash));

  const txHashes = [fundTxHash, disbursementTxHash].filter(
    (hash): hash is string => Boolean(hash),
  );

  return {
    policyId: plan.policyId,
    totalUsdc: plan.totalUsdc,
    fundTxHash,
    deliverTxHash: disbursementTxHash,
    txHashes,
    recipients,
    baseExplorer: baseExplorerTx(disbursementTxHash ?? fundTxHash),
    settlement: "croo_payroll",
  };
}

function toRecipientRow(
  leg: ExecutePayoutLeg,
  disbursementTxHash?: string,
): ExecutePaymentDelivery["recipients"][number] {
  return {
    label: leg.recipient.label,
    address: leg.recipient.address,
    amount: leg.recipient.amount,
    ...(disbursementTxHash ? { txHash: disbursementTxHash } : {}),
  };
}

import type { Order } from "@croo-network/sdk";
import type { ExecutePaymentDelivery, ExecutePayoutLeg } from "../policy/types.js";
import { baseExplorerTx } from "../config.js";

/**
 * CROO direct settlement — requester payOrder batch sends USDC to recipient
 * (providerFundAddress set at accept). Proof = order.payTxHash. No local signer.
 */
export function executeCrooDirectSettlement(
  order: Order,
  leg: ExecutePayoutLeg,
): ExecutePaymentDelivery {
  const txHash = order.payTxHash?.trim();
  if (!txHash) {
    throw new Error(
      "Order missing payTxHash — CROO direct settlement requires a completed pay tx",
    );
  }

  const { label, amount } = leg.recipient;

  return {
    policyId: leg.policyId,
    totalUsdc: amount,
    txHashes: [txHash],
    recipients: [{ label, amount, txHash }],
    baseExplorer: baseExplorerTx(txHash),
    settlement: "croo_direct",
  };
}

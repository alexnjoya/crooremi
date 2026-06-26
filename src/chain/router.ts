import type { ExecutePaymentDelivery, ExecutePaymentInput } from "../policy/types.js";
import { baseExplorerTx } from "../config.js";
import {
  chain,
  erc20Abi,
  getUsdcAddress,
  getWalletClient,
  publicClient,
} from "./client.js";

function amountFromBps(totalUsdc: bigint, bps: number): bigint {
  return (totalUsdc * BigInt(bps)) / 10_000n;
}

export async function executePaymentSplit(
  input: ExecutePaymentInput,
): Promise<ExecutePaymentDelivery> {
  const totalUsdc = BigInt(input.totalUsdc);
  const { client: wallet, account } = getWalletClient();
  const usdc = getUsdcAddress();

  const txHashes: string[] = [];
  const recipients: ExecutePaymentDelivery["recipients"] = [];

  for (const recipient of input.policy.recipients) {
    const amount = amountFromBps(totalUsdc, recipient.bps);
    const hash = await wallet.writeContract({
      account,
      chain,
      address: usdc,
      abi: erc20Abi,
      functionName: "transfer",
      args: [recipient.address, amount],
    });

    await publicClient.waitForTransactionReceipt({ hash });
    txHashes.push(hash);
    recipients.push({
      label: recipient.label,
      amount: amount.toString(),
      txHash: hash,
    });
  }

  return {
    policyId: input.policyId,
    totalUsdc: input.totalUsdc,
    txHashes,
    recipients,
    baseExplorer: baseExplorerTx(txHashes[0] ?? ""),
  };
}

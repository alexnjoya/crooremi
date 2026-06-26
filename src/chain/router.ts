import { createHash } from "node:crypto";
import type { ExecutePaymentDelivery, ExecutePaymentInput } from "../policy/types.js";
import { baseExplorerTx, env } from "../config.js";
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

function mockTxHash(policyId: string, label: string): `0x${string}` {
  const hex = createHash("sha256")
    .update(`remifi-mock:${policyId}:${label}`)
    .digest("hex");
  return `0x${hex}` as `0x${string}`;
}

function executeMockSplit(input: ExecutePaymentInput): ExecutePaymentDelivery {
  const totalUsdc = BigInt(input.totalUsdc);
  const txHashes: string[] = [];
  const recipients: ExecutePaymentDelivery["recipients"] = [];

  for (const recipient of input.policy.recipients) {
    const amount = amountFromBps(totalUsdc, recipient.bps);
    const txHash = mockTxHash(input.policyId, recipient.label);
    txHashes.push(txHash);
    recipients.push({
      label: recipient.label,
      amount: amount.toString(),
      txHash,
    });
  }

  return {
    policyId: input.policyId,
    totalUsdc: input.totalUsdc,
    txHashes,
    recipients,
    baseExplorer: baseExplorerTx(txHashes[0] ?? ""),
    mock: true,
    mockNote:
      "DEV_MOCK_SETTLEMENT — simulated split. Fund AA wallet and disable mock for real Base txs.",
  };
}

export async function executePaymentSplit(
  input: ExecutePaymentInput,
): Promise<ExecutePaymentDelivery> {
  if (env.DEV_MOCK_SETTLEMENT) {
    console.warn("[remifi] DEV_MOCK_SETTLEMENT — skipping on-chain USDC transfers");
    return executeMockSplit(input);
  }

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

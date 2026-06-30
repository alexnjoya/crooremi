import { parseAbi } from "viem";
import type { Order } from "@croo-network/sdk";
import { env, baseExplorerTx } from "../config.js";
import type { InstantUsdcPayResolved } from "../policy/instant-usdc-pay.js";
import type { InstantUsdcPayDelivery } from "../policy/types.js";
import {
  createBasePublicClient,
  createBaseWalletClient,
} from "./chain-clients.js";
import { requirePayoutAccount } from "./payout-wallet.js";

const erc20Abi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
]);

function formatUsdcDisplay(baseUnits: string): string {
  const whole = BigInt(baseUnits);
  const dollars = Number(whole) / 1_000_000;
  return dollars.toFixed(6).replace(/\.?0+$/, "") || "0";
}

function isDirectCapSettlement(order: Order, recipient: `0x${string}`): boolean {
  const fundTxHash = order.payTxHash?.trim();
  const providerFund = order.providerFundAddress?.trim().toLowerCase();
  return Boolean(
    fundTxHash &&
      providerFund &&
      providerFund === recipient.toLowerCase(),
  );
}

export function buildDirectCapInstantPayDelivery(
  order: Order,
  resolved: InstantUsdcPayResolved,
): InstantUsdcPayDelivery {
  const fundTxHash = order.payTxHash!.trim();
  const expectedFund = BigInt(resolved.amount);
  if (order.fundAmount && BigInt(order.fundAmount) !== expectedFund) {
    throw new Error(
      `Fund amount mismatch: payment needs ${expectedFund} base units, ` +
        `order fundAmount is ${order.fundAmount}`,
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

async function disburseFromPayoutWallet(
  resolved: InstantUsdcPayResolved,
): Promise<InstantUsdcPayDelivery> {
  const account = requirePayoutAccount();
  const amount = BigInt(resolved.amount);
  const usdc = env.USDC_ADDRESS as `0x${string}`;
  const publicClient = createBasePublicClient();
  const walletClient = createBaseWalletClient(account);

  const balance = await publicClient.readContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });

  if (balance < amount) {
    throw new Error(
      `Payout wallet USDC balance ${balance} is below required ${amount} base units`,
    );
  }

  const hash = await walletClient.writeContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "transfer",
    args: [resolved.address, amount],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`USDC transfer to ${resolved.address} reverted: ${hash}`);
  }

  console.log("[remifi] instant USDC pay transfer", {
    to: resolved.address,
    ens: resolved.ens,
    amount: resolved.amount,
    txHash: hash,
  });

  return {
    success: true,
    to: resolved.address,
    toInput: resolved.to,
    ens: resolved.ens,
    amount: resolved.amount,
    amountUsdc: formatUsdcDisplay(resolved.amount),
    reference: resolved.reference,
    fundTxHash: hash,
    txHash: hash,
    baseExplorer: baseExplorerTx(hash),
    settlement: "wallet_instant_pay",
  };
}

function mockInstantPayDelivery(
  resolved: InstantUsdcPayResolved,
): InstantUsdcPayDelivery {
  const mockHash = `0x${"0".repeat(64)}` as `0x${string}`;
  return {
    success: true,
    to: resolved.address,
    toInput: resolved.to,
    ens: resolved.ens,
    amount: resolved.amount,
    amountUsdc: formatUsdcDisplay(resolved.amount),
    reference: resolved.reference,
    fundTxHash: mockHash,
    txHash: mockHash,
    baseExplorer: baseExplorerTx(mockHash),
    settlement: "mock_instant_pay",
  };
}

/** CAP direct fund to recipient, or payout-wallet transfer for non-fund services. */
export async function settleInstantUsdcPay(
  order: Order,
  resolved: InstantUsdcPayResolved,
): Promise<InstantUsdcPayDelivery> {
  if (isDirectCapSettlement(order, resolved.address)) {
    return buildDirectCapInstantPayDelivery(order, resolved);
  }

  if (env.DEV_MOCK_PAYROLL_SETTLEMENT) {
    console.log("[remifi] instant USDC pay: mock mode — skipping on-chain transfer");
    return mockInstantPayDelivery(resolved);
  }

  return disburseFromPayoutWallet(resolved);
}

export function isNonFundServiceAcceptError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("provider_fund_address must be empty");
}

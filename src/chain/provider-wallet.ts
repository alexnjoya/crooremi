import type { AgentClient } from "@croo-network/sdk";
import { env } from "../config.js";

let cachedAaWallet: `0x${string}` | undefined;

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Provider AA wallet for fund-transfer accept.
 * Uses PROVIDER_AA_WALLET_ADDRESS when set, otherwise the wallet on past CROO orders.
 */
export async function getProviderAaWalletAddress(
  client: AgentClient,
): Promise<`0x${string}`> {
  const fromEnv = env.PROVIDER_AA_WALLET_ADDRESS?.trim();
  if (fromEnv) {
    if (!ADDRESS_RE.test(fromEnv)) {
      throw new Error("PROVIDER_AA_WALLET_ADDRESS must be a valid 0x address");
    }
    return fromEnv.toLowerCase() as `0x${string}`;
  }

  if (cachedAaWallet) {
    return cachedAaWallet;
  }

  const orders = await client.listOrders({ role: "provider", pageSize: 20 });
  for (const order of orders) {
    const wallet = order.providerWalletAddress?.trim();
    if (wallet && ADDRESS_RE.test(wallet)) {
      cachedAaWallet = wallet.toLowerCase() as `0x${string}`;
      console.log(`[remifi] resolved provider AA wallet from CROO orders: ${cachedAaWallet}`);
      return cachedAaWallet;
    }
  }

  throw new Error(
    "PROVIDER_AA_WALLET_ADDRESS is not set and no provider orders found on CROO. " +
      "Copy AA Wallet Address from the CROO dashboard into Railway env, or complete one CAP order first.",
  );
}

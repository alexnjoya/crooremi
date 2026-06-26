import { createPublicClient, createWalletClient, http, type Account } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { env } from "../config.js";

const erc20Abi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export const chain = env.BASE_CHAIN_ID === 8453 ? base : baseSepolia;

const transport = http(env.BASE_RPC_URL);

// Explicit annotation avoids TS7056 on exported inferred viem client types.
export const publicClient: {
  waitForTransactionReceipt: (args: { hash: `0x${string}` }) => Promise<unknown>;
} = createPublicClient({
  chain,
  transport,
}) as {
  waitForTransactionReceipt: (args: { hash: `0x${string}` }) => Promise<unknown>;
};

let walletClient: ReturnType<typeof createWalletClient> | undefined;
let signerAccount: Account | undefined;

export function getWalletClient() {
  if (!walletClient || !signerAccount) {
    const key = env.AGENT_WALLET_PRIVATE_KEY;
    if (!key) {
      throw new Error(
        "AGENT_WALLET_PRIVATE_KEY is required for on-chain USDC splits",
      );
    }
    const normalized = key.startsWith("0x") ? key : `0x${key}`;
    signerAccount = privateKeyToAccount(normalized as `0x${string}`);
    walletClient = createWalletClient({
      account: signerAccount,
      chain,
      transport: http(env.BASE_RPC_URL),
    });
  }
  return { client: walletClient, account: signerAccount };
}

export function getUsdcAddress(): `0x${string}` {
  return env.USDC_ADDRESS as `0x${string}`;
}

export { erc20Abi };

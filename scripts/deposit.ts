/**
 * Deposit helper — check balances, print funding guide, enable dev mock mode.
 *
 *   npm run deposit              # status + funding instructions
 *   npm run deposit -- --mock    # enable DEV_MOCK_SETTLEMENT in .env
 */
import { config as loadEnv } from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPublicClient, formatUnits, http } from "viem";
import { base } from "viem/chains";

const root = resolve(process.cwd());
const envPath = resolve(root, ".env");
loadEnv({ path: envPath, override: true });

const enableMock = process.argv.includes("--mock");

const usdcAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const USDC_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
const AA_WALLET = process.env.PROVIDER_AA_WALLET_ADDRESS as `0x${string}` | undefined;

async function readUsdcBalance(address: `0x${string}`): Promise<string> {
  const rpc = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
  const client = createPublicClient({ chain: base, transport: http(rpc) });
  const raw = await client.readContract({
    address: USDC_MAINNET,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: [address],
  });
  return formatUnits(raw, 6);
}

function setMockInEnv(): void {
  if (!existsSync(envPath)) {
    console.error("No .env file found");
    process.exit(1);
  }
  let content = readFileSync(envPath, "utf8");
  if (/^DEV_MOCK_SETTLEMENT=/m.test(content)) {
    content = content.replace(
      /^DEV_MOCK_SETTLEMENT=.*$/m,
      "DEV_MOCK_SETTLEMENT=true",
    );
  } else {
    content +=
      "\n# Dev only — simulated executePaymentJob txs (no real USDC required)\nDEV_MOCK_SETTLEMENT=true\n";
  }
  writeFileSync(envPath, content);
  console.log("✓ Set DEV_MOCK_SETTLEMENT=true in .env");
  console.log("  Restart provider: npm run dev\n");
}

async function main(): Promise<void> {
  console.log("\nRemifi deposit guide\n");

  if (enableMock) {
    setMockInEnv();
  }

  const mockOn =
    process.env.DEV_MOCK_SETTLEMENT === "true" ||
    process.env.DEV_MOCK_SETTLEMENT === "1";

  console.log(`Mode: ${mockOn ? "DEV MOCK (no on-chain splits)" : "PRODUCTION (real Base txs)"}`);
  console.log("");

  if (AA_WALLET) {
    console.log("Provider AA Wallet (Top Up in CROO dashboard):");
    console.log(`  ${AA_WALLET}`);
    try {
      const bal = await readUsdcBalance(AA_WALLET);
      console.log(`  USDC balance: ${bal}`);
    } catch (err) {
      console.log(`  USDC balance: (could not read — ${err instanceof Error ? err.message : err})`);
    }
  } else {
    console.log("⚠ PROVIDER_AA_WALLET_ADDRESS not set in .env");
  }

  console.log("\n--- Funding needed later (mainnet USDC on Base) ---\n");
  console.log("| Use case              | Where to fund        | Suggested amount |");
  console.log("|-----------------------|----------------------|------------------|");
  console.log("| createPolicy fee      | Requester AA wallet  | ~0.10 USDC       |");
  console.log("| executePaymentJob     | Requester AA wallet  | principal + ~1 fee |");
  console.log("| Real on-chain splits  | Provider AA wallet   | principal buffer |");
  console.log("");

  if (mockOn) {
    console.log("DEV_MOCK_SETTLEMENT is ON:");
    console.log("  • executePaymentJob returns simulated txHashes");
    console.log("  • No AGENT_WALLET_PRIVATE_KEY required");
    console.log("  • CAP pay step still needs requester USDC for order fees");
    console.log("  • Disable mock before hackathon demo with real BaseScan proof\n");
  } else {
    console.log("To develop without funding provider wallet yet:");
    console.log("  npm run deposit -- --mock\n");
  }

  console.log("CROO dashboard Top Up:");
  console.log("  https://agent.croo.network → Account → AA Wallet → Top Up\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

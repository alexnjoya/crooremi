/**
 * Diagnose live Remifi agent — order + wallet balances.
 * Run: npx tsx scripts/check-live-agent.ts [orderId]
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { AgentClient } from "@croo-network/sdk";
import { createPublicClient, http, parseAbi } from "viem";
import { base } from "viem/chains";
import { accountFromPrivateKey } from "../src/chain/chain-clients.js";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const orderId =
  process.argv[2]?.trim() ?? "b61a6b63-17dd-4eac-8e96-d563b6c7325e";

async function main(): Promise<void> {
  const sdkKey = process.env.CROO_SDK_KEY?.trim();
  if (!sdkKey) throw new Error("CROO_SDK_KEY not set");

  const client = new AgentClient(
    {
      baseURL: process.env.CROO_API_URL ?? "https://api.croo.network",
      wsURL: process.env.CROO_WS_URL ?? "wss://api.croo.network/ws",
      rpcURL: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    },
    sdkKey,
  );

  const instantServiceId = process.env.CROO_SERVICE_ID_INSTANT_USDC_PAY?.trim();

  console.log("\n=== Remifi live agent check ===\n");

  // Wallet balances
  const usdc = process.env.USDC_ADDRESS as `0x${string}`;
  const key =
    process.env.PROVIDER_PAYOUT_PRIVATE_KEY?.trim() ||
    process.env.ENS_REGISTRAR_PRIVATE_KEY?.trim();
  const aa = process.env.PROVIDER_AA_WALLET_ADDRESS?.trim();
  const payoutAddr = key ? accountFromPrivateKey(key).address : undefined;

  const pub = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL ?? "https://mainnet.base.org"),
  });
  const abi = parseAbi([
    "function balanceOf(address account) view returns (uint256)",
  ]);

  async function usdcBal(addr: string): Promise<string> {
    const b = await pub.readContract({
      address: usdc,
      abi,
      functionName: "balanceOf",
      args: [addr as `0x${string}`],
    });
    return `${Number(b) / 1_000_000} USDC (${b} base units)`;
  }

  console.log("Wallets:");
  if (payoutAddr) {
    console.log(`  Payout (ENS registrar fallback): ${payoutAddr}`);
    console.log(`    balance: ${await usdcBal(payoutAddr)}`);
  }
  if (aa) {
    console.log(`  Provider AA (dashboard):         ${aa}`);
    console.log(`    balance: ${await usdcBal(aa)}`);
  }

  // Order details
  console.log(`\nOrder: ${orderId}`);
  const order = await client.getOrder(orderId);
  const neg = await client.getNegotiation(order.negotiationId);

  console.log("\nOrder fields:");
  console.log(`  status:               ${order.status}`);
  console.log(`  serviceId:            ${order.serviceId}`);
  console.log(`  instant service env:  ${instantServiceId}`);
  console.log(`  price:                ${order.price ?? "(none)"}`);
  console.log(`  fundAmount:           ${order.fundAmount ?? "(none)"}`);
  console.log(`  fundToken:            ${order.fundToken ?? "(none)"}`);
  console.log(`  providerFundAddress:  ${order.providerFundAddress ?? "(none)"}`);
  console.log(`  payTxHash:            ${order.payTxHash ?? "(none)"}`);

  console.log("\nNegotiation:");
  console.log(`  fundAmount:           ${neg.fundAmount ?? "(none)"}`);
  console.log(`  requirements:         ${neg.requirements?.slice(0, 300)}`);

  try {
    const delivery = await client.getDelivery(orderId);
    console.log("\nDelivery:", JSON.stringify(delivery, null, 2));
  } catch (err) {
    console.log("\nDelivery fetch error:", err instanceof Error ? err.message : err);
  }

  // Test negotiate accept path for instant pay
  if (instantServiceId) {
    console.log("\n=== Test negotiate (instant pay, no pay) ===\n");
    const requirements = JSON.stringify({
      text: "send 0.1 usdc to blockdevrel.base.eth",
    });
    const testNeg = await client.negotiateOrder({
      serviceId: instantServiceId,
      requirements,
    });
    console.log(`negotiationId: ${testNeg.negotiationId}`);
    console.log(`initial status: ${testNeg.status}`);

    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 3_000));
      const latest = await client.getNegotiation(testNeg.negotiationId);
      console.log(
        `  [${(i + 1) * 3}s] status=${latest.status} fundAmount=${latest.fundAmount ?? "none"} fundToken=${latest.fundToken ?? "none"}`,
      );
      if (latest.status === "accepted" || latest.status === "rejected") {
        if (latest.orderId) {
          const testOrder = await client.getOrder(latest.orderId);
          console.log(
            `  order fundAmount=${testOrder.fundAmount ?? "none"} providerFundAddress=${testOrder.providerFundAddress ?? "none"}`,
          );
        }
        break;
      }
    }
  }

  console.log("\n=== Diagnosis ===\n");
  if (!order.fundAmount) {
    console.log(
      "ISSUE: Order has NO fundAmount — buyer was only charged service fee, not 0.1 USDC principal.",
    );
    console.log(
      "FIX: Agent Store → Instant USDC Pay → Require Fund Transfer = ON",
    );
  }
  if (!order.providerFundAddress) {
    console.log(
      "ISSUE: No providerFundAddress — provider accepted without fund transfer (wallet settlement fallback).",
    );
  }
  console.log("");
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

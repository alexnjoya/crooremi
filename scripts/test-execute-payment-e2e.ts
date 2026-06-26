/**
 * CAP E2E — hire executePaymentJob (fund transfer + on-chain split).
 *
 * Prereqs:
 *   1. npm run dev
 *   2. PROVIDER_AA_WALLET_ADDRESS + AGENT_WALLET_PRIVATE_KEY in .env
 *   3. Requester agent funded with USDC (principal + ~1.00 fee)
 *
 * Env:
 *   REQUESTER_FUND_AMOUNT=10000   (0.01 USDC in 6-decimal units)
 *
 * Run: npm run test:execute-payment
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { AgentClient, DeliverableType, EventType } from "@croo-network/sdk";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const sdkKey =
  process.env.CROO_REQUESTER_SDK_KEY?.trim() || process.env.CROO_SDK_KEY?.trim();
const serviceId =
  process.env.CROO_TARGET_SERVICE_ID?.trim() ||
  process.env.CROO_SERVICE_ID_EXECUTE_PAYMENT?.trim();
const fundAmount = process.env.REQUESTER_FUND_AMOUNT ?? "10000"; // 0.01 USDC

if (!sdkKey) throw new Error("Set CROO_REQUESTER_SDK_KEY");
if (!serviceId) throw new Error("Set CROO_SERVICE_ID_EXECUTE_PAYMENT");

const requirements =
  process.env.REQUESTER_REQUIREMENTS ??
  JSON.stringify({
    policyId: "pol_smoke_test",
    totalUsdc: fundAmount,
    policy: {
      name: "Smoke split",
      recipients: [
        {
          address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
          label: "team",
          bps: 5000,
        },
        {
          address: "0x1234567890123456789012345678901234567890",
          label: "ops",
          bps: 5000,
        },
      ],
    },
  });

async function main(): Promise<void> {
  console.log("[smoke] executePaymentJob E2E");
  console.log("[smoke] fundAmount:", fundAmount, "USDC base units");
  console.log("[smoke] service:", serviceId);

  const client = new AgentClient(
    {
      baseURL: process.env.CROO_API_URL ?? "https://api.croo.network",
      wsURL: process.env.CROO_WS_URL ?? "wss://api.croo.network/ws",
      rpcURL: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    },
    sdkKey,
  );

  const stream = await client.connectWebSocket();
  const timeout = setTimeout(() => {
    console.error("[smoke] timed out after 180s");
    stream.close();
    process.exit(1);
  }, 180_000);

  stream.on(EventType.OrderCreated, async (event) => {
    const orderId = event.order_id;
    if (!orderId) return;
    console.log(`[smoke] order ${orderId} created — paying`);
    try {
      const result = await client.payOrder(orderId);
      console.log(`[smoke] pay tx: ${result.txHash}`);
    } catch (err) {
      console.error("[smoke] pay error:", err);
      clearTimeout(timeout);
      process.exit(1);
    }
  });

  stream.on(EventType.OrderCompleted, async (event) => {
    const orderId = event.order_id;
    if (!orderId) return;

    try {
      const delivery = await client.getDelivery(orderId);
      const body =
        delivery.deliverableType === DeliverableType.Schema
          ? delivery.deliverableSchema
          : delivery.deliverableText;
      console.log("[smoke] SUCCESS — delivery:");
      console.log(body);
      const parsed = JSON.parse(body);
      if (!parsed.txHashes?.length) {
        throw new Error("Delivery missing txHashes — on-chain split did not complete");
      }
      console.log("[smoke] BaseScan:", parsed.baseExplorer ?? parsed.txHashes[0]);
    } catch (err) {
      console.error("[smoke] delivery error:", err);
      clearTimeout(timeout);
      process.exit(1);
    } finally {
      clearTimeout(timeout);
      stream.close();
      process.exit(0);
    }
  });

  const neg = await client.negotiateOrder({
    serviceId,
    requirements,
    fundAmount,
    fundToken:
      process.env.USDC_ADDRESS ?? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  });
  console.log(`[smoke] negotiation: ${neg.negotiationId}`);
}

main().catch((err) => {
  console.error("[smoke] fatal:", err);
  process.exit(1);
});

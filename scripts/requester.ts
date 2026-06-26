/**
 * CROO requester — hire Remifi from a second registered agent.
 *
 * Usage:
 *   npm run dev:requester
 *
 * Optional env:
 *   REQUESTER_REQUIREMENTS='{"name":"Team split",...}'  (createPolicy JSON)
 *   REQUESTER_FUND_AMOUNT=1000000  (executePaymentJob principal, 6-decimal USDC)
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { AgentClient, DeliverableType, EventType } from "@croo-network/sdk";

const repoRoot = resolve(process.cwd());

const envPath = resolve(repoRoot, ".env");
if (existsSync(envPath)) loadEnv({ path: envPath });

const sdkKey = process.env.CROO_REQUESTER_SDK_KEY ?? process.env.CROO_SDK_KEY;
const serviceId = process.env.CROO_TARGET_SERVICE_ID;

if (!sdkKey) {
  throw new Error("Set CROO_REQUESTER_SDK_KEY (or CROO_SDK_KEY) in .env");
}
if (!serviceId) {
  throw new Error("Set CROO_TARGET_SERVICE_ID in .env");
}

const requirements =
  process.env.REQUESTER_REQUIREMENTS ??
  JSON.stringify({
    name: "Team revenue split",
    recipients: [
      {
        address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
        label: "team",
        bps: 4000,
      },
      {
        address: "0x1234567890123456789012345678901234567890",
        label: "ops",
        bps: 3000,
      },
      {
        address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        label: "treasury",
        bps: 3000,
      },
    ],
  });

async function main(): Promise<void> {
  const client = new AgentClient(
    {
      baseURL: process.env.CROO_API_URL ?? "https://api.croo.network",
      wsURL: process.env.CROO_WS_URL ?? "wss://api.croo.network/ws",
      rpcURL: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    },
    sdkKey,
  );

  const stream = await client.connectWebSocket();

  stream.on(EventType.OrderCreated, async (event) => {
    const orderId = event.order_id;
    if (!orderId) return;

    console.log(`[requester] order ${orderId} created — paying`);
    try {
      const result = await client.payOrder(orderId);
      console.log(`[requester] payment tx: ${result.txHash}`);
    } catch (err) {
      console.error("[requester] pay error:", err);
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
      console.log("[requester] delivery:", body);
    } catch (err) {
      console.error("[requester] get delivery error:", err);
    } finally {
      stream.close();
      process.exit(0);
    }
  });

  const negotiateReq: Parameters<AgentClient["negotiateOrder"]>[0] = {
    serviceId,
    requirements,
  };

  if (process.env.REQUESTER_FUND_AMOUNT) {
    negotiateReq.fundAmount = process.env.REQUESTER_FUND_AMOUNT;
    negotiateReq.fundToken =
      process.env.USDC_ADDRESS ?? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  }

  const neg = await client.negotiateOrder(negotiateReq);
  console.log(`[requester] negotiation started: ${neg.negotiationId}`);

  process.on("SIGINT", () => {
    stream.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[requester] fatal:", err);
  process.exit(1);
});

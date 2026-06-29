/**
 * CAP E2E — hire createPolicy via requester agent.
 *
 * Prereqs:
 *   1. npm run dev          (provider Online)
 *   2. Second agent registered + CROO_REQUESTER_SDK_KEY in .env
 *   3. Requester AA wallet funded with USDC (service fee ~0.10)
 *
 * Run: npm run test:create-policy
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { AgentClient, DeliverableType, EventType } from "@croo-network/sdk";

const root = resolve(process.cwd());
loadEnv({ path: resolve(root, ".env"), override: true });

const sdkKey =
  process.env.CROO_REQUESTER_SDK_KEY?.trim() ||
  process.env.CROO_SDK_KEY?.trim();
const serviceId =
  process.env.CROO_SERVICE_ID_CREATE_POLICY?.trim() ||
  process.env.CROO_TARGET_SERVICE_ID?.trim();

if (!sdkKey) throw new Error("Set CROO_REQUESTER_SDK_KEY or CROO_SDK_KEY");
if (!serviceId) throw new Error("Set CROO_TARGET_SERVICE_ID or CROO_SERVICE_ID_CREATE_POLICY");

const useNl = process.env.SMOKE_USE_NL === "1";
const requirements =
  process.env.REQUESTER_REQUIREMENTS ??
  (useNl
    ? "Split revenue 40% to team at 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0, 30% to ops at 0x1234567890123456789012345678901234567890, 30% to treasury at 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
    : JSON.stringify({
        name: "Smoke test split",
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
      }));

async function main(): Promise<void> {
  console.log("[smoke] createPolicy E2E");
  console.log("[smoke] service:", serviceId);
  console.log("[smoke] input:", requirements.slice(0, 120) + (requirements.length > 120 ? "…" : ""));

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
    console.error("[smoke] timed out after 120s");
    stream.close();
    process.exit(1);
  }, 120_000);

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
      if (!parsed.policyId || !parsed.policy) {
        throw new Error("Delivery missing policyId or policy");
      }
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

  const neg = await client.negotiateOrder({ serviceId, requirements });
  console.log(`[smoke] negotiation: ${neg.negotiationId}`);
}

main().catch((err) => {
  console.error("[smoke] fatal:", err);
  process.exit(1);
});

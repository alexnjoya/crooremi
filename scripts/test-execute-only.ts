/**
 * Execute-only USDC Split test (uses existing policy).
 * Run: npx tsx scripts/test-execute-only.ts
 *
 * Env: CROO_REQUESTER_SDK_KEY, CROO_SERVICE_ID_EXECUTE_PAYMENT, USDC_ADDRESS
 *      EXECUTE_POLICY_ID (default pol_3838ea774da — truncated on purpose)
 *      EXECUTE_PRINCIPAL (default 100000 = 0.1 USDC)
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { AgentClient, DeliverableType, EventType } from "@croo-network/sdk";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const POLICY_ID = process.env.EXECUTE_POLICY_ID?.trim() ?? "pol_3838ea774da";
const PRINCIPAL = process.env.EXECUTE_PRINCIPAL?.trim() ?? "100000";

async function main(): Promise<void> {
  const sdkKey = process.env.CROO_REQUESTER_SDK_KEY?.trim();
  const executeServiceId = process.env.CROO_SERVICE_ID_EXECUTE_PAYMENT?.trim();
  const usdc = process.env.USDC_ADDRESS?.trim();

  if (!sdkKey) throw new Error("Set CROO_REQUESTER_SDK_KEY");
  if (!executeServiceId) throw new Error("Set CROO_SERVICE_ID_EXECUTE_PAYMENT");
  if (!usdc) throw new Error("Set USDC_ADDRESS");

  const client = new AgentClient(
    {
      baseURL: process.env.CROO_API_URL ?? "https://api.croo.network",
      wsURL: process.env.CROO_WS_URL ?? "wss://api.croo.network/ws",
      rpcURL: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    },
    sdkKey,
  );

  const requirements = JSON.stringify({
    policyId: POLICY_ID,
    principal_amount: Number(PRINCIPAL) / 1_000_000,
  });

  console.log("\nUSDC Split Execution (execute only)\n");
  console.log(`  policyId:  ${POLICY_ID}`);
  console.log(`  principal: ${PRINCIPAL} base units (${Number(PRINCIPAL) / 1_000_000} USDC)\n`);

  const stream = await client.connectWebSocket();

  const result = await new Promise<Record<string, unknown>>((resolveStep, rejectStep) => {
    let orderId: string | undefined;
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      settle(() => rejectStep(new Error("Timed out after 300s")));
    }, 300_000);

    stream.on(EventType.OrderCompleted, async (event) => {
      if (!orderId || event.order_id !== orderId) return;
      try {
        const delivery = await client.getDelivery(orderId);
        const body =
          delivery.deliverableType === DeliverableType.Schema
            ? delivery.deliverableSchema
            : delivery.deliverableText;
        const parsed = JSON.parse(body) as Record<string, unknown>;
        if (parsed.success === false) {
          throw new Error(String(parsed.error ?? "delivery failed"));
        }
        settle(() => resolveStep(parsed));
      } catch (err) {
        settle(() => rejectStep(err instanceof Error ? err : new Error(String(err))));
      }
    });

    client
      .negotiateOrder({
        serviceId: executeServiceId,
        requirements,
        fundAmount: PRINCIPAL,
        fundToken: usdc,
      })
      .then(async (neg) => {
        console.log(`  negotiation ${neg.negotiationId}`);
        for (let i = 0; i < 60; i++) {
          const latest = await client.getNegotiation(neg.negotiationId);
          if (latest.status === "rejected") {
            throw new Error("Negotiation rejected");
          }
          if (latest.status === "accepted" && latest.orderId) {
            orderId = latest.orderId;
            for (let j = 0; j < 90; j++) {
              const order = await client.getOrder(latest.orderId);
              if (order.status === "created") {
                console.log(`  order ${orderId} — paying…`);
                const pay = await client.payOrder(latest.orderId);
                console.log(`    pay tx: ${pay.txHash}`);
                return;
              }
              if (["paid", "delivered", "completed"].includes(order.status)) return;
              await new Promise((r) => setTimeout(r, 2_000));
            }
            throw new Error("Order never reached created status");
          }
          await new Promise((r) => setTimeout(r, 5_000));
        }
        throw new Error("Negotiation not accepted in time");
      })
      .catch((err) =>
        settle(() => rejectStep(err instanceof Error ? err : new Error(String(err)))),
      );
  });

  stream.close();
  console.log("\nDelivery:", JSON.stringify(result, null, 2));
  console.log("\n✓ USDC Split Execution succeeded\n");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message ?? err);
  process.exit(1);
});

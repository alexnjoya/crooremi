/**
 * E2E Instant USDC Pay via requester agent.
 * Run: npx tsx scripts/test-instant-usdc-pay.ts
 *
 * Env: CROO_REQUESTER_SDK_KEY, CROO_SERVICE_ID_INSTANT_USDC_PAY, USDC_ADDRESS
 * Default amount: 0.01 USDC (10000 base units)
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { AgentClient, DeliverableType, EventType } from "@croo-network/sdk";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const AMOUNT = process.env.INSTANT_PAY_AMOUNT?.trim() ?? "10000";
const TO = process.env.INSTANT_PAY_TO?.trim() ?? "blockdevrel.base.eth";

async function main(): Promise<void> {
  const sdkKey = process.env.CROO_REQUESTER_SDK_KEY?.trim();
  const serviceId = process.env.CROO_SERVICE_ID_INSTANT_USDC_PAY?.trim();
  const usdc = process.env.USDC_ADDRESS?.trim();

  if (!sdkKey) throw new Error("Set CROO_REQUESTER_SDK_KEY");
  if (!serviceId) throw new Error("Set CROO_SERVICE_ID_INSTANT_USDC_PAY");
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
    text: `send ${Number(AMOUNT) / 1_000_000} usdc to ${TO}`,
  });

  console.log("\nInstant USDC Pay E2E (requester agent)\n");
  console.log(`  to:      ${TO}`);
  console.log(`  amount:  ${AMOUNT} base units (${Number(AMOUNT) / 1_000_000} USDC)`);
  console.log(`  fund:    ${AMOUNT} + service fee via CAP\n`);

  const stream = await client.connectWebSocket();

  const result = await new Promise<Record<string, unknown>>((resolveStep, rejectStep) => {
    let orderId: string | undefined;
    let negotiationId = "";
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const timer = setTimeout(() => {
      settle(() => rejectStep(new Error("Timed out after 180s")));
    }, 180_000);

    const payWhenReady = async (id: string) => {
      for (let i = 0; i < 60; i++) {
        const order = await client.getOrder(id);
        if (order.status === "created") {
          console.log(`  order ${id} — paying…`);
          console.log(`    fundAmount:          ${order.fundAmount ?? "(none)"}`);
          console.log(`    providerFundAddress: ${order.providerFundAddress ?? "(none)"}`);
          const pay = await client.payOrder(id);
          console.log(`    pay tx: ${pay.txHash}`);
          return;
        }
        if (["paid", "delivered", "completed"].includes(order.status)) return;
        await new Promise((r) => setTimeout(r, 1_000));
      }
      throw new Error("Order never reached created status");
    };

    stream.on(EventType.OrderCompleted, async (event) => {
      if (!orderId || event.order_id !== orderId) return;
      try {
        const delivery = await client.getDelivery(orderId);
        const body =
          delivery.deliverableType === DeliverableType.Schema
            ? delivery.deliverableSchema
            : delivery.deliverableText;
        const parsed = JSON.parse(body) as Record<string, unknown>;
        const order = await client.getOrder(orderId);
        console.log("\n  Order after complete:");
        console.log(`    fundAmount:          ${order.fundAmount ?? "(none)"}`);
        console.log(`    providerFundAddress: ${order.providerFundAddress ?? "(none)"}`);
        console.log(`    price:               ${order.price ?? "(none)"}`);
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
        serviceId,
        requirements,
        fundAmount: AMOUNT,
        fundToken: usdc,
      })
      .then(async (neg) => {
        negotiationId = neg.negotiationId;
        console.log(`  negotiation ${negotiationId}`);

        for (let i = 0; i < 36; i++) {
          const latest = await client.getNegotiation(negotiationId);
          if (latest.status === "rejected") {
            throw new Error("Negotiation rejected — check provider logs / fund transfer ON");
          }
          if (latest.status === "accepted" && latest.orderId) {
            orderId = latest.orderId;
            await payWhenReady(latest.orderId);
            return;
          }
          await new Promise((r) => setTimeout(r, 5_000));
        }
        throw new Error("Negotiation not accepted in time");
      })
      .catch((err) =>
        settle(() => rejectStep(err instanceof Error ? err : new Error(String(err)))),
      );
  });

  console.log("\nDelivery:", JSON.stringify(result, null, 2));
  console.log("\n✓ Instant USDC Pay succeeded\n");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message ?? err);
  process.exit(1);
});

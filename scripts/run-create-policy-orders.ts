/**
 * Hire Remifi createPolicy twice (requester agent). Provider must be Online.
 * Run: npx tsx scripts/run-create-policy-orders.ts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { AgentClient, DeliverableType, EventType } from "@croo-network/sdk";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const sdkKey = process.env.CROO_REQUESTER_SDK_KEY?.trim();
const serviceId = process.env.CROO_SERVICE_ID_CREATE_POLICY?.trim();

const POLICIES = [
  {
    label: "Hackathon team split",
    requirements: JSON.stringify({
      name: "Hackathon team split",
      recipients: [
        {
          address: "0x59Ea18913F39187efb0Dc0d2CDB09Da5aF4dB4eD",
          label: "builder",
          bps: 7000,
        },
        {
          address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
          label: "treasury",
          bps: 3000,
        },
      ],
    }),
  },
  {
    label: "Revenue share Q2",
    requirements: JSON.stringify({
      name: "Revenue share Q2",
      recipients: [
        {
          address: "0x59Ea18913F39187efb0Dc0d2CDB09Da5aF4dB4eD",
          label: "ops",
          bps: 5000,
        },
        {
          address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
          label: "reserve",
          bps: 3000,
        },
        {
          address: "0x1234567890123456789012345678901234567890",
          label: "growth",
          bps: 2000,
        },
      ],
    }),
  },
];

async function runCreatePolicy(
  client: AgentClient,
  stream: Awaited<ReturnType<AgentClient["connectWebSocket"]>>,
  label: string,
  requirements: string,
): Promise<Record<string, unknown>> {
  return new Promise((resolveStep, rejectStep) => {
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
      settle(() => rejectStep(new Error(`${label}: timed out after 3 min`)));
    }, 180_000);

    const finishFromDelivery = async (id: string) => {
      const delivery = await client.getDelivery(id);
      const body =
        delivery.deliverableType === DeliverableType.Schema
          ? delivery.deliverableSchema
          : delivery.deliverableText;
      const parsed = JSON.parse(body) as Record<string, unknown>;
      if (parsed.success === false) {
        throw new Error(String(parsed.error ?? "delivery failed"));
      }
      settle(() => resolveStep(parsed));
    };

    const onOrderCreated = async (event: { negotiation_id?: string; order_id?: string }) => {
      if (event.negotiation_id !== negotiationId || !event.order_id) return;
      orderId = event.order_id;
      console.log(`  order ${orderId} — paying…`);
      try {
        const pay = await client.payOrder(orderId);
        console.log(`  pay tx: ${pay.txHash}`);
      } catch (err) {
        settle(() => rejectStep(err instanceof Error ? err : new Error(String(err))));
      }
    };

    stream.on(EventType.OrderCreated, onOrderCreated);

    stream.on(EventType.OrderCompleted, async (event) => {
      if (!orderId || event.order_id !== orderId) return;
      try {
        await finishFromDelivery(orderId);
      } catch (err) {
        settle(() => rejectStep(err instanceof Error ? err : new Error(String(err))));
      }
    });

    const poll = async () => {
      for (let i = 0; i < 36; i++) {
        if (settled) return;
        await new Promise((r) => setTimeout(r, 5_000));
        if (!orderId) continue;
        try {
          const order = await client.getOrder(orderId);
          if (order.status === "completed" || order.status === "delivered") {
            await finishFromDelivery(orderId);
            return;
          }
        } catch (err) {
          if (settled) return;
          if (err instanceof Error && err.message.includes("delivery failed")) {
            settle(() => rejectStep(err));
            return;
          }
        }
      }
    };

    client
      .negotiateOrder({ serviceId: serviceId!, requirements })
      .then((neg) => {
        negotiationId = neg.negotiationId;
        console.log(`  negotiation ${negotiationId}`);
        void poll();
      })
      .catch((err) =>
        settle(() => rejectStep(err instanceof Error ? err : new Error(String(err)))),
      );
  });
}

async function main(): Promise<void> {
  if (!sdkKey) throw new Error("Set CROO_REQUESTER_SDK_KEY");
  if (!serviceId) throw new Error("Set CROO_SERVICE_ID_CREATE_POLICY");

  const client = new AgentClient(
    {
      baseURL: process.env.CROO_API_URL ?? "https://api.croo.network",
      wsURL: process.env.CROO_WS_URL ?? "wss://api.croo.network/ws",
      rpcURL: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    },
    sdkKey,
  );

  const stream = await client.connectWebSocket();
  console.log("\nRequester connected — hiring createPolicy × 2\n");

  try {
    for (let i = 0; i < POLICIES.length; i++) {
      const { label, requirements } = POLICIES[i];
      console.log(`── Order ${i + 1}/2 · ${label} ──`);
      const delivery = await runCreatePolicy(client, stream, label, requirements);
      console.log(`  ✓ policyId: ${delivery.policyId}`);
      console.log("");
    }
    console.log("Both createPolicy orders completed.\n");
  } finally {
    stream.close();
  }
}

main().catch((err) => {
  console.error("\nFailed:", err.message ?? err);
  process.exit(1);
});

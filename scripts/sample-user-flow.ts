/**
 * Sample user flow: createPolicy → executePaymentJob per recipient.
 * Run: npm run sample:flow  (requires npm run dev + funded requester agent)
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { AgentClient, DeliverableType, EventType } from "@croo-network/sdk";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const sdkKey =
  process.env.CROO_REQUESTER_SDK_KEY?.trim() || process.env.CROO_SDK_KEY?.trim();
const policyServiceId = process.env.CROO_SERVICE_ID_CREATE_POLICY?.trim();
const executeServiceId = process.env.CROO_SERVICE_ID_EXECUTE_PAYMENT?.trim();
const usdcAddress =
  process.env.USDC_ADDRESS ?? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const totalFund = process.env.SAMPLE_FUND_AMOUNT ?? "1000";

const samplePolicyRequirements = JSON.stringify({
  name: "Hackathon revenue split",
  recipients: [
    {
      address: "0x59Ea18913F39187efb0Dc0d2CDB09Da5aF4dB4eD",
      label: "devrel",
      bps: 6000,
    },
    {
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      label: "treasury",
      bps: 4000,
    },
  ],
});

type Step = {
  name: string;
  serviceId: string;
  requirements: string;
  fundAmount?: string;
};

async function main(): Promise<void> {
  if (!sdkKey) throw new Error("Set CROO_REQUESTER_SDK_KEY");
  if (!policyServiceId || !executeServiceId) {
    throw new Error("Set CROO_SERVICE_ID_CREATE_POLICY and CROO_SERVICE_ID_EXECUTE_PAYMENT");
  }

  console.log("\n══ Sample user flow: policy → execute ══\n");
  console.log("Step 1 input (createPolicy):");
  console.log(JSON.stringify(JSON.parse(samplePolicyRequirements), null, 2));
  console.log(`\nTotal payout pool: ${totalFund} USDC base units (${Number(totalFund) / 1e6} USDC)\n`);

  const client = new AgentClient(
    {
      baseURL: process.env.CROO_API_URL ?? "https://api.croo.network",
      wsURL: process.env.CROO_WS_URL ?? "wss://api.croo.network/ws",
      rpcURL: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    },
    sdkKey,
  );

  const stream = await client.connectWebSocket();

  async function runStep(step: Step): Promise<Record<string, unknown>> {
    return new Promise((resolveStep, rejectStep) => {
      let orderId: string | undefined;
      let settled = false;

      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn();
      };

      const timer = setTimeout(() => {
        settle(() => rejectStep(new Error(`${step.name} timed out after 3 min`)));
      }, 180_000);

      const onCreated = async (event: { negotiation_id?: string; order_id?: string }) => {
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

      const onCompleted = async (event: { order_id?: string }) => {
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
      };

      let negotiationId = "";

      const poll = async () => {
        for (let i = 0; i < 36; i++) {
          if (settled) return;
          await new Promise((r) => setTimeout(r, 5_000));
          if (!orderId) continue;
          try {
            const order = await client.getOrder(orderId);
            if (order.status === "completed" || order.status === "delivered") {
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

      stream.on(EventType.OrderCreated, onCreated);
      stream.on(EventType.OrderCompleted, onCompleted);

      const negotiateReq: Parameters<AgentClient["negotiateOrder"]>[0] = {
        serviceId: step.serviceId,
        requirements: step.requirements,
      };
      if (step.fundAmount) {
        negotiateReq.fundAmount = step.fundAmount;
        negotiateReq.fundToken = usdcAddress;
      }

      client
        .negotiateOrder(negotiateReq)
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

  try {
    console.log("── Step 1 · createPolicy ──");
    const policyDelivery = await runStep({
      name: "createPolicy",
      serviceId: policyServiceId,
      requirements: samplePolicyRequirements,
    });

    const policyId = policyDelivery.policyId as string;
    const policy = policyDelivery.policy as {
      name: string;
      recipients: Array<{ address: string; label: string; bps: number; ens?: string }>;
    };

    if (!policyId || !policy?.recipients?.length) {
      throw new Error("createPolicy delivery missing policyId or recipients");
    }

    console.log("\n✓ Policy created:");
    console.log(`  policyId: ${policyId}`);
    for (const r of policy.recipients) {
      console.log(
        `  ${r.label}: ${r.bps / 100}% → ${r.ens ?? r.address}`,
      );
    }

    const total = BigInt(totalFund);
    const txHashes: string[] = [];

    for (const recipient of policy.recipients) {
      const amount = ((total * BigInt(recipient.bps)) / 10_000n).toString();
      const legInput = {
        policyId,
        recipient: {
          address: recipient.address,
          label: recipient.label,
          amount,
        },
      };

      console.log(`\n── Step 2 · executePaymentJob → ${recipient.label} (${amount} units) ──`);
      console.log("  input:", JSON.stringify(legInput));

      const legDelivery = await runStep({
        name: `execute→${recipient.label}`,
        serviceId: executeServiceId,
        requirements: JSON.stringify(legInput),
        fundAmount: amount,
      });

      const legTxs = legDelivery.txHashes as string[] | undefined;
      if (!legTxs?.length) throw new Error(`No txHashes for ${recipient.label}`);
      txHashes.push(...legTxs);
      console.log(`  ✓ CROO direct → ${recipient.label}: ${legTxs[0]}`);
    }

    console.log("\n══ Flow complete ══\n");
    console.log(`policyId:  ${policyId}`);
    console.log(`payouts:   ${txHashes.length} leg(s), ${totalFund} base units total`);
    console.log(`explorer:  https://basescan.org/tx/${txHashes[0]}`);
    console.log("\nA user agent: hire createPolicy → read policyId → hire execute per recipient.\n");
  } finally {
    stream.close();
  }
}

main().catch((err) => {
  console.error("\nFlow failed:", err);
  process.exit(1);
});

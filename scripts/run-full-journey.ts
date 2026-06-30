/**
 * Full Remifi journey: ENS → createPolicy → auto-execute all legs.
 * Provider must be Online. Requester AA wallet needs USDC for fees + principal.
 *
 * Run: npm run journey
 *
 * Env:
 *   JOURNEY_ORG          — org label (default: random journeyXXXX)
 *   JOURNEY_SKIP_ENS=1   — skip step 1 if names already registered
 *   JOURNEY_FUND_AMOUNT  — principal in 6-decimal USDC units (default: 100000 = 0.10 USDC)
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { AgentClient, DeliverableType, EventType } from "@croo-network/sdk";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const sdkKey = process.env.CROO_REQUESTER_SDK_KEY?.trim();
const ensServiceId = process.env.CROO_SERVICE_ID_CREATE_ENS?.trim();
const policyServiceId = process.env.CROO_SERVICE_ID_CREATE_POLICY?.trim();
const executeServiceId = process.env.CROO_SERVICE_ID_EXECUTE_PAYMENT?.trim();

const JOURNEY_ORG =
  process.env.JOURNEY_ORG?.trim() ?? `journey${Date.now().toString(36).slice(-5)}`;
const SKIP_ENS = process.env.JOURNEY_SKIP_ENS === "1";
const FUND_AMOUNT = process.env.JOURNEY_FUND_AMOUNT?.trim() ?? "100000";

const RECIPIENTS = [
  {
    subname: "wallet-a",
    address: "0xB98cFAC37b8bD7f549789718aC17F8aEE7cE0c37" as const,
    label: "wallet-a",
    bps: 3000,
  },
  {
    subname: "wallet-b",
    address: "0x173dbd987ea65f8dfd2d15ea2780acb615bdd8d9" as const,
    label: "wallet-b",
    bps: 6000,
  },
];

type ExecutionHireGuide = {
  step: number;
  requirements: {
    policyId: string;
    totalUsdc: string;
    recipient: string;
  };
};

type JourneyNextStep = {
  service: string;
  requirements: Record<string, unknown>;
};

async function runCapOrder(
  client: AgentClient,
  stream: Awaited<ReturnType<AgentClient["connectWebSocket"]>>,
  label: string,
  serviceId: string,
  requirements: string,
  timeoutMs = 180_000,
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
      settle(() => rejectStep(new Error(`${label}: timed out after ${timeoutMs / 1000}s`)));
    }, timeoutMs);

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

    const payOrder = async (id: string) => {
      if (orderId) return;
      orderId = id;
      console.log(`  order ${orderId} — paying…`);
      try {
        const pay = await client.payOrder(orderId);
        console.log(`  pay tx: ${pay.txHash}`);
      } catch (err) {
        settle(() => rejectStep(err instanceof Error ? err : new Error(String(err))));
      }
    };

    const onOrderCreated = async (event: { negotiation_id?: string; order_id?: string }) => {
      if (event.negotiation_id !== negotiationId || !event.order_id) return;
      await payOrder(event.order_id);
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
      const ticks = Math.ceil(timeoutMs / 5_000);
      for (let i = 0; i < ticks; i++) {
        if (settled) return;

        if (!orderId && negotiationId) {
          try {
            const neg = await client.getNegotiation(negotiationId);
            if (neg.status === "rejected") {
              settle(() => rejectStep(new Error(`${label}: negotiation rejected`)));
              return;
            }
            if (neg.status === "accepted" && neg.orderId) {
              await payOrder(neg.orderId);
            }
          } catch {
            // retry on next tick
          }
        }

        if (orderId) {
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

        await new Promise((r) => setTimeout(r, 5_000));
      }
    };

    client
      .negotiateOrder({ serviceId, requirements })
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

function buildEnsRequirements(org: string): string {
  return JSON.stringify({
    org,
    names: RECIPIENTS.map((r) => ({
      subname: r.subname,
      address: r.address,
    })),
  });
}

function buildPolicyRequirements(org: string, totalUsdc: string): string {
  return JSON.stringify({
    org,
    totalUsdc,
    name: `${org} split`,
    recipients: RECIPIENTS.map((r) => ({
      subname: r.subname,
      address: r.address,
      label: r.label,
      bps: r.bps,
    })),
  });
}

async function main(): Promise<void> {
  if (!sdkKey) throw new Error("Set CROO_REQUESTER_SDK_KEY");
  if (!ensServiceId) throw new Error("Set CROO_SERVICE_ID_CREATE_ENS");
  if (!policyServiceId) throw new Error("Set CROO_SERVICE_ID_CREATE_POLICY");
  if (!executeServiceId) throw new Error("Set CROO_SERVICE_ID_EXECUTE_PAYMENT");

  const client = new AgentClient(
    {
      baseURL: process.env.CROO_API_URL ?? "https://api.croo.network",
      wsURL: process.env.CROO_WS_URL ?? "wss://api.croo.network/ws",
      rpcURL: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    },
    sdkKey,
  );

  const stream = await client.connectWebSocket();
  console.log("\nFull journey — ENS → Policy → Execution\n");
  console.log(`Org: ${JOURNEY_ORG}`);
  console.log(`Principal (totalUsdc): ${FUND_AMOUNT}`);
  console.log(`Skip ENS: ${SKIP_ENS}\n`);

  let policyRequirements = buildPolicyRequirements(JOURNEY_ORG, FUND_AMOUNT);
  let step = 1;

  try {
    if (!SKIP_ENS) {
      console.log(`── Step ${step} · ENS Payout Identity ──`);
      const ensDelivery = await runCapOrder(
        client,
        stream,
        "createEnsName",
        ensServiceId,
        buildEnsRequirements(JOURNEY_ORG),
        600_000,
      );

      const names =
        "names" in ensDelivery
          ? (ensDelivery.names as Array<{ ens: string }>)
          : [{ ens: String(ensDelivery.ens) }];
      for (const n of names) {
        console.log(`  ✓ ${n.ens}`);
      }

      const guide = ensDelivery.journeyGuide as
        | { nextStep: JourneyNextStep }
        | undefined;
      if (guide?.nextStep?.requirements) {
        policyRequirements = JSON.stringify(guide.nextStep.requirements);
        console.log("  → policy requirements ready from journeyGuide\n");
      } else {
        console.log("");
      }
      step += 1;
    }

    console.log(`── Step ${step} · USDC Split Policy ──`);
    const policyDelivery = await runCapOrder(
      client,
      stream,
      "createPolicy",
      policyServiceId,
      policyRequirements,
    );
    const policyId = String(policyDelivery.policyId);
    console.log(`  ✓ policyId: ${policyId}`);

    const recipients = policyDelivery.policy as
      | { recipients: Array<{ ens?: string }> }
      | undefined;
    for (const r of recipients?.recipients ?? []) {
      if (r.ens) console.log(`  ✓ linked ${r.ens}`);
    }

    const execGuide = policyDelivery.executionGuide as
      | { hires: ExecutionHireGuide[] }
      | undefined;
    const hires = execGuide?.hires ?? [];

    if (hires.length === 0) {
      throw new Error("Policy delivery missing executionGuide.hires");
    }

    console.log(`  → ${hires.length} execution hire(s) queued\n`);
    step += 1;

    for (const hire of hires) {
      console.log(
        `── Step ${step} · Execute · ${hire.requirements.recipient} ──`,
      );
      const execDelivery = await runCapOrder(
        client,
        stream,
        `execute-${hire.requirements.recipient}`,
        executeServiceId,
        JSON.stringify(hire.requirements),
      );
      const txHashes = execDelivery.txHashes as string[] | undefined;
      console.log(`  ✓ tx: ${txHashes?.[0] ?? "n/a"}\n`);
      step += 1;
    }

    console.log("Full journey completed (ENS → Policy → Execution).\n");
  } finally {
    stream.close();
  }
}

main().catch((err) => {
  console.error("\nFailed:", err.message ?? err);
  process.exit(1);
});

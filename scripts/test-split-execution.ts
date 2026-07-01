/**
 * E2E USDC Split Execution via requester agent (Agent Store schema shape).
 * Run: npx tsx scripts/test-split-execution.ts
 *
 * Env: CROO_REQUESTER_SDK_KEY, CROO_SERVICE_ID_CREATE_POLICY,
 *      CROO_SERVICE_ID_EXECUTE_PAYMENT, USDC_ADDRESS
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { AgentClient, DeliverableType, EventType } from "@croo-network/sdk";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const PRINCIPAL = process.env.EXECUTE_PRINCIPAL?.trim() ?? "10000";
const POLICY_TEXT =
  process.env.EXECUTE_POLICY_TEXT?.trim() ??
  "split 60% to team at blockdevrel.base.eth and 40% to ops at 0xB98cFAC37b8bD7f549789718aC17F8aEE7cE0c37";

type CapOrderFund = { fundAmount: string; fundToken: string };

async function runCapOrder(
  client: AgentClient,
  stream: Awaited<ReturnType<AgentClient["connectWebSocket"]>>,
  label: string,
  serviceId: string,
  requirements: string,
  fund?: CapOrderFund,
): Promise<Record<string, unknown>> {
  const usdc = process.env.USDC_ADDRESS!.trim();

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
      settle(() => rejectStep(new Error(`${label}: timed out after 180s`)));
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
        ...(fund ? { fundAmount: fund.fundAmount, fundToken: fund.fundToken } : {}),
      })
      .then(async (neg) => {
        negotiationId = neg.negotiationId;
        console.log(`  negotiation ${negotiationId}`);

        for (let i = 0; i < 36; i++) {
          const latest = await client.getNegotiation(negotiationId);
          if (latest.status === "rejected") {
            throw new Error(`${label}: negotiation rejected`);
          }
          if (latest.status === "accepted" && latest.orderId) {
            orderId = latest.orderId;
            await payWhenReady(latest.orderId);
            return;
          }
          await new Promise((r) => setTimeout(r, 5_000));
        }
        throw new Error(`${label}: negotiation not accepted in time`);
      })
      .catch((err) =>
        settle(() => rejectStep(err instanceof Error ? err : new Error(String(err)))),
      );
  });
}

async function main(): Promise<void> {
  const sdkKey = process.env.CROO_REQUESTER_SDK_KEY?.trim();
  const policyServiceId = process.env.CROO_SERVICE_ID_CREATE_POLICY?.trim();
  const executeServiceId = process.env.CROO_SERVICE_ID_EXECUTE_PAYMENT?.trim();
  const usdc = process.env.USDC_ADDRESS?.trim();

  if (!sdkKey) throw new Error("Set CROO_REQUESTER_SDK_KEY");
  if (!policyServiceId) throw new Error("Set CROO_SERVICE_ID_CREATE_POLICY");
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

  const stream = await client.connectWebSocket();
  const principalUsdc = Number(PRINCIPAL) / 1_000_000;

  console.log("\nUSDC Split Execution E2E (requester agent)\n");
  console.log(`  principal: ${PRINCIPAL} base units (${principalUsdc} USDC)`);

  try {
    console.log("\n── Step 1 · USDC Split Policy ──");
    const policyDelivery = await runCapOrder(
      client,
      stream,
      "createPolicy",
      policyServiceId,
      JSON.stringify({ text: POLICY_TEXT }),
    );
    const policyId = String(policyDelivery.policyId);
    console.log(`  ✓ policyId: ${policyId}`);

    const payroll = (policyDelivery.executionGuide as { payroll?: { fundAmount: string } })
      ?.payroll;
    const fundAmount = payroll?.fundAmount ?? PRINCIPAL;

    console.log("\n── Step 2 · USDC Split Execution (Agent Store schema) ──");
    const requirements = JSON.stringify({
      policy_id: policyId,
      principal_amount: principalUsdc,
    });
    console.log(`  requirements: ${requirements}`);

    const execDelivery = await runCapOrder(
      client,
      stream,
      "executePayment",
      executeServiceId,
      requirements,
      { fundAmount, fundToken: usdc },
    );

    console.log("\nDelivery:", JSON.stringify(execDelivery, null, 2));
    console.log("\n✓ USDC Split Execution succeeded\n");
  } finally {
    stream.close();
  }
}

main().catch((err) => {
  console.error("\nFAILED:", err.message ?? err);
  process.exit(1);
});

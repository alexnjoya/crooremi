/**
 * Diagnose policy lookup for split execution.
 * Run: npx tsx scripts/diagnose-policy-lookup.ts [policyId] [executeOrderId]
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { AgentClient } from "@croo-network/sdk";
import { loadPolicyFromCompletedOrders } from "../src/policy/policy-lookup.js";
import { loadPolicy, loadPolicyWithFallback } from "../src/policy/store.js";
import { initPolicyDatabase } from "../src/policy/database.js";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const policyId = process.argv[2]?.trim() ?? "pol_3838ea774da";
const executeOrderId = process.argv[3]?.trim() ?? "0da0e98a-9095-47fa-9610-cf5ebbb04f34";
const createPolicyServiceId = process.env.CROO_SERVICE_ID_CREATE_POLICY?.trim();

async function main(): Promise<void> {
  const providerKey = process.env.CROO_SDK_KEY?.trim();
  if (!providerKey) throw new Error("Set CROO_SDK_KEY");
  if (!createPolicyServiceId) throw new Error("Set CROO_SERVICE_ID_CREATE_POLICY");

  await initPolicyDatabase();

  const client = new AgentClient(
    {
      baseURL: process.env.CROO_API_URL ?? "https://api.croo.network",
      wsURL: process.env.CROO_WS_URL ?? "wss://api.croo.network/ws",
      rpcURL: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    },
    providerKey,
  );

  console.log("\n=== Policy lookup diagnose ===\n");
  console.log("policyId:", policyId);
  console.log("createPolicy service:", createPolicyServiceId);

  const local = await loadPolicy(policyId);
  console.log("\nlocal store:", local ? "FOUND" : "missing");

  const orders = await client.listOrders({ role: "provider", pageSize: 100 });
  console.log("\nprovider orders:", orders.length);

  const policyOrders = orders.filter((o) => o.serviceId === createPolicyServiceId);
  console.log("createPolicy orders:", policyOrders.length);
  for (const o of policyOrders.slice(0, 10)) {
    console.log(`  ${o.orderId} status=${o.status} requester=${o.requesterAgentId?.slice(0, 8)}…`);
    try {
      const d = await client.getDelivery(o.orderId);
      const body = d.deliverableSchema ?? d.deliverableText ?? "";
      const preview = typeof body === "string" ? body.slice(0, 120) : JSON.stringify(body).slice(0, 120);
      const match = String(body).includes(policyId);
      console.log(`    delivery policy match=${match} preview=${preview}…`);
    } catch (e) {
      console.log(`    delivery error: ${e instanceof Error ? e.message : e}`);
    }
  }

  const execOrder = await client.getOrder(executeOrderId);
  const execNeg = await client.getNegotiation(execOrder.negotiationId);
  console.log("\nfailed execute order:");
  console.log("  requesterAgentId:", execOrder.requesterAgentId ?? execNeg.requesterAgentId);
  console.log("  requirements:", execNeg.requirements?.slice(0, 200));

  const fromOrders = await loadPolicyFromCompletedOrders(
    client,
    policyId,
    createPolicyServiceId,
    execOrder.requesterAgentId ?? execNeg.requesterAgentId,
  );
  console.log("\nloadPolicyFromCompletedOrders:", fromOrders ? "FOUND" : "missing");
  if (fromOrders) {
    console.log("  recipients:", fromOrders.policy.recipients.length);
  }

  const withFallback = await loadPolicyWithFallback(policyId, {
    client,
    createPolicyServiceId,
    requesterAgentId: execOrder.requesterAgentId ?? execNeg.requesterAgentId,
  });
  console.log("\nloadPolicyWithFallback:", withFallback ? "FOUND" : "missing");

  const sampleOrderId = policyOrders.find((o) => o.status === "completed")?.orderId;
  if (sampleOrderId) {
    const sample = await client.getDelivery(sampleOrderId);
    console.log("\nsample delivery JSON:", JSON.stringify(sample, null, 2).slice(0, 3000));
  }
  console.log("");
}

main().catch((err) => {
  console.error("Failed:", err.message ?? err);
  process.exit(1);
});

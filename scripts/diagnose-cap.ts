/**
 * Diagnose CAP negotiation — why orders stall after negotiate.
 * Run: npx tsx scripts/diagnose-cap.ts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { AgentClient } from "@croo-network/sdk";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const requesterKey = process.env.CROO_REQUESTER_SDK_KEY?.trim();
const policyServiceId = process.env.CROO_SERVICE_ID_CREATE_POLICY?.trim();

async function main(): Promise<void> {
  if (!requesterKey) throw new Error("Set CROO_REQUESTER_SDK_KEY");
  if (!policyServiceId) throw new Error("Set CROO_SERVICE_ID_CREATE_POLICY");

  const client = new AgentClient(
    {
      baseURL: process.env.CROO_API_URL ?? "https://api.croo.network",
      wsURL: process.env.CROO_WS_URL ?? "wss://api.croo.network/ws",
      rpcURL: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    },
    requesterKey,
  );

  const requirements = JSON.stringify({
    name: "Diagnose ping",
    recipients: [
      {
        address: "0xB98cFAC37b8bD7f549789718aC17F8aEE7cE0c37",
        label: "wallet-a",
        bps: 10000,
      },
    ],
  });

  console.log("\nCAP diagnose — negotiate createPolicy, poll 60s\n");

  const neg = await client.negotiateOrder({
    serviceId: policyServiceId,
    requirements,
  });
  console.log("negotiationId:", neg.negotiationId);
  console.log("initial status:", neg.status);

  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 5_000));
    const latest = await client.getNegotiation(neg.negotiationId);
    console.log(`  [${(i + 1) * 5}s] negotiation status: ${latest.status}`);

    if (latest.status === "accepted" || latest.status === "rejected") {
      if (latest.orderId) {
        const order = await client.getOrder(latest.orderId);
        console.log("  order status:", order.status);
      }
      break;
    }
  }

  const final = await client.getNegotiation(neg.negotiationId);
  console.log("\nfinal negotiation:", final.status);
  if (final.status === "pending") {
    console.log(
      "\n→ Provider never accepted. Check Railway: provider WebSocket online, " +
        "CROO_SDK_KEY matches dashboard, no duplicate local dev.",
    );
  }
  console.log("");
}

main().catch((err) => {
  console.error("Failed:", err.message ?? err);
  process.exit(1);
});

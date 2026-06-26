/**
 * Verify Remifi agent config + CAP services (no WebSocket).
 * Run: npm run verify:agent
 */
import { createAgentClient } from "../src/cap/client.js";
import { env } from "../src/config.js";
import { interpretPolicyFromRequirements } from "../src/policy/interpreter.js";

type Row = { label: string; ok: boolean; detail?: string };

const rows: Row[] = [];

function row(label: string, ok: boolean, detail?: string): void {
  rows.push({ label, ok, detail });
  const mark = ok ? "✓" : "✗";
  console.log(`  ${mark} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function verifyService(
  label: string,
  serviceId: string | undefined,
  requirements: string,
): Promise<void> {
  if (!serviceId) {
    row(label, false, "service ID missing in .env");
    return;
  }

  const client = createAgentClient();
  try {
    const neg = await client.negotiateOrder({ serviceId, requirements });
    row(label, true, `negotiation ${neg.negotiationId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    row(label, false, message);
  }
}

console.log("\nRemifi agent verify\n");

row("CROO_SDK_KEY", env.CROO_SDK_KEY.startsWith("croo_sk_"));
row(
  "createPolicy service ID configured",
  Boolean(env.CROO_SERVICE_ID_CREATE_POLICY),
  env.CROO_SERVICE_ID_CREATE_POLICY,
);
row(
  "executePaymentJob service ID configured",
  Boolean(env.CROO_SERVICE_ID_EXECUTE_PAYMENT),
  env.CROO_SERVICE_ID_EXECUTE_PAYMENT,
);
row("PROVIDER_AA_WALLET_ADDRESS", Boolean(env.PROVIDER_AA_WALLET_ADDRESS));
row(
  "AI key (NL createPolicy)",
  Boolean(env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY),
);

console.log("\nLocal policy (ENS basename):");
try {
  const delivery = await interpretPolicyFromRequirements(
    JSON.stringify({
      name: "ENS smoke",
      recipients: [
        { address: "blockdevrel.base.eth", label: "devrel", bps: 5000 },
        {
          address: "0x1234567890123456789012345678901234567890",
          label: "ops",
          bps: 5000,
        },
      ],
    }),
  );
  const hasBasename = delivery.policy.recipients.some((r) =>
    r.ens?.includes(".base.eth"),
  );
  row(
    "createPolicy resolves blockdevrel.base.eth",
    hasBasename && delivery.policy.recipients[0]?.address.startsWith("0x"),
    delivery.policy.recipients[0]?.ens,
  );
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  row("createPolicy resolves blockdevrel.base.eth", false, message);
}

console.log("\nCAP service reachability (negotiate only):");
await verifyService(
  "createPolicy on CAP",
  env.CROO_SERVICE_ID_CREATE_POLICY,
  JSON.stringify({
    name: "Verify split",
    recipients: [
      {
        address: "blockdevrel.base.eth",
        label: "team",
        bps: 10000,
      },
    ],
  }),
);

await verifyService(
  "executePaymentJob on CAP",
  env.CROO_SERVICE_ID_EXECUTE_PAYMENT,
  JSON.stringify({
    policyId: "pol_verify",
    totalUsdc: "1000000",
    policy: {
      name: "Verify",
      recipients: [
        {
          address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
          label: "team",
          bps: 10000,
        },
      ],
    },
  }),
);

const failed = rows.filter((r) => !r.ok).length;
console.log(`\n${rows.length - failed}/${rows.length} checks passed.\n`);

if (failed > 0) {
  console.log("If CAP shows SERVICE_NOT_FOUND:");
  console.log("  1. Open https://agent.croo.network → your agent → Configure");
  console.log("  2. Save each service, then copy fresh service IDs into .env");
  console.log("  3. Run only ONE provider: npm run dev (duplicate WS keys break delivery)\n");
}

process.exit(failed === 0 ? 0 : 1);

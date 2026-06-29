/** Verify agent config + CAP services. Run: npm run verify:agent */
import { createAgentClient } from "../src/cap/client.js";
import { env } from "../src/config.js";
import { interpretPolicyFromRequirements } from "../src/policy/interpreter.js";

type Row = { label: string; ok: boolean; detail?: string };
const rows: Row[] = [];

function row(label: string, ok: boolean, detail?: string): void {
  rows.push({ label, ok, detail });
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
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
    if (message.includes("cannot negotiate own service")) {
      row(label, true, "service exists (use a 2nd agent to hire)");
      return;
    }
    row(label, false, message);
  }
}

console.log("\nRemifi agent verify\n");

row("CROO_SDK_KEY", env.CROO_SDK_KEY.startsWith("croo_sk_"));
row("createEnsName service ID", Boolean(env.CROO_SERVICE_ID_CREATE_ENS), env.CROO_SERVICE_ID_CREATE_ENS);
row("createPolicy service ID", Boolean(env.CROO_SERVICE_ID_CREATE_POLICY), env.CROO_SERVICE_ID_CREATE_POLICY);
row("executePaymentJob service ID", Boolean(env.CROO_SERVICE_ID_EXECUTE_PAYMENT), env.CROO_SERVICE_ID_EXECUTE_PAYMENT);
row("AI key (NL createPolicy)", Boolean(env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY));

console.log("\nLocal policy:");
try {
  const delivery = await interpretPolicyFromRequirements(
    JSON.stringify({
      name: "Smoke split",
      recipients: [
        { address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0", label: "team", bps: 6000 },
        { address: "0x1234567890123456789012345678901234567890", label: "ops", bps: 4000 },
      ],
    }),
  );
  row("createPolicy JSON parse", Boolean(delivery.policyId), delivery.policyId);
} catch (err) {
  row("createPolicy JSON parse", false, err instanceof Error ? err.message : String(err));
}

console.log("\nCAP negotiate:");
await verifyService(
  "createEnsName",
  env.CROO_SERVICE_ID_CREATE_ENS,
  JSON.stringify({ org: "acme", subname: "payroll", address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0" }),
);
await verifyService(
  "createPolicy",
  env.CROO_SERVICE_ID_CREATE_POLICY,
  JSON.stringify({
    name: "Verify split",
    recipients: [{ address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0", label: "team", bps: 10000 }],
  }),
);
await verifyService(
  "executePaymentJob",
  env.CROO_SERVICE_ID_EXECUTE_PAYMENT,
  JSON.stringify({
    policyId: "pol_verify",
    recipient: { address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0", label: "team", amount: "1000000" },
  }),
);

const failed = rows.filter((r) => !r.ok).length;
console.log(`\n${rows.length - failed}/${rows.length} checks passed.\n`);
process.exit(failed === 0 ? 0 : 1);

/** Validate .env. Run: npm run setup:check */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

const root = resolve(process.cwd());
loadEnv({ path: resolve(root, ".env"), override: true });

type Check = { label: string; ok: boolean; hint?: string };

const checks: Check[] = [
  {
    label: "CROO_SDK_KEY",
    ok: Boolean(process.env.CROO_SDK_KEY?.startsWith("croo_sk_")),
    hint: "Copy from agent.croo.network → My Agents → API Key",
  },
  {
    label: "CROO_SERVICE_ID_CREATE_POLICY",
    ok: Boolean(process.env.CROO_SERVICE_ID_CREATE_POLICY),
    hint: "Dashboard → createPolicy service ID",
  },
  {
    label: "CROO_SERVICE_ID_EXECUTE_PAYMENT",
    ok: Boolean(process.env.CROO_SERVICE_ID_EXECUTE_PAYMENT),
    hint: "Dashboard → executePaymentJob service ID",
  },
  {
    label: "CROO_SERVICE_ID_CREATE_ENS",
    ok: Boolean(process.env.CROO_SERVICE_ID_CREATE_ENS),
    hint: "Dashboard → createEnsName service ID",
  },
  {
    label: "ANTHROPIC_API_KEY or OPENAI_API_KEY",
    ok: Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY),
    hint: "Required for natural-language createPolicy",
  },
  {
    label: "ENS_REGISTRAR_PRIVATE_KEY",
    ok:
      process.env.DEV_MOCK_ENS_SUBNAMES === "true" ||
      process.env.DEV_MOCK_ENS_SUBNAMES === "1" ||
      Boolean(process.env.ENS_REGISTRAR_PRIVATE_KEY),
    hint:
      process.env.DEV_MOCK_ENS_SUBNAMES === "true"
        ? "Skipped — DEV_MOCK_ENS_SUBNAMES=true"
        : "Operator wallet for Base ENS registration gas",
  },
  {
    label: "CROO_REQUESTER_SDK_KEY (E2E)",
    ok: Boolean(process.env.CROO_REQUESTER_SDK_KEY),
    hint: "Second registered agent — fund its AA wallet with USDC",
  },
  {
    label: "CROO_TARGET_SERVICE_ID (E2E)",
    ok: Boolean(
      process.env.CROO_TARGET_SERVICE_ID ||
        process.env.CROO_SERVICE_ID_CREATE_POLICY,
    ),
    hint: "Optional — defaults to createPolicy service ID in smoke scripts",
  },
];

console.log("\nRemifi setup check\n");

let ready = 0;
for (const c of checks) {
  const mark = c.ok ? "✓" : "✗";
  console.log(`  ${mark} ${c.label}`);
  if (!c.ok && c.hint) console.log(`      → ${c.hint}`);
  if (c.ok) ready++;
}

console.log(`\n${ready}/${checks.length} checks passed.\n`);

console.log("Next steps:");
console.log(`  npm run verify:agent`);
console.log(`  npm run dev && npm run sample:flow   # E2E (needs funded requester agent)`);
console.log("");

process.exit(ready === checks.length ? 0 : 1);

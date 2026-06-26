/**
 * Validates .env before smoke tests. Run: npm run setup:check
 */
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
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
    label: "PROVIDER_AA_WALLET_ADDRESS",
    ok: /^0x[a-fA-F0-9]{40}$/.test(process.env.PROVIDER_AA_WALLET_ADDRESS ?? ""),
    hint: "Dashboard Configure page → AA Wallet (not Controller)",
  },
  {
    label: "ANTHROPIC_API_KEY or OPENAI_API_KEY",
    ok: Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY),
    hint: "Required for natural-language createPolicy",
  },
  {
    label: "AGENT_WALLET_PRIVATE_KEY",
    ok:
      process.env.DEV_MOCK_SETTLEMENT === "true" ||
      process.env.DEV_MOCK_SETTLEMENT === "1" ||
      Boolean(process.env.AGENT_WALLET_PRIVATE_KEY),
    hint:
      process.env.DEV_MOCK_SETTLEMENT === "true"
        ? "Skipped — DEV_MOCK_SETTLEMENT=true"
        : "Or run: npm run deposit -- --mock",
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

const canCreatePolicyLocal =
  checks.find((c) => c.label.startsWith("CROO_SDK_KEY"))?.ok &&
  checks.find((c) => c.label.startsWith("CROO_SERVICE_ID_CREATE"))?.ok;

const canCreatePolicyE2e =
  canCreatePolicyLocal &&
  checks.find((c) => c.label.startsWith("CROO_REQUESTER"))?.ok;

const canExecutePayment =
  checks.find((c) => c.label === "PROVIDER_AA_WALLET_ADDRESS")?.ok &&
  (checks.find((c) => c.label === "AGENT_WALLET_PRIVATE_KEY")?.ok ?? false);

const mockSettlement =
  process.env.DEV_MOCK_SETTLEMENT === "true" ||
  process.env.DEV_MOCK_SETTLEMENT === "1";

console.log("Next steps:");
console.log(`  ENS forward/reverse:             npm run test:ens`);
console.log(`  JSON policy parse (no network):  npm run test:policy`);
console.log(`  Agent + CAP service check:       npm run verify:agent`);
if (canCreatePolicyE2e) {
  console.log(`  CAP createPolicy E2E:            npm run dev + npm run test:create-policy`);
} else {
  console.log(`  CAP createPolicy E2E:            register 2nd agent + fund USDC + set requester env`);
}
if (canExecutePayment) {
  console.log(
    mockSettlement
      ? `  CAP executePaymentJob E2E:       npm run test:execute-payment (mock txs)`
      : `  CAP executePaymentJob E2E:       npm run test:execute-payment`,
  );
} else {
  console.log(`  CAP executePaymentJob E2E:       npm run deposit -- --mock`);
}
console.log("");

process.exit(ready === checks.length ? 0 : 1);

/**
 * Check Base org name (*.base.eth) availability / registration.
 * Run: npm run ens:check-parent
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { isBasenameAvailable } from "../src/policy/ens-register-base.js";
import { checkParentName } from "../src/policy/ens-subnames.js";
import { resolveUserOrg } from "../src/policy/ens-org.js";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const raw = process.env.ENS_PARENT_DOMAIN ?? process.env.ENS_ORG_DOMAIN ?? process.argv[2];

if (!raw) {
  console.error("Usage: ENS_ORG_DOMAIN=acme npm run ens:check-parent");
  console.error("   or: npm run ens:check-parent -- acme.base.eth");
  process.exit(1);
}

const { label, domain } = resolveUserOrg(raw);
const result = await checkParentName(domain);
console.log(JSON.stringify({ orgLabel: label, ...result }, null, 2));

const registeredOnBase =
  result.resolves ||
  (result.ownerHint.startsWith("0x") && result.ownerHint !== "not found");

if (!registeredOnBase) {
  try {
    const available = await isBasenameAvailable(label);
    console.log(`\nBase availability (${domain}): ${available}`);
    if (available) {
      console.log("Run: npm run ens:register-basename");
    }
  } catch {
    console.log("\n(Set ENS_REGISTRAR_PRIVATE_KEY to check on-chain availability)");
  }

  console.log("\nRegister manually: https://www.base.org/names");
  console.log("Or auto: ENS_AUTO_REGISTER_PARENT=true npm run ens:register-basename");
  process.exit(1);
}

console.log(
  registeredOnBase
    ? "\n✓ Org registered on Base — create subnames under it (forward addr optional)."
    : "",
);
if (registeredOnBase) process.exit(0);

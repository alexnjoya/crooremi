/**
 * Register a Base org name (*.base.eth) via Base Names registrar.
 *
 *   ENS_ORG_DOMAIN=acme
 *   ENS_REGISTRAR_PRIVATE_KEY=0x...
 *
 * Run: npm run ens:register-basename
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { resolveUserOrg } from "../src/policy/ens-org.js";
import { registerBasenameParent } from "../src/policy/ens-register-base.js";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const raw = process.env.ENS_ORG_DOMAIN ?? process.env.ENS_PARENT_DOMAIN ?? process.argv[2];

if (!raw) {
  console.error("Usage: ENS_ORG_DOMAIN=acme npm run ens:register-basename");
  process.exit(1);
}

const { domain } = resolveUserOrg(raw);
console.log(`Registering ${domain} on Base…`);

const result = await registerBasenameParent(domain);
console.log(JSON.stringify(result, null, 2));

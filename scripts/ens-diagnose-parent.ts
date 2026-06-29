/**
 * Diagnose why ENS_PARENT_DOMAIN (e.g. blockdevrel.base.eth) fails in Remifi.
 * Run: npm run ens:diagnose
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { normalize } from "viem/ens";
import { privateKeyToAccount } from "viem/accounts";
import { getBasenameRegistryOwner } from "../src/policy/ens-register-base.js";
import { resolveAddressInput } from "../src/policy/ens.js";
import { resolveUserOrg } from "../src/policy/ens-org.js";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const raw = process.env.ENS_PARENT_DOMAIN ?? "blockdevrel.base.eth";
const { domain } = resolveUserOrg(raw);
const key = process.env.ENS_REGISTRAR_PRIVATE_KEY?.trim();

if (!key) {
  console.error("ENS_REGISTRAR_PRIVATE_KEY missing in .env");
  process.exit(1);
}

const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`);
const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL ?? "https://mainnet.base.org"),
});

const registryOwner = await getBasenameRegistryOwner(domain);
let forwardAddr: string | null = null;
try {
  const r = await resolveAddressInput(domain);
  forwardAddr = r.address;
} catch {
  forwardAddr = null;
}

const ownsParent =
  registryOwner &&
  registryOwner.toLowerCase() === account.address.toLowerCase();

console.log("\nENS parent diagnose:", domain, "\n");
console.log("  Registrar wallet (ENS_REGISTRAR_PRIVATE_KEY):", account.address);
console.log("  Registry owner on Base:                    ", registryOwner ?? "not registered");
console.log("  Forward addr (resolver):                   ", forwardAddr ?? "not set");
console.log("  Registrar owns parent (can create subnames):", ownsParent ? "YES" : "NO");
console.log("  Forward resolve works:                     ", forwardAddr ? "YES" : "NO");

console.log("\n--- Why Remifi fails ---\n");

if (!registryOwner) {
  console.log("• Name is not registered on Base. Register at https://www.base.org/names");
} else if (!ownsParent) {
  console.log(
    "• SUBNAMES: Your .env key signs as",
    account.address,
    "but",
    domain,
    "is owned by",
    registryOwner + ".",
  );
  console.log(
    "  Base only lets the owner call setSubnodeRecord. Fix: transfer the basename to the",
  );
  console.log("  registrar wallet, OR put the owner's private key in ENS_REGISTRAR_PRIVATE_KEY.");
}

if (!forwardAddr && registryOwner) {
  console.log(
    "• RESOLVE: The name is registered but has no addr record on the Base resolver.",
  );
  console.log(
    "  createPolicy cannot map",
    domain,
    "→ 0x… until setAddr is called (happens automatically when Remifi registers,",
  );
  console.log("  or run: npm run ens:setup-parent-addr after the registrar owns the name).");
}

if (ownsParent && forwardAddr) {
  console.log("\n✓ Ready for subnames and forward resolve.\n");
  process.exit(0);
}

console.log("");
process.exit(1);

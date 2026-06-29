/**
 * Set forward addr on ENS_PARENT_DOMAIN (one-time) so blockdevrel.base.eth resolves.
 * Requires registrar wallet to own the basename.
 * Run: npm run ens:setup-parent-addr
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { namehash, normalize } from "viem/ens";
import { getBasenameRegistryOwner } from "../src/policy/ens-register-base.js";
import { resolveUserOrg } from "../src/policy/ens-org.js";
import { resolveAddressInput } from "../src/policy/ens.js";
import { BASE_L2_RESOLVER } from "../src/policy/ens-constants.js";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const raw = process.env.ENS_PARENT_DOMAIN;
if (!raw) {
  console.error("Set ENS_PARENT_DOMAIN in .env (e.g. blockdevrel.base.eth)");
  process.exit(1);
}

const key = process.env.ENS_REGISTRAR_PRIVATE_KEY?.trim();
if (!key) {
  console.error("ENS_REGISTRAR_PRIVATE_KEY missing");
  process.exit(1);
}

const { domain } = resolveUserOrg(raw);
const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as Hex);
const transport = http(process.env.BASE_RPC_URL ?? "https://mainnet.base.org");
const publicClient = createPublicClient({ chain: base, transport });
const walletClient = createWalletClient({ account, chain: base, transport });

try {
  const existing = await resolveAddressInput(domain);
  console.log(`✓ ${domain} already resolves to ${existing.address}`);
  process.exit(0);
} catch {
  // need setAddr
}

const owner = await getBasenameRegistryOwner(domain);
if (!owner || owner.toLowerCase() !== account.address.toLowerCase()) {
  console.error(
    `Cannot set addr: registrar ${account.address} does not own ${domain} (owner: ${owner ?? "none"})`,
  );
  process.exit(1);
}

const target = (process.env.ENS_PARENT_ADDR ?? account.address) as `0x${string}`;
const node = namehash(normalize(domain));

console.log(`Setting ${domain} → ${target} on Base resolver…`);

const hash = await walletClient.writeContract({
  address: BASE_L2_RESOLVER,
  abi: [
    {
      name: "setAddr",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "node", type: "bytes32" },
        { name: "a", type: "address" },
      ],
      outputs: [],
    },
  ],
  functionName: "setAddr",
  args: [node, target],
  account,
  chain: base,
});
await publicClient.waitForTransactionReceipt({ hash });
console.log("tx:", hash);

const verified = await resolveAddressInput(domain);
console.log(`✓ ${domain} now resolves to ${verified.address}`);

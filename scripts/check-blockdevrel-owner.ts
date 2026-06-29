import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { namehash } from "viem/ens";
import { privateKeyToAccount } from "viem/accounts";
import { BASE_REGISTRY } from "../src/policy/ens-constants.js";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const key = process.env.ENS_REGISTRAR_PRIVATE_KEY?.trim();
if (!key) {
  console.error("ENS_REGISTRAR_PRIVATE_KEY missing");
  process.exit(1);
}

const account = privateKeyToAccount((key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`);
const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL ?? "https://mainnet.base.org"),
});

const registryAbi = [
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
] as const;

const node = namehash("blockdevrel.base.eth");
const owner = await client.readContract({
  address: BASE_REGISTRY,
  abi: registryAbi,
  functionName: "owner",
  args: [node],
});

console.log("registrar wallet:", account.address);
console.log("blockdevrel.base.eth owner:", owner);
console.log("owns parent:", owner.toLowerCase() === account.address.toLowerCase());

if (owner.toLowerCase() !== account.address.toLowerCase()) {
  console.log(
    "\nTo create subnames under blockdevrel.base.eth, either:\n" +
      "  1. Set ENS_REGISTRAR_PRIVATE_KEY to the wallet that owns blockdevrel.base.eth, or\n" +
      "  2. Transfer blockdevrel.base.eth to the registrar wallet at https://www.base.org/names",
  );
  process.exit(1);
}

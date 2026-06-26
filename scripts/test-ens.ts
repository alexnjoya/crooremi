/**
 * ENS forward + reverse smoke test.
 * Run: npm run test:ens
 */
import { resolveAddressInput, reverseResolveAddress } from "../src/policy/ens.js";

const cases = [
  { label: "forward vitalik.eth", fn: () => resolveAddressInput("vitalik.eth") },
  {
    label: "forward blockdevrel.base.eth",
    fn: () => resolveAddressInput("blockdevrel.base.eth"),
  },
  {
    label: "reverse vitalik address",
    fn: async () => {
      const addr = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as const;
      const ens = await reverseResolveAddress(addr);
      if (!ens) throw new Error("no primary ENS name");
      return { address: addr, ens };
    },
  },
  {
    label: "hex with auto reverse",
    fn: () =>
      resolveAddressInput("0x59Ea18913F39187efb0Dc0d2CDB09Da5aF4dB4eD"),
  },
];

let passed = 0;
for (const test of cases) {
  try {
    const result = await test.fn();
    console.log(`✓ ${test.label}`);
    console.log(" ", JSON.stringify(result));
    passed++;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${test.label}: ${message}`);
  }
}

console.log(`\n${passed}/${cases.length} ENS checks passed`);
process.exit(passed === cases.length ? 0 : 1);

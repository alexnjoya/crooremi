/**
 * ENS forward + reverse smoke test (Base names only).
 * Run: npm run test:ens
 */
import { resolveAddressInput, reverseResolveAddress } from "../src/policy/ens.js";

const cases = [
  {
    label: "forward blockdevrel.base.eth",
    fn: () => resolveAddressInput("blockdevrel.base.eth"),
  },
  {
    label: "reject L1 vitalik.eth",
    fn: async () => {
      try {
        await resolveAddressInput("vitalik.eth");
        throw new Error("expected rejection");
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("Base name")) throw err;
        return { rejected: true, reason: message };
      }
    },
  },
  {
    label: "hex with Base reverse (if set)",
    fn: () =>
      resolveAddressInput("0x59Ea18913F39187efb0Dc0d2CDB09Da5aF4dB4eD"),
  },
  {
    label: "reverse lookup helper",
    fn: async () => {
      const addr = "0x59Ea18913F39187efb0Dc0d2CDB09Da5aF4dB4eD" as const;
      const ens = await reverseResolveAddress(addr);
      return { address: addr, ens: ens ?? null };
    },
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

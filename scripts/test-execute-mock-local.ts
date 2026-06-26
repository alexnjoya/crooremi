/**
 * Local executePaymentJob mock — no CAP, no USDC.
 * Run: npm run test:execute-mock
 */
import { executePaymentSplit } from "../src/chain/router.js";

const delivery = await executePaymentSplit({
  policyId: "pol_smoke_local",
  totalUsdc: "1000000",
  policy: {
    name: "Smoke split",
    recipients: [
      {
        address: "0x742d35cc6634c0532925a3b844bc9e7595f0beb0",
        label: "team",
        bps: 5000,
      },
      {
        address: "0x1234567890123456789012345678901234567890",
        label: "ops",
        bps: 5000,
      },
    ],
  },
});

console.log(JSON.stringify(delivery, null, 2));

if (!delivery.mock || !delivery.txHashes?.length) {
  process.exit(1);
}

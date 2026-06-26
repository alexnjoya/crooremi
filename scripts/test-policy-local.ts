/**
 * Local createPolicy smoke — no CAP, no AI key required (JSON path).
 * Run: npm run test:policy
 */
import { interpretPolicyFromRequirements } from "../src/policy/interpreter.js";

const sample = JSON.stringify({
  name: "Team revenue split",
  recipients: [
    {
      address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
      label: "team",
      bps: 4000,
    },
    {
      address: "0x1234567890123456789012345678901234567890",
      label: "ops",
      bps: 3000,
    },
    {
      address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      label: "treasury",
      bps: 3000,
    },
  ],
});

const delivery = await interpretPolicyFromRequirements(sample);
console.log(JSON.stringify(delivery, null, 2));

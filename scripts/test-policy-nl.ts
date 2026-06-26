import { interpretPolicyFromRequirements } from "../src/policy/interpreter.js";

const text =
  "Split revenue 50% to team at 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0, 50% to ops at 0x1234567890123456789012345678901234567890";

console.log("[test] NL input:", text);
const delivery = await interpretPolicyFromRequirements(text);
console.log(JSON.stringify(delivery, null, 2));

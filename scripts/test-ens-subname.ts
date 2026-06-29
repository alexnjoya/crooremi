/**
 * ENS subname provisioning smoke test (mock or on-chain).
 *
 * Mock (no gas):
 *   DEV_MOCK_ENS_SUBNAMES=true ENS_PARENT_DOMAIN=remifi.base.eth npm run test:ens-subname
 *
 * On-chain (requires operator ETH on Base):
 *   ENS_PARENT_DOMAIN=yourname.base.eth ENS_REGISTRAR_PRIVATE_KEY=0x... npm run test:ens-subname
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { checkParentName } from "../src/policy/ens-subnames.js";
import { resolveAddressInput } from "../src/policy/ens.js";
import { interpretPolicyFromRequirements } from "../src/policy/interpreter.js";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const parent =
  process.env.ENS_PARENT_DOMAIN ??
  process.env.ENS_ORG_DOMAIN ??
  "blockdevrel.base.eth";
const testLabel = process.env.ENS_TEST_LABEL ?? "payroll-smoke";
const testAddress =
  (process.env.ENS_TEST_ADDRESS as `0x${string}` | undefined) ??
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

async function main(): Promise<void> {
  console.log("\nRemifi ENS subname test\n");

  if (!parent) {
    console.error("Set ENS_PARENT_DOMAIN in .env (e.g. blockdevrel.base.eth)");
    process.exit(1);
  }

  const parentCheck = await checkParentName(parent);
  console.log("Parent check:", parentCheck);

  const policyJson = JSON.stringify({
    name: "ENS subname smoke",
    ensParent: parent,
    recipients: [
      {
        address: testAddress,
        label: "team",
        bps: 10000,
        subname: testLabel,
      },
    ],
  });

  console.log("\n--- createPolicy with subname (interpreter) ---");
  const delivery = await interpretPolicyFromRequirements(policyJson);
  console.log(JSON.stringify(delivery, null, 2));

  if (!delivery.ensSubnames?.length) {
    throw new Error("Expected ensSubnames in delivery");
  }

  if (process.env.DEV_MOCK_ENS_SUBNAMES === "true" || process.env.DEV_MOCK_ENS_SUBNAMES === "1") {
    console.log("\n✓ ENS subname mock flow OK (forward resolve skipped in mock mode)\n");
    return;
  }

  const ens = delivery.ensSubnames[0]!.ens;
  const resolved = await resolveAddressInput(ens);
  console.log("\nForward resolve after provision:", resolved);

  if (resolved.address.toLowerCase() !== testAddress.toLowerCase()) {
    throw new Error(`Resolve mismatch for ${ens}`);
  }

  console.log("\n✓ ENS subname flow OK\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

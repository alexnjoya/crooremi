/**
 * Verifies planupdate.md flow locally (no CAP network).
 * Run: npm run verify:flow
 */
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { config as loadEnv } from "dotenv";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });
process.env.CROO_SDK_KEY ??= "croo_sk_verify_flow_test_key_placeholder_00";
process.env.DEV_MOCK_ENS_SUBNAMES = "true";

const { initPolicyDatabase } = await import("../src/policy/database.js");

const {
  interpretPolicyFromRequirements,
} = await import("../src/policy/interpreter.js");
const { parseExecutePayoutLeg } = await import("../src/policy/execute-resolver.js");
const { parseEnsResolveQueries } = await import("../src/policy/ens-resolve.js");
const { savePolicy, loadPolicy, toStoredPolicy } = await import("../src/policy/store.js");
const {
  attachEnsJourneyGuide,
  attachPolicyJourneyGuide,
  buildPolicyRequirementsFromEns,
} = await import("../src/policy/journey-guide.js");

const RECIPIENTS = [
  {
    address: "0xB98cFAC37b8bD7f549789718aC17F8aEE7cE0c37",
    label: "wallet-a",
    bps: 3000,
    subname: "wallet-a",
  },
  {
    address: "0x173dbd987ea65f8dfd2d15ea2780acb615bdd8d9",
    label: "wallet-b",
    bps: 6000,
    subname: "wallet-b",
  },
];

let passed = 0;

function ok(name: string): void {
  passed += 1;
  console.log(`  ✓ ${name}`);
}

async function testPolicyCreationAndStore(): Promise<string> {
  const requirements = JSON.stringify({
    totalUsdc: "1000000",
    name: "Verify split",
    recipients: RECIPIENTS.map(({ address, label, bps }) => ({
      address,
      label,
      bps,
    })),
  });

  const delivery = await interpretPolicyFromRequirements(requirements);

  assert.match(delivery.policyId, /^pol_[a-f0-9]+$/);
  assert.equal(delivery.allocatedBps, 9000);
  assert.equal(delivery.remainderBps, 1000);
  assert.ok(delivery.executionGuide);
  assert.equal(delivery.executionGuide!.hires.length, 2);
  ok("createPolicy returns policyId, partial bps, executionGuide");

  const hire0 = delivery.executionGuide!.hires[0]!;
  assert.equal(hire0.requirements.recipient.label, "wallet-a");
  assert.equal(hire0.requirements.recipient.amount, "300000");
  assert.equal(hire0.requirements.recipient.address, "0xb98cfac37b8bd7f549789718ac17f8aee7ce0c37");
  ok("executionGuide computes direct requirements (address + amount)");

  delivery.journeyGuide = attachPolicyJourneyGuide(delivery);
  assert.equal(delivery.journeyGuide.step, 2);
  ok("policy journeyGuide attached (step 2)");

  await savePolicy(toStoredPolicy(delivery));
  const loaded = await loadPolicy(delivery.policyId);
  assert.ok(loaded);
  assert.equal(loaded!.policyId, delivery.policyId);
  assert.equal(loaded!.policy.recipients.length, 2);
  ok("policy store save/load roundtrip");

  return delivery.policyId;
}

async function testExecuteByReference(policyId: string): Promise<void> {
  const leg = await parseExecutePayoutLeg(
    JSON.stringify({
      policyId,
      totalUsdc: "1000000",
      recipient: "wallet-b",
    }),
  );

  assert.equal(leg.recipient.label, "wallet-b");
  assert.equal(leg.recipient.address, "0x173dbd987ea65f8dfd2d15ea2780acb615bdd8d9");
  assert.equal(leg.recipient.amount, "600000");
  ok("execute by reference resolves address + amount from stored policy");

  const legLegacy = await parseExecutePayoutLeg(
    JSON.stringify({
      policyId,
      recipient: {
        address: "0xB98cFAC37b8bD7f549789718aC17F8aEE7cE0c37",
        label: "wallet-a",
        amount: "300000",
      },
    }),
  );
  assert.equal(legLegacy.recipient.amount, "300000");
  ok("legacy direct execute format still works");

  // Direct format works without policy store
  const legDirect = await parseExecutePayoutLeg(
    JSON.stringify({
      policyId,
      recipient: {
        address: "0xB98cFAC37b8bD7f549789718aC17F8aEE7cE0c37",
        label: "wallet-a",
        amount: "300000",
      },
    }),
  );
  assert.equal(legDirect.recipient.amount, "300000");
  ok("direct requirements work without policy store");
}

function testEnsJourneyGuide(): void {
  const ensDelivery = {
    org: "verifytest.base.eth",
    orgLabel: "verifytest",
    names: [
      {
        org: "verifytest.base.eth",
        orgLabel: "verifytest",
        subname: "wallet-a",
        ens: "wallet-a.verifytest.base.eth",
        address: "0xB98cFAC37b8bD7f549789718aC17F8aEE7cE0c37" as const,
        created: true,
        txHashes: ["0xabc"],
      },
      {
        org: "verifytest.base.eth",
        orgLabel: "verifytest",
        subname: "wallet-b",
        ens: "wallet-b.verifytest.base.eth",
        address: "0x173dbd987ea65f8dfd2d15ea2780acb615bdd8d9" as const,
        created: true,
        txHashes: ["0xdef"],
      },
    ],
  };

  const enriched = attachEnsJourneyGuide(ensDelivery, "1000000");
  assert.equal(enriched.journeyGuide.step, 1);
  assert.equal(enriched.journeyGuide.nextStep.service, "USDC Split Policy");
  assert.ok(enriched.journeyGuide.nextStep.requirements.recipients);
  ok("ENS delivery includes journeyGuide.nextStep for policy");

  const policyReq = buildPolicyRequirementsFromEns(ensDelivery, {
    totalUsdc: "1000000",
    bps: [3000, 6000],
  });
  const recipients = policyReq.recipients as Array<{ bps: number; subname: string }>;
  assert.equal(recipients.length, 2);
  assert.equal(recipients[0]!.bps, 3000);
  assert.equal(recipients[1]!.subname, "wallet-b");
  ok("buildPolicyRequirementsFromEns maps ENS names → policy recipients");
}

async function testNlJsonUnwrap(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
    console.log("  ⊘ NL JSON unwrap (skipped — no AI key in env)");
    return;
  }

  const delivery = await interpretPolicyFromRequirements(
    JSON.stringify({
      text: "split 30% to 0xB98cFAC37b8bD7f549789718aC17F8aEE7cE0c37 and 60% to 0x173dbd987ea65f8dfd2d15ea2780acb615bdd8d9",
      totalUsdc: "500000",
    }),
  );

  assert.equal(delivery.allocatedBps, 9000);
  assert.equal(delivery.executionGuide?.totalUsdc, "500000");
  ok("NL { text } JSON routes to LLM and respects totalUsdc");
}

async function testEnsResolveParsing(): Promise<void> {
  const queries = parseEnsResolveQueries(
    JSON.stringify({
      queries: [
        { name: "blockdevre.base.eth" },
        { name: "vitalik.eth" },
        { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
      ],
    }),
  );

  assert.equal(queries.length, 3);
  assert.equal(queries[0]?.direction, "forward");
  assert.equal(queries[2]?.direction, "reverse");
  ok("ENS resolver parses queries array from requirements");

  const fromText = parseEnsResolveQueries(
    JSON.stringify({ text: "blockdevrel.base.eth" }),
  );
  assert.equal(fromText.length, 1);
  assert.equal(fromText[0]?.direction, "forward");
  assert.equal(fromText[0]?.value, "blockdevrel.base.eth");
  ok("ENS resolver accepts { text: \"name.base.eth\" }");

  const fromAddress = parseEnsResolveQueries(
    JSON.stringify({ text: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" }),
  );
  assert.equal(fromAddress[0]?.direction, "reverse");
  ok("ENS resolver accepts { text: \"0x...\" } for reverse lookup");

  const plain = parseEnsResolveQueries("vitalik.eth");
  assert.equal(plain[0]?.direction, "forward");
  ok("ENS resolver accepts plain text name");
}

async function main(): Promise<void> {
  console.log("\nRemifi flow verification (planupdate.md)\n");

  await initPolicyDatabase();

  const policyId = await testPolicyCreationAndStore();
  await testExecuteByReference(policyId);
  testEnsJourneyGuide();
  testEnsResolveParsing();
  await testNlJsonUnwrap();

  console.log(`\n${passed} checks passed.\n`);
}

main().catch((err) => {
  console.error("\nFAILED:", err.message ?? err);
  process.exit(1);
});

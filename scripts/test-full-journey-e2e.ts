/**
 * CAP E2E — orchestrator hires Remifi end-to-end:
 *   1. ENS Payout Identity  → named recipients
 *   2. USDC Split Policy    → policyId + policy (auto-chained from step 1)
 *   3. USDC Split Execution → Base txHashes (auto-chained from step 2)
 *
 * Prereqs:
 *   1. npm run dev (provider Online)
 *   2. CROO_REQUESTER_SDK_KEY + funded requester AA wallet
 *   3. All three CROO_SERVICE_ID_* in .env
 *   4. ENS_REGISTRAR_PRIVATE_KEY (or DEV_MOCK_ENS_SUBNAMES=true)
 *
 * Env:
 *   JOURNEY_ORG=blockdevrel       default org (existing *.base.eth)
 *   JOURNEY_SKIP_ENS=1            skip step 1; policy provisions names in step 2
 *   JOURNEY_FUND_AMOUNT=1000      principal per payout leg (0.001 USDC)
 *   JOURNEY_TEAM_ADDRESS=0x...    recipient addresses
 *   JOURNEY_OPS_ADDRESS=0x...
 *
 * Run: npm run test:full-journey
 */
import { randomBytes } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { AgentClient, DeliverableType, EventType } from "@croo-network/sdk";

loadEnv({ path: resolve(process.cwd(), ".env"), override: true });

const sdkKey =
  process.env.CROO_REQUESTER_SDK_KEY?.trim() || process.env.CROO_SDK_KEY?.trim();
const ensServiceId = process.env.CROO_SERVICE_ID_CREATE_ENS?.trim();
const policyServiceId = process.env.CROO_SERVICE_ID_CREATE_POLICY?.trim();
const executeServiceId = process.env.CROO_SERVICE_ID_EXECUTE_PAYMENT?.trim();
const usdcAddress =
  process.env.USDC_ADDRESS ?? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const teamAddress =
  process.env.JOURNEY_TEAM_ADDRESS ?? "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";
const opsAddress =
  process.env.JOURNEY_OPS_ADDRESS ?? "0x1234567890123456789012345678901234567890";
const fundAmount = process.env.JOURNEY_FUND_AMOUNT ?? "1000";
const skipEns =
  process.env.JOURNEY_SKIP_ENS === "1" || process.env.JOURNEY_SKIP_ENS === "true";
const orgLabel =
  process.env.JOURNEY_ORG?.trim() ||
  process.env.ENS_PARENT_DOMAIN?.replace(/\.base\.eth$/i, "").trim() ||
  "blockdevrel";
const subSuffix = randomBytes(2).toString("hex");

type PendingHire = {
  step: string;
  negotiationId: string;
  orderId?: string;
  resolve: (payload: Record<string, unknown>) => void;
  reject: (err: Error) => void;
};

function parseDeliveryBody(body: string): Record<string, unknown> {
  const parsed = JSON.parse(body) as Record<string, unknown>;
  if (parsed.success === false) {
    throw new Error(String(parsed.error ?? "Provider returned failure delivery"));
  }
  return parsed;
}

function assertConfig(): void {
  if (!sdkKey) throw new Error("Set CROO_REQUESTER_SDK_KEY (or CROO_SDK_KEY)");
  if (!policyServiceId) throw new Error("Set CROO_SERVICE_ID_CREATE_POLICY");
  if (!executeServiceId) throw new Error("Set CROO_SERVICE_ID_EXECUTE_PAYMENT");
  if (!skipEns && !ensServiceId) {
    throw new Error("Set CROO_SERVICE_ID_CREATE_ENS or JOURNEY_SKIP_ENS=1");
  }
}

async function main(): Promise<void> {
  assertConfig();

  console.log("\n[orchestrator] Remifi full journey — A2A auto-chain\n");
  console.log(`[orchestrator] org: ${orgLabel}`);
  console.log(`[orchestrator] skip ENS step: ${skipEns}`);
  console.log(`[orchestrator] fund amount: ${fundAmount} (6-decimal USDC units)\n`);

  const client = new AgentClient(
    {
      baseURL: process.env.CROO_API_URL ?? "https://api.croo.network",
      wsURL: process.env.CROO_WS_URL ?? "wss://api.croo.network/ws",
      rpcURL: process.env.BASE_RPC_URL ?? "https://mainnet.base.org",
    },
    sdkKey!,
  );

  const stream = await client.connectWebSocket();
  let pending: PendingHire | null = null;

  const globalTimeout = setTimeout(() => {
    console.error("[orchestrator] timed out after 10 minutes");
    stream.close();
    process.exit(1);
  }, 600_000);

  const finish = (code: number) => {
    clearTimeout(globalTimeout);
    stream.close();
    process.exit(code);
  };

  async function fetchDelivery(orderId: string): Promise<Record<string, unknown>> {
    const delivery = await client.getDelivery(orderId);
    const body =
      delivery.deliverableType === DeliverableType.Schema
        ? delivery.deliverableSchema
        : delivery.deliverableText;
    return parseDeliveryBody(body);
  }

  stream.on(EventType.OrderCreated, async (event) => {
    if (!pending || event.negotiation_id !== pending.negotiationId) return;
    const orderId = event.order_id;
    if (!orderId) return;

    pending.orderId = orderId;
    console.log(`[orchestrator] ${pending.step} — order ${orderId} created, paying…`);

    try {
      const result = await client.payOrder(orderId);
      console.log(`[orchestrator] ${pending.step} — pay tx: ${result.txHash}`);
    } catch (err) {
      pending.reject(err instanceof Error ? err : new Error(String(err)));
      pending = null;
    }
  });

  stream.on(EventType.OrderCompleted, async (event) => {
    if (!pending || event.order_id !== pending.orderId) return;
    const { step, orderId, resolve: done, reject } = pending;

    if (!orderId) {
      pending.reject(new Error(`${step}: missing order id on completion`));
      return;
    }

    try {
      const payload = await fetchDelivery(orderId);
      console.log(`[orchestrator] ${step} — delivered\n`);
      done(payload);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });

  async function hire(
    step: string,
    serviceId: string,
    requirements: string,
    options?: { fundAmount?: string },
  ): Promise<Record<string, unknown>> {
    console.log(`[orchestrator] ── ${step} ──`);
    console.log(`[orchestrator] service: ${serviceId}`);
    console.log(`[orchestrator] input: ${requirements.slice(0, 160)}${requirements.length > 160 ? "…" : ""}`);

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      let settled = false;

      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(stepTimeout);
        pending = null;
        fn();
      };

      const stepTimeout = setTimeout(() => {
        settle(() => reject(new Error(`${step} timed out after 3 minutes`)));
      }, 180_000);

      const complete = async (id: string) => {
        try {
          const payload = await fetchDelivery(id);
          console.log(`[orchestrator] ${step} — delivered\n`);
          settle(() => resolve(payload));
        } catch (err) {
          settle(() => reject(err instanceof Error ? err : new Error(String(err))));
        }
      };

      pending = {
        step,
        negotiationId: "",
        resolve: (payload) => settle(() => resolve(payload)),
        reject: (err) => settle(() => reject(err)),
      };

      const negotiateReq: Parameters<AgentClient["negotiateOrder"]>[0] = {
        serviceId,
        requirements,
      };
      if (options?.fundAmount) {
        negotiateReq.fundAmount = options.fundAmount;
        negotiateReq.fundToken = usdcAddress;
      }

      client
        .negotiateOrder(negotiateReq)
        .then((neg) => {
          if (pending?.step === step) pending.negotiationId = neg.negotiationId;
          console.log(`[orchestrator] ${step} — negotiation ${neg.negotiationId}`);
        })
        .catch((err) => settle(() => reject(err instanceof Error ? err : new Error(String(err)))));

      void (async () => {
        await new Promise((r) => setTimeout(r, 8_000));
        for (let i = 0; i < 30; i++) {
          if (settled) return;
          const activeOrderId = pending?.step === step ? pending.orderId : undefined;
          if (!activeOrderId) {
            await new Promise((r) => setTimeout(r, 5_000));
            continue;
          }
          try {
            const order = await client.getOrder(activeOrderId);
            if (order.status === "completed" || order.status === "delivered") {
              await complete(activeOrderId);
              return;
            }
          } catch {
            // keep polling
          }
          await new Promise((r) => setTimeout(r, 5_000));
        }
      })();
    });
  }

  try {
    let ensDelivery: Record<string, unknown> | undefined;

    if (!skipEns) {
      ensDelivery = await hire(
        "Step 1 · ENS Payout Identity",
        ensServiceId!,
        JSON.stringify({
          org: orgLabel,
          names: [
            { subname: `team-${subSuffix}`, address: teamAddress },
            { subname: `ops-${subSuffix}`, address: opsAddress },
          ],
        }),
      );

      const names = ensDelivery.names as Array<{ ens?: string }> | undefined;
      const ensList = names?.map((n) => n.ens).filter(Boolean) ?? [];
      console.log("[orchestrator] identities:", ensList.join(", ") || ensDelivery.ens);
    }

    const policyDelivery = await hire(
      "Step 2 · USDC Split Policy",
      policyServiceId!,
      JSON.stringify({
        org: orgLabel,
        name: `${orgLabel} payroll`,
        recipients: [
          { subname: `team-${subSuffix}`, address: teamAddress, label: "team", bps: 6000 },
          { subname: `ops-${subSuffix}`, address: opsAddress, label: "ops", bps: 4000 },
        ],
      }),
    );

    const policyId = policyDelivery.policyId as string | undefined;
    const policy = policyDelivery.policy as
      | { name: string; recipients: Array<{ address: string; label: string; bps: number }> }
      | undefined;

    if (!policyId || !policy?.recipients?.length) {
      throw new Error("Step 2 delivery missing policyId or policy.recipients");
    }

    console.log(`[orchestrator] chained policyId: ${policyId}`);
    console.log(
      "[orchestrator] chained recipients:",
      policy.recipients.map((r) => `${r.label}=${r.address.slice(0, 10)}…`).join(", "),
    );

    const totalUsdc = BigInt(fundAmount);
    const allTxHashes: string[] = [];

    for (const recipient of policy.recipients) {
      const amount = ((totalUsdc * BigInt(recipient.bps)) / 10_000n).toString();
      const legRequirements = JSON.stringify({
        policyId,
        recipient: {
          address: recipient.address,
          label: recipient.label,
          amount,
        },
      });

      const legDelivery = await hire(
        `Step 3 · USDC Split → ${recipient.label}`,
        executeServiceId!,
        legRequirements,
        { fundAmount: amount },
      );

      const legTxs = legDelivery.txHashes as string[] | undefined;
      if (!legTxs?.length) {
        throw new Error(`Step 3 payout to ${recipient.label} missing txHashes`);
      }
      allTxHashes.push(...legTxs);
      console.log(
        `[orchestrator] CROO direct → ${recipient.label}: ${legTxs[0]} (${amount} base units)`,
      );
    }

    const executeDelivery = { txHashes: allTxHashes, baseExplorer: allTxHashes[0] };

    console.log("\n[orchestrator] ✓ FULL JOURNEY COMPLETE\n");
    console.log("Summary:");
    if (ensDelivery) {
      console.log(`  org:      ${String(ensDelivery.org ?? `${orgLabel}.base.eth`)}`);
    }
    console.log(`  policy:   ${policyId}`);
    console.log(`  txs:      ${allTxHashes.length} CROO direct transfer(s)`);
    console.log(`  proof:    ${String(executeDelivery.baseExplorer ?? allTxHashes[0])}`);
    console.log("  mode:     croo_direct — USDC routed by CAP payOrder, no provider private key");
    console.log("\nA2A chain: requester hired Remifi — policy chained, payouts via CROO fund transfer.\n");

    finish(0);
  } catch (err) {
    console.error("\n[orchestrator] failed:", err);
    finish(1);
  }
}

main().catch((err) => {
  console.error("[orchestrator] fatal:", err);
  process.exit(1);
});

import {
  DeliverableType,
  type AgentClient,
  type Negotiation,
  type Order,
} from "@croo-network/sdk";
import { isCreateEnsService, isCreatePolicyService, isExecutePaymentService, isResolveEnsService } from "../config.js";
import { buildPayrollDelivery } from "../chain/payroll-settlement.js";
import { createEnsFromRequirements } from "../policy/ens-service.js";
import { attachEnsJourneyGuide, attachPolicyJourneyGuide } from "../policy/journey-guide.js";
import { interpretPolicyFromRequirements } from "../policy/interpreter.js";
import {
  parseExecutePayrollPlan,
  resolveExecuteFundAddress,
} from "../policy/execute-resolver.js";
import { savePolicy, toStoredPolicy } from "../policy/store.js";
import { resolveEnsFromRequirements } from "../policy/ens-resolve.js";

export type HandlerContext = {
  client: AgentClient;
  orderId: string;
  order: Order;
  negotiation: Negotiation;
};

function log(level: "info" | "error", message: string, extra?: unknown): void {
  const prefix = "[remifi]";
  if (extra !== undefined) {
    console[level](prefix, message, extra);
  } else {
    console[level](prefix, message);
  }
}

async function deliverSchema(
  client: AgentClient,
  orderId: string,
  payload: Record<string, unknown>,
): Promise<string | undefined> {
  const json = JSON.stringify(payload);
  const result = await client.deliverOrder(orderId, {
    deliverableType: DeliverableType.Schema,
    deliverableSchema: json,
    deliverableText: json,
  });
  return result.txHash;
}

async function handleCreateEnsName(ctx: HandlerContext): Promise<void> {
  const delivery = await createEnsFromRequirements(ctx.negotiation.requirements);
  const enriched = attachEnsJourneyGuide(delivery);
  const ens =
    "names" in delivery ? delivery.names[0]?.ens : delivery.ens;
  log("info", `createEnsName delivered ${ens ?? "batch"}`, {
    nextStep: enriched.journeyGuide.nextStep.service,
  });
  await deliverSchema(ctx.client, ctx.orderId, enriched);
}

async function handleCreatePolicy(ctx: HandlerContext): Promise<void> {
  const delivery = await interpretPolicyFromRequirements(ctx.negotiation.requirements);
  delivery.journeyGuide = attachPolicyJourneyGuide(delivery);
  await savePolicy(toStoredPolicy(delivery));
  log("info", `createPolicy delivered ${delivery.policyId}`, {
    recipients: delivery.policy.recipients.length,
    payrollRecipients: delivery.executionGuide?.payroll.recipientCount ?? 0,
  });
  await deliverSchema(ctx.client, ctx.orderId, delivery);
}

async function handleResolveEnsName(ctx: HandlerContext): Promise<void> {
  const delivery = await resolveEnsFromRequirements(ctx.negotiation.requirements);
  const resolved = delivery.results.filter((row) => row.resolved).length;
  log("info", `resolveEnsName delivered ${resolved}/${delivery.results.length}`, {
    success: delivery.success,
  });
  await deliverSchema(ctx.client, ctx.orderId, delivery);
}

async function handleExecutePayment(ctx: HandlerContext): Promise<void> {
  const plan = await parseExecutePayrollPlan(ctx.negotiation.requirements);
  const delivery = buildPayrollDelivery(ctx.order, plan);
  const deliverTxHash = await deliverSchema(ctx.client, ctx.orderId, delivery);

  log("info", `executePaymentJob payroll delivered ${delivery.policyId}`, {
    settlement: delivery.settlement,
    fundTxHash: delivery.fundTxHash,
    deliverTxHash: deliverTxHash ?? delivery.deliverTxHash,
    recipients: delivery.recipients.length,
  });
}

export async function handleOrderPaid(
  client: AgentClient,
  orderId: string,
): Promise<void> {
  const order = await client.getOrder(orderId);
  const negotiation = await client.getNegotiation(order.negotiationId);
  const ctx: HandlerContext = { client, orderId, order, negotiation };

  log("info", `order_paid ${orderId}`, {
    serviceId: order.serviceId,
  });

  if (isCreateEnsService(order.serviceId)) {
    await handleCreateEnsName(ctx);
    return;
  }

  if (isResolveEnsService(order.serviceId)) {
    await handleResolveEnsName(ctx);
    return;
  }

  if (isCreatePolicyService(order.serviceId)) {
    await handleCreatePolicy(ctx);
    return;
  }

  if (isExecutePaymentService(order.serviceId)) {
    await handleExecutePayment(ctx);
    return;
  }

  throw new Error(
    `Unknown service ${order.serviceId}. Set CROO_SERVICE_ID_CREATE_POLICY, ` +
      `CROO_SERVICE_ID_CREATE_ENS, CROO_SERVICE_ID_RESOLVE_ENS, and ` +
      `CROO_SERVICE_ID_EXECUTE_PAYMENT in .env.`,
  );
}

export async function acceptNegotiation(
  client: AgentClient,
  negotiation: Negotiation,
): Promise<void> {
  const { negotiationId, serviceId } = negotiation;

  if (isExecutePaymentService(serviceId)) {
    const fundAddress = await resolveExecuteFundAddress(negotiation.requirements);
    const result = await client.acceptNegotiationWithFundAddress(
      negotiationId,
      fundAddress,
    );
    log("info", `accepted fund-transfer → ${fundAddress} → order ${result.order.orderId}`);
    return;
  }

  const result = await client.acceptNegotiation(negotiationId);
  log("info", `accepted negotiation → order ${result.order.orderId}`);
}

export async function deliverFailure(
  client: AgentClient,
  orderId: string,
  reason: string,
): Promise<void> {
  await deliverSchema(client, orderId, {
    success: false,
    error: reason,
  });
}

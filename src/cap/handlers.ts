import {
  DeliverableType,
  type AgentClient,
  type Negotiation,
  type Order,
} from "@croo-network/sdk";
import { env, isCreatePolicyService, isExecutePaymentService } from "../config.js";
import { executePaymentSplit } from "../chain/router.js";
import {
  interpretPolicyFromRequirements,
  parseExecutePaymentInput,
} from "../policy/interpreter.js";

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
): Promise<void> {
  const json = JSON.stringify(payload);
  await client.deliverOrder(orderId, {
    deliverableType: DeliverableType.Schema,
    deliverableSchema: json,
    deliverableText: json,
  });
}

async function handleCreatePolicy(ctx: HandlerContext): Promise<void> {
  const delivery = await interpretPolicyFromRequirements(ctx.negotiation.requirements);
  log("info", `createPolicy delivered ${delivery.policyId}`);
  await deliverSchema(ctx.client, ctx.orderId, delivery);
}

async function handleExecutePayment(ctx: HandlerContext): Promise<void> {
  const input = parseExecutePaymentInput(ctx.negotiation.requirements);
  const delivery = await executePaymentSplit(input);
  log("info", `executePaymentJob delivered ${delivery.policyId}`, {
    txCount: delivery.txHashes.length,
  });
  await deliverSchema(ctx.client, ctx.orderId, delivery);
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

  if (isCreatePolicyService(order.serviceId)) {
    await handleCreatePolicy(ctx);
    return;
  }

  if (isExecutePaymentService(order.serviceId)) {
    await handleExecutePayment(ctx);
    return;
  }

  throw new Error(
    `Unknown service ${order.serviceId}. Set CROO_SERVICE_ID_CREATE_POLICY and ` +
      `CROO_SERVICE_ID_EXECUTE_PAYMENT in .env.`,
  );
}

export async function acceptNegotiation(
  client: AgentClient,
  negotiation: Negotiation,
): Promise<void> {
  const { negotiationId, serviceId } = negotiation;

  if (isExecutePaymentService(serviceId)) {
    const fundAddress = env.PROVIDER_AA_WALLET_ADDRESS;
    if (!fundAddress) {
      throw new Error(
        "PROVIDER_AA_WALLET_ADDRESS is required to accept executePaymentJob " +
          "(fund transfer service). Copy AA Wallet from CROO dashboard.",
      );
    }
    const result = await client.acceptNegotiationWithFundAddress(
      negotiationId,
      fundAddress,
    );
    log("info", `accepted fund-transfer negotiation → order ${result.order.orderId}`);
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

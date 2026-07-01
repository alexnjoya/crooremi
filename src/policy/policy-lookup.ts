import type { AgentClient } from "@croo-network/sdk";
import type { CreatePolicyDelivery, StoredPolicy } from "./types.js";

const POLICY_ID_RE = /pol_[a-f0-9]+/i;

function deliveryBody(raw: {
  deliverableText?: string;
  deliverableSchema?: string | Record<string, unknown>;
}): string {
  if (typeof raw.deliverableText === "string" && raw.deliverableText.trim()) {
    return raw.deliverableText.trim();
  }
  if (typeof raw.deliverableSchema === "string" && raw.deliverableSchema.trim()) {
    return raw.deliverableSchema.trim();
  }
  if (raw.deliverableSchema && typeof raw.deliverableSchema === "object") {
    return JSON.stringify(raw.deliverableSchema);
  }
  return "";
}

function parsePolicyIdFromDelivery(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as { policyId?: string };
    const id = parsed.policyId?.trim();
    if (id && /^pol_[a-f0-9]+$/i.test(id)) {
      return id.toLowerCase();
    }
  } catch {
    const match = raw.match(/pol_[a-f0-9]+/i);
    return match?.[0]?.toLowerCase() ?? null;
  }
  return null;
}

function parseCreatePolicyDelivery(raw: unknown): CreatePolicyDelivery | null {
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as CreatePolicyDelivery;
    const policyId = parsed.policyId?.trim().toLowerCase();
    if (
      policyId &&
      POLICY_ID_RE.test(policyId) &&
      parsed.policy?.recipients?.length
    ) {
      return { ...parsed, policyId };
    }
  } catch {
    return null;
  }
  return null;
}

/** Load a stored policy from a completed createPolicy order on this provider. */
export async function loadPolicyFromCompletedOrders(
  client: AgentClient,
  policyId: string,
  createPolicyServiceId: string,
  requesterAgentId?: string,
): Promise<StoredPolicy | null> {
  const targetId = policyId.trim().toLowerCase();
  const orders = await client.listOrders({ role: "provider", pageSize: 100 });

  const candidates = orders
    .filter(
      (order) =>
        order.serviceId === createPolicyServiceId &&
        order.status === "completed" &&
        (!requesterAgentId || order.requesterAgentId === requesterAgentId),
    )
    .sort(
      (a, b) => Date.parse(b.createdTime) - Date.parse(a.createdTime),
    );

  for (const order of candidates) {
    try {
      const delivery = await client.getDelivery(order.orderId);
      const parsed = parseCreatePolicyDelivery(deliveryBody(delivery));
      if (parsed?.policyId === targetId) {
        return {
          ...parsed,
          createdAt: order.createdTime ?? new Date().toISOString(),
        };
      }
    } catch {
      // try next order
    }
  }

  return null;
}

/** Latest completed createPolicy delivery for the same requester agent. */
export async function resolvePolicyIdFromRequester(
  client: AgentClient,
  requesterAgentId: string,
  createPolicyServiceId: string,
  beforeIso?: string,
): Promise<string | null> {
  const orders = await client.listOrders({ role: "provider", pageSize: 50 });
  const beforeMs = beforeIso ? Date.parse(beforeIso) : Number.POSITIVE_INFINITY;

  const candidates = orders
    .filter(
      (order) =>
        order.serviceId === createPolicyServiceId &&
        order.status === "completed" &&
        order.requesterAgentId === requesterAgentId &&
        Date.parse(order.createdTime) <= beforeMs,
    )
    .sort(
      (a, b) =>
        Date.parse(b.createdTime) - Date.parse(a.createdTime),
    );

  for (const order of candidates) {
    try {
      const delivery = await client.getDelivery(order.orderId);
      const policyId = parsePolicyIdFromDelivery(deliveryBody(delivery));
      if (policyId) {
        return policyId;
      }
    } catch {
      // try next order
    }
  }

  return null;
}

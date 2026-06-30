import type { AgentClient } from "@croo-network/sdk";

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
      const raw =
        delivery.deliverableText ??
        (typeof delivery.deliverableSchema === "string"
          ? delivery.deliverableSchema
          : delivery.deliverableSchema
            ? JSON.stringify(delivery.deliverableSchema)
            : "");
      const policyId = parsePolicyIdFromDelivery(raw);
      if (policyId) {
        return policyId;
      }
    } catch {
      // try next order
    }
  }

  return null;
}

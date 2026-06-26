import { EventType } from "@croo-network/sdk";
import { createAgentClient } from "./client.js";
import {
  acceptNegotiation,
  deliverFailure,
  handleOrderPaid,
} from "./handlers.js";

export async function startProvider(): Promise<void> {
  const client = createAgentClient();
  const stream = await client.connectWebSocket();

  console.log("[remifi] provider online — waiting for CAP orders");

  stream.on(EventType.NegotiationCreated, async (event) => {
    const negotiationId = event.negotiation_id;
    if (!negotiationId) return;

    try {
      const negotiation = await client.getNegotiation(negotiationId);
      await acceptNegotiation(client, negotiation);
    } catch (err) {
      console.error("[remifi] accept error:", err);
    }
  });

  stream.on(EventType.OrderPaid, async (event) => {
    const orderId = event.order_id;
    if (!orderId) return;

    console.log(`[remifi] order ${orderId} paid — executing service`);

    try {
      await handleOrderPaid(client, orderId);
      console.log(`[remifi] order ${orderId} delivered`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[remifi] deliver error for ${orderId}:`, message);
      try {
        await deliverFailure(client, orderId, message);
      } catch (deliverErr) {
        console.error("[remifi] failed to deliver error payload:", deliverErr);
      }
    }
  });

  stream.on(EventType.OrderCompleted, (event) => {
    console.log(`[remifi] order ${event.order_id} completed`);
  });

  const shutdown = () => {
    console.log("[remifi] shutting down");
    stream.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

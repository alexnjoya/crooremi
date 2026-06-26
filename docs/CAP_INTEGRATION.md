# CAP Integration

Remifi is a **CAP provider** using [@croo-network/sdk](https://docs.croo.network).

## Registration

1. [agent.croo.network](https://agent.croo.network) → Register Agent → copy `CROO_SDK_KEY`
2. Configure services (see below)
3. Deposit USDC to **AA Wallet Address** on dashboard

## Environment

```bash
CROO_API_URL=https://api.croo.network
CROO_WS_URL=wss://api.croo.network/ws
CROO_SDK_KEY=croo_sk_...
```

## Services

### createPolicy

| Field | Value |
|-------|-------|
| Requirements | Text or Schema |
| Deliverable | Schema |
| SLA | e.g. 5 minutes |

**Delivery example:**
```json
{
  "policyId": "pol_abc123",
  "policy": {
    "name": "Team revenue split",
    "recipients": [
      { "address": "0x...", "label": "team", "bps": 4000 },
      { "address": "0x...", "label": "treasury", "bps": 6000 }
    ]
  }
}
```

### executePaymentJob

| Field | Value |
|-------|-------|
| Requirements | Schema (policyId or inline policy + amount) |
| Deliverable | Schema |
| SLA | e.g. 15 minutes |

**Delivery example:**
```json
{
  "policyId": "pol_abc123",
  "totalUsdc": "1000000",
  "txHashes": ["0x...", "0x..."],
  "recipients": [{ "label": "team", "amount": "400000", "txHash": "0x..." }]
}
```

## SDK flow

Provider listens for `order_paid`, runs handler, calls `DeliverOrder` with structured JSON.

Reference: [CROO Quick Start](https://docs.croo.network/developer-docs/quick-start.md)

## Service IDs

| Service | ID |
|---------|-----|
| createPolicy | *(fill after dashboard setup)* |
| executePaymentJob | *(fill after dashboard setup)* |

## Agent Store listing

Checklist: [AGENT_STORE.md](./AGENT_STORE.md)

# CAP Integration

Remifi is a **CAP provider** using [@croo-network/sdk](https://docs.croo.network).

## Registration

1. [agent.croo.network](https://agent.croo.network) → Register Agent → copy `CROO_SDK_KEY`
2. Configure three services (see [setup.md](../setup.md))
3. Fund agent AA wallet with USDC for service fees and payouts

## Environment

```bash
CROO_API_URL=https://api.croo.network
CROO_WS_URL=wss://api.croo.network/ws
CROO_SDK_KEY=croo_sk_...
CROO_SERVICE_ID_CREATE_ENS=...
CROO_SERVICE_ID_CREATE_POLICY=...
CROO_SERVICE_ID_EXECUTE_PAYMENT=...
```

USDC payouts use **CROO direct settlement** — no provider private key. CROO's `payOrder` batch sends USDC to the recipient address declared at accept time.

## Services

### createEnsName (ENS Payout Identity)

| Field | Value |
|-------|-------|
| Requirements | Schema |
| Deliverable | Schema |
| Fund transfer | OFF |

### createPolicy (USDC Split Policy)

| Field | Value |
|-------|-------|
| Requirements | Text or Schema |
| Deliverable | Schema |
| Fund transfer | OFF |

### executePaymentJob (USDC Split Execution)

| Field | Value |
|-------|-------|
| Requirements | Schema (one payout leg per hire) |
| Deliverable | Schema |
| Fund transfer | **ON** |

**Requirements (one recipient per order):**

```json
{
  "policyId": "pol_abc123",
  "recipient": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
    "label": "team",
    "amount": "600000"
  }
}
```

At accept, Remifi sets `providerFundAddress` = `recipient.address`. CROO routes USDC there on `payOrder`.

**Delivery:**

```json
{
  "policyId": "pol_abc123",
  "totalUsdc": "600000",
  "txHashes": ["0x..."],
  "recipients": [{ "label": "team", "amount": "600000", "txHash": "0x..." }],
  "baseExplorer": "https://basescan.org/tx/0x...",
  "settlement": "croo_direct"
}
```

Multi-recipient splits = **one CAP hire per recipient**.

## SDK flow

```
NegotiateOrder → AcceptNegotiationWithFundAddress(recipient)
→ PayOrder (CROO signs) → order_paid
→ DeliverOrder (payTxHash as proof)
```

Reference: [CROO Quick Start](https://docs.croo.network/developer-docs/quick-start.md)

## Agent Store listing

Checklist: [AGENT_STORE.md](./AGENT_STORE.md)

# CAP Integration

Remifi is a **CAP provider** using [@croo-network/sdk](https://docs.croo.network).

## Registration

1. [agent.croo.network](https://agent.croo.network) → Register Agent → copy `CROO_SDK_KEY`
2. Configure four services (see [setup.md](../setup.md))
3. Copy **AA Wallet Address** from dashboard → `PROVIDER_AA_WALLET_ADDRESS`

No provider private key is required for payroll — CROO SDK signs `payOrder` and `deliverOrder`.

## Environment

```bash
CROO_API_URL=https://api.croo.network
CROO_WS_URL=wss://api.croo.network/ws
CROO_SDK_KEY=croo_sk_...
CROO_SERVICE_ID_CREATE_ENS=...
CROO_SERVICE_ID_CREATE_POLICY=...
CROO_SERVICE_ID_EXECUTE_PAYMENT=...
CROO_SERVICE_ID_RESOLVE_ENS=...
PROVIDER_AA_WALLET_ADDRESS=0x...   # Dashboard → Configure → AA Wallet
```

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

### resolveEnsName (ENS Forward & Reverse Resolver)

| Field | Value |
|-------|-------|
| Requirements | Text or Schema |
| Deliverable | Schema |
| Fund transfer | OFF |

### executePaymentJob (USDC Split Execution — payroll)

| Field | Value |
|-------|-------|
| Requirements | Schema |
| Deliverable | Schema |
| Fund transfer | **ON** |

**One hire pays every recipient** from a stored policy:

```json
{
  "policyId": "pol_abc123",
  "totalUsdc": "1000000"
}
```

**SDK flow:**

1. Provider `acceptNegotiationWithFundAddress(negotiationId, PROVIDER_AA_WALLET_ADDRESS)`
2. Requester `negotiateOrder` with `fundAmount` + `fundToken` (USDC)
3. Requester `payOrder` — CROO sends payroll principal to provider AA wallet (`order.payTxHash`)
4. Provider `deliverOrder` — CROO completes disbursement (`order.deliverTxHash`)

**Delivery:**

```json
{
  "policyId": "pol_abc123",
  "totalUsdc": "1000000",
  "fundTxHash": "0x...",
  "recipients": [
    { "label": "team", "address": "0x...", "amount": "600000" },
    { "label": "ops", "address": "0x...", "amount": "400000" }
  ],
  "baseExplorer": "https://basescan.org/tx/0x...",
  "settlement": "croo_payroll"
}
```

Disbursement on-chain proof: `order.deliverTxHash` (also returned from `deliverOrder`).

Use `executionGuide.payroll` from the `createPolicy` delivery for ready-to-copy requirements and fund amounts.

## SDK flow (executePaymentJob)

```
NegotiateOrder (policyId + totalUsdc, fundAmount + fundToken)
→ AcceptNegotiationWithFundAddress(provider AA wallet)
→ PayOrder (CROO signs — principal → AA wallet)
→ order_paid → DeliverOrder (CROO SDK)
→ order_completed → GetDelivery
```

Reference: [CROO Quick Start](https://docs.croo.network/developer-docs/quick-start.md)

## Agent Store listing

Checklist: [AGENT_STORE.md](./AGENT_STORE.md)

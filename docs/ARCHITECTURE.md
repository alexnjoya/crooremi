# Remifi Architecture

## Overview

Remifi sits between **CROO CAP** (commerce / hiring) and **Base** (USDC settlement + Base Names).

## Components

| Path | Role |
|------|------|
| `src/cap/server.ts` | CAP SDK bootstrap, WebSocket, order listeners |
| `src/cap/handlers.ts` | Route paid orders to policy / ENS / payroll |
| `src/policy/interpreter.ts` | JSON or natural language → `SplitPolicy` |
| `src/policy/ens-*.ts` | Base Names registration, subnames, resolver |
| `src/policy/execute-batch.ts` | Policy → payroll legs from `totalUsdc` |
| `src/chain/payroll-settlement.ts` | Payroll delivery from CROO order fields |

## Settlement model

| Service | Who moves USDC |
|---------|----------------|
| `createPolicy` | None (schema only) |
| `createEnsName` | None (ENS txs use operator ETH) |
| `resolveEnsName` | None (read-only lookups) |
| `executePaymentJob` | **CROO** → Router (or payout EOA) → multi-recipient split |
| `instantUsdcPay` | **CROO only** — fund transfer direct to recipient address |

`PROVIDER_AA_WALLET_ADDRESS` is the dashboard AA wallet address (no private key in Remifi).

## Order flow (executePaymentJob)

```
NegotiateOrder (policyId + totalUsdc, fundAmount + fundToken)
→ AcceptNegotiationWithFundAddress(provider AA wallet)
→ PayOrder (CROO signs — principal → AA wallet)
→ order_paid → DeliverOrder (CROO SDK)
→ order_completed
```

## Phase 2 (not in MVP)

- On-chain `PolicyRegistry` / `PaymentRouter` contracts
- Recurring payment schedules

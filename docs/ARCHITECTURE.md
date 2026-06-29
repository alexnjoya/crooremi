# Remifi Architecture

## Overview

Remifi sits between **CROO CAP** (commerce / hiring) and **Base** (USDC settlement + Base Names).

## Components

| Path | Role |
|------|------|
| `src/cap/server.ts` | CAP SDK bootstrap, WebSocket, order listeners |
| `src/cap/handlers.ts` | Route paid orders to policy / ENS / settlement |
| `src/policy/interpreter.ts` | JSON or natural language → `SplitPolicy` |
| `src/policy/ens-*.ts` | Base Names registration and subnames |
| `src/chain/croo-settlement.ts` | `executePaymentJob` delivery from CROO `payTxHash` |

## Settlement model

| Service | Who moves USDC |
|---------|----------------|
| `createPolicy` | None (schema only) |
| `createEnsName` | None (ENS txs use operator ETH) |
| `executePaymentJob` | **CROO** via `payOrder` → `recipient.address` set at accept |

No provider private key signs USDC transfers for payouts.

## Order flow

```
NegotiateOrder → AcceptNegotiation → PayOrder (USDC)
→ order_paid → Remifi executes → DeliverOrder (Schema JSON)
→ order_completed
```

`executePaymentJob` uses `AcceptNegotiationWithFundAddress(recipient)`.

## Phase 2 (not in MVP)

- On-chain `PolicyRegistry` / `PaymentRouter` contracts
- Recurring payment schedules

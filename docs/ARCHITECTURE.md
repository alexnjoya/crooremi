# Remifi Architecture

## Overview

Remifi sits between **CROO CAP** (commerce / hiring) and **Base** (USDC settlement).

## Components

| Path | Role |
|------|------|
| `src/cap/server.ts` | CAP SDK bootstrap, WebSocket, order listeners |
| `src/cap/handlers.ts` | `createPolicy`, `executePaymentJob` |
| `src/policy/interpreter.ts` | Natural language or JSON → `SplitPolicy` |
| `src/chain/client.ts` | viem clients for Base |
| `src/chain/router.ts` | Compute amounts from bps; USDC transfers |
| `web/app/page.tsx` | Demo: policy input, split preview, BaseScan links |

## SplitPolicy

```typescript
type SplitRecipient = { address: `0x${string}`; label: string; bps: number };
type SplitPolicy = {
  id: string;
  name: string;
  recipients: SplitRecipient[]; // bps sum = 10000
};
```

## Order flow (CAP)

```
NegotiateOrder → AcceptNegotiation → PayOrder (USDC escrow)
→ order_paid → Remifi executes split → DeliverOrder (tx proof)
→ order_completed
```

## MVP vs Phase 2

| MVP | Phase 2 (optional) |
|-----|-------------------|
| USDC transfer from agent AA wallet | `PaymentRouter.sol` on Base |
| Policies stored off-chain / in delivery | On-chain `PolicyRegistry` |
| ENS as demo identity | ENS resolver integration |

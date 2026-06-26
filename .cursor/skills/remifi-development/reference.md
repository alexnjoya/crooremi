# Remifi Architecture Reference

## Layer diagram

```
Hiring Agent (CAP / Agent Store)
        │
        ▼
CROO CAP — negotiate → pay → escrow (CAPVault)
        │
        ▼
Remifi agent server (Node)
  ├── cap/handlers.ts
  ├── policy/interpreter.ts
  └── chain/router.ts
        │
        ▼
Base — USDC.transfer() × N recipients
```

## File responsibilities

| File | Responsibility |
|------|----------------|
| `agent/src/index.ts` | Boot config, start CAP provider |
| `agent/src/config.ts` | Env validation, Base RPC, USDC address |
| `agent/src/cap/server.ts` | SDK init, WebSocket, order listeners |
| `agent/src/cap/handlers.ts` | Route orders to policy + chain logic |
| `agent/src/policy/interpreter.ts` | NL/JSON → `SplitPolicy` |
| `agent/src/chain/client.ts` | viem public + wallet clients (AA wallet signer) |
| `agent/src/chain/router.ts` | Compute amounts from bps, execute transfers |
| `web/app/page.tsx` | Policy form, split preview, BaseScan links |
| `docs/CAP_INTEGRATION.md` | SDK methods, env vars, order lifecycle |

## Env vars

```bash
# CAP (required)
CROO_API_URL=https://api.croo.network
CROO_WS_URL=wss://api.croo.network/ws
CROO_SDK_KEY=croo_sk_...

# Base (required for splits)
BASE_RPC_URL=
USDC_ADDRESS=          # Base mainnet or Sepolia USDC

# AI policy (one of)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Optional Phase 2 contracts
POLICY_REGISTRY_ADDRESS=
PAYMENT_ROUTER_ADDRESS=
```

## Base USDC addresses (verify before deploy)

- Base Mainnet USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Base Sepolia USDC: check [Base docs](https://docs.base.org) — use testnet for dev

## Partner integration (A2A)

Priority: real cross-team agents (CAProxy, Pygmalion) > disclosed mock agents.

Anti-sybil: aim for ≥3 unique counterparty agents, ≥5 buyer wallets. Never fake partnerships.

## Phase 2 contracts (optional)

Add only after MVP CAP flow works end-to-end:

- `PaymentRouter.sol` — single contract, split + emit event
- Skip `PolicyRegistry` + ENS on-chain for hackathon unless extra time

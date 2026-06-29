# Remifi Architecture Reference

## Layer diagram

```
Hiring Agent (CAP / Agent Store)
        │
        ▼
CROO CAP — negotiate → pay → USDC to recipient (executePaymentJob)
        │
        ▼
Remifi provider (Node)
  ├── cap/handlers.ts
  ├── policy/interpreter.ts + ens-*.ts
  └── chain/croo-settlement.ts
        │
        ▼
Base — USDC settlement + Base Names (*.base.eth)
```

## File responsibilities

| Path | Responsibility |
|------|----------------|
| `src/index.ts` | Boot, health server, CAP provider |
| `src/config.ts` | Env validation |
| `src/cap/server.ts` | WebSocket, order listeners |
| `src/cap/handlers.ts` | createEnsName, createPolicy, executePaymentJob |
| `src/policy/interpreter.ts` | NL/JSON → SplitPolicy |
| `src/chain/croo-settlement.ts` | Execute delivery from CROO payTxHash |
| `docs/CAP_INTEGRATION.md` | SDK flow, payloads |

## Env vars

```bash
CROO_SDK_KEY=croo_sk_...
CROO_SERVICE_ID_CREATE_POLICY=
CROO_SERVICE_ID_CREATE_ENS=
CROO_SERVICE_ID_EXECUTE_PAYMENT=
ENS_REGISTRAR_PRIVATE_KEY=    # Base ETH for ENS gas
ANTHROPIC_API_KEY=            # optional NL createPolicy
BASE_RPC_URL=https://mainnet.base.org
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

## Base USDC

- Mainnet: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

## A2A / anti-sybil

≥3 counterparty agents, ≥5 buyer wallets for prize eligibility. Disclose test agents in README.

# Remifi

**Programmable USDC splits for agent payroll, treasury, and revenue — hireable on CROO.**

CROO Agent Hackathon · **DeFi / On-chain Ops** (primary) · **Open A2A** (secondary)  
Settlement: USDC on Base via CAP — CROO SDK `payOrder` funds provider AA wallet; `deliverOrder` completes payroll.

---

## Services

| Service | Input | Output |
|---------|-------|--------|
| `createEnsName` | JSON | `{ org, ens, address, txHashes }` |
| `createPolicy` | Text or JSON | `{ policyId, policy, executionGuide.payroll }` |
| `resolveEnsName` | Text or JSON | Forward/reverse ENS lookups on Base + Ethereum |
| `executePaymentJob` | Schema JSON + fund | `{ fundTxHash, recipients, settlement: "croo_payroll" }` |

**Typical flow:** `createEnsName` → `createPolicy` → **one** `executePaymentJob` hire pays all recipients.

---

## Quick start

```bash
cp .env.example .env   # fill CROO keys + service IDs
npm install
npm run dev            # provider Online on Agent Store
```

Full setup: [setup.md](./setup.md) · CAP details: [docs/CAP_INTEGRATION.md](./docs/CAP_INTEGRATION.md)

```bash
npm run verify:flow   # logic + store (no live LLM required for most checks)
npm run verify:llm    # LangChain on all four services (requires AI key)
npm run journey       # live CAP + USDC (Railway provider only)
```

---

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `CROO_SDK_KEY` | Yes | Provider API key |
| `CROO_SERVICE_ID_CREATE_POLICY` | Yes | Agent Store service ID |
| `CROO_SERVICE_ID_CREATE_ENS` | Yes | Agent Store service ID |
| `CROO_SERVICE_ID_EXECUTE_PAYMENT` | Yes | Agent Store service ID |
| `CROO_SERVICE_ID_RESOLVE_ENS` | Yes | ENS resolver service ID |
| `PROVIDER_AA_WALLET_ADDRESS` | Execute | CROO dashboard AA wallet — fund-transfer receive address |
| `ENS_REGISTRAR_PRIVATE_KEY` | ENS services | Operator wallet — Base ETH for name gas |
| `DATABASE_URL` | Production | Neon Postgres — policy store for execution |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | Yes (production) | LangChain smart parsing on all services |
| `BASE_RPC_URL` | Optional | Default: `https://mainnet.base.org` |
| `USDC_ADDRESS` | Optional | Default: Base mainnet USDC |

---

## Production

```bash
npm run build:prod
NODE_ENV=production npm start
```

**Railway / Docker:** see `Dockerfile`, `railway.toml`. Set all env vars from `.env.example` in the dashboard (no `.env` file on host).

```bash
curl https://<your-host>/health   # { "ok": true, "provider": "online" }
```

`NODE_ENV=production` validates: all four service IDs, `PROVIDER_AA_WALLET_ADDRESS`, `ENS_REGISTRAR_PRIVATE_KEY`, `DATABASE_URL`, mocks disabled.

---

## Architecture

```
Hiring agent → CAP (hire + pay) → Remifi → deliver Schema JSON
executePaymentJob: CROO payOrder → provider AA wallet → deliverOrder (CROO SDK)
createEnsName / createPolicy: operator wallet for Base Names gas only
```

| Path | Role |
|------|------|
| `src/cap/` | WebSocket provider, handlers |
| `src/policy/` | Policy interpreter, ENS, payroll planning |
| `src/chain/payroll-settlement.ts` | Payroll delivery proof from CROO order fields |

---

## Hackathon checklist

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Listed on [Agent Store](https://agent.croo.network) | ☐ deploy + Online |
| 2 | CAP + on-chain USDC on Base | ☑ provider deployed |
| 3 | Open source MIT | ☑ |
| 4 | Demo video + README | ☐ |
| 5 | [DoraHacks BUIDL](https://dorahacks.io/hackathon/croo-hackathon/detail) | ☐ |

---

## License

MIT — see [LICENSE](./LICENSE)

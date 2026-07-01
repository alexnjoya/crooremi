# Remifi

**The CAP agent other agents hire for Base payment names and auditable USDC splits.**

[![Agent Store](https://img.shields.io/badge/CROO-Agent%20Store-7B42F6)](https://agent.croo.network/agents/fd57334e-5e6f-4b76-9d5f-da0202f23a10)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Hackathon](https://img.shields.io/badge/CROO-Agent%20Hackathon-000)](https://dorahacks.io/hackathon/croo-hackathon/detail)

Remifi is a **paid, callable CAP provider** on [CROO Agent Store](https://agent.croo.network). Other agents (or humans) hire it to register `*.base.eth` payment identities, define split policies, and settle **real USDC on Base** with per-recipient on-chain proof.

**Tracks:** DeFi / On-chain Ops Agents (primary) · Open – Any A2A Agents (secondary)

---

## Why judges should care

Most hackathon agents are **terminal services** — pay USDC, get one answer back. Remifi is **composable infrastructure**: an orchestrator, treasury bot, or creator agent can hire Remifi as its payout leg instead of building its own splitter.

| CROO requirement | Remifi |
|------------------|--------|
| Listed on Agent Store | [Hire Remifi](https://agent.croo.network/agents/fd57334e-5e6f-4b76-9d5f-da0202f23a10) |
| CAP integrated, on-chain settlement | WebSocket provider + USDC on Base |
| Open source (MIT) | This repo |
| Demo + README | See [Demo](#demo-5-min) and setup below |
| DoraHacks BUIDL | [croo-hackathon](https://dorahacks.io/hackathon/croo-hackathon/detail) |

---

## What it does

Four hireable CAP services:

| Service | Input | Output |
|---------|-------|--------|
| `createEnsName` | Text or JSON | Register org + subnames on Base (`payroll.acme.base.eth`) |
| `createPolicy` | Text, JSON, or natural language | Split policy + `executionGuide.payroll` |
| `resolveEnsName` | Name or address | Forward/reverse ENS lookup (Base + L1 read) |
| `executePaymentJob` | `policyId` + USDC fund | One hire pays **all** recipients on Base with tx proof |

**Example A2A flow**

```
1. createEnsName   →  payroll.acme.base.eth
2. createPolicy    →  60% team / 40% ops
3. executePaymentJob →  USDC to every recipient + delivery JSON with tx hashes
```

Buyers pay **USDC via CAP**. Base name registration gas is covered by the operator wallet; payroll disbursement is signed from the provider payout wallet.

---

## Quick start

### Agent (required)

```bash
git clone https://github.com/alexnjoya/crooremi.git
cd crooremi
cp .env.example .env
npm install
```

1. Register at [agent.croo.network](https://agent.croo.network) and copy `CROO_SDK_KEY`.
2. Create the four services in the Agent Store dashboard (see [docs/CAP_INTEGRATION.md](docs/CAP_INTEGRATION.md)).
3. Fill `.env` — at minimum: `CROO_SDK_KEY`, service IDs, `BASE_RPC_URL`, `USDC_ADDRESS`, `DATABASE_URL`, and payout/ENS keys as needed.
4. Run the provider:

```bash
npm run dev
```

Health check: `GET http://localhost:3001/health`

**Smoke tests**

```bash
npm run verify:flow    # local CAP + policy flow
npm run verify:llm     # LangChain parsing (needs ANTHROPIC_API_KEY or OPENAI_API_KEY)
npm run journey        # full scripted journey
```

### Demo UI (optional)

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Opens at `http://localhost:3000` — split preview + link to hire on Agent Store. See [docs/WEB.md](docs/WEB.md).

### Deploy

Docker + Railway config included (`Dockerfile`, `railway.toml`). Provider must stay online for Agent Store **Online** status.

---

## CAP / SDK integration

Package: [`@croo-network/sdk`](https://docs.croo.network)

**Provider (this repo)**

| Method | Use |
|--------|-----|
| WebSocket provider | `src/cap/server.ts` — listen for `order_paid` |
| `acceptNegotiationWithFundAddress` | `executePaymentJob` — provider AA wallet receives payroll principal |
| `deliverOrder` | Return Schema JSON with `fundTxHash` + per-recipient proof |

**Requester (any hiring agent)**

| Method | Use |
|--------|-----|
| `negotiateOrder` | Hire a service; pass `fundAmount` + `fundToken` for payroll |
| `payOrder` | Pay USDC — CROO settles on-chain |
| `getDelivery` | Read split result + tx hashes |

Full service schemas and negotiate examples: [docs/CAP_INTEGRATION.md](docs/CAP_INTEGRATION.md)

---

## Demo (≤5 min)

1. **Problem** — Agents and DAOs still split payroll/treasury manually.
2. **`createEnsName` + `createPolicy`** — Register `payroll.acme.base.eth`, define splits (JSON or plain English).
3. **`executePaymentJob`** — One hire, USDC to all recipients on Base.
4. **Proof** — BaseScan txs + CAP delivery JSON (`fundTxHash`, per-recipient `txHash`).
5. **A2A** — Another agent hires Remifi from the Agent Store as its payout layer.

Script: [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)

---

## Repo layout

```
├── src/
│   ├── cap/           # CAP WebSocket provider + handlers
│   └── policy/        # ENS, policy interpreter, payroll settlement
├── web/               # TanStack Start demo UI
├── contracts/         # Router Solidity (optional on-chain path)
├── scripts/           # verify:flow, verify:llm, journey
└── docs/              # CAP, Agent Store, demo script
```

---

## Tech stack

Node.js · TypeScript · `@croo-network/sdk` · viem on **Base** · USDC · Base Names (`*.base.eth`) · LangChain (optional NL parsing) · Neon Postgres · Zod

---

## Links

| | |
|---|---|
| **Agent Store** | https://agent.croo.network/agents/fd57334e-5e6f-4b76-9d5f-da0202f23a10 |
| **CROO docs** | https://docs.croo.network |
| **Hackathon** | https://dorahacks.io/hackathon/croo-hackathon/detail |
| **Discord** | https://discord.gg/y3xHr3t8nx |

## License

MIT — see [LICENSE](LICENSE).

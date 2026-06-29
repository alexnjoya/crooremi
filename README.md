# Remifi

**Programmable USDC splits for agent payroll, treasury, and revenue — hireable on CROO.**

CROO Agent Hackathon · **DeFi / On-chain Ops** (primary) · **Open A2A** (secondary)  
Settlement: USDC on Base via CAP

---

## Problem

Agents and DAOs still handle payroll, treasury, bounties, and revenue splits manually. There is no hireable agent that other agents can call to route USDC to multiple recipients with on-chain proof.

## Solution

Remifi is a CAP agent on the [CROO Agent Store](https://agent.croo.network):

1. Hire Remifi via CAP (USDC on Base)
2. Send a policy in **plain English** or **JSON**
3. Remifi splits USDC to recipients and returns **Base transaction hashes**

| Service | Input | Output |
|---------|-------|--------|
| `createEnsName` | JSON | `{ org, ens, address, txHashes }` |
| `createPolicy` | Text or JSON | `{ policyId, policy }` with resolved `0x` addresses |
| `executePaymentJob` | Schema JSON | `{ txHashes, recipients, baseExplorer }` |

---

## Quick start

### Prerequisites

- Node.js **18+**
- [CROO account](https://agent.croo.network) + agent registered
- USDC on Base (service fees + split principal)
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` (for natural-language `createPolicy`)

### Install & run provider

```bash
cp .env.example .env
# Fill .env — see table below
npm install
npm run setup:check    # shows what's missing
npm run dev            # provider → dashboard should show Online
```

### Smoke tests

```bash
npm run test:policy              # local JSON parse (no network)
npm run test:full-journey        # A2A orchestrator: ENS → policy → execution
npm run test:create-policy       # CAP E2E — needs 2nd funded requester agent
npm run test:execute-payment     # CAP E2E — needs AA wallet + private key + USDC
```

### Deploy with Docker

The CAP provider ships as a multi-stage Docker image (`Dockerfile`). Railway uses this via `railway.toml`.

**Build locally:**

```bash
npm run build:prod          # typecheck + tsc → dist/
docker build -t remifi .    # multi-stage image
```

**Local Docker smoke test** (requires a filled `.env`):

```bash
docker run --rm -p 3001:3001 --env-file .env -e NODE_ENV=production remifi
# or: docker compose up --build
curl http://localhost:3001/health
```

**Deploy to Railway**

1. Push this repo to GitHub.
2. [Railway](https://railway.app) → **New** → **GitHub Repo** → select this repo.
3. Railway builds from `Dockerfile` (see `railway.toml`) and runs `node dist/index.js`.
4. **Variables** — paste every required value from `.env.example` (no `.env` file on Railway):

   | Variable | Required |
   |----------|----------|
   | `CROO_SDK_KEY` | Yes |
   | `CROO_SERVICE_ID_CREATE_POLICY` | Yes |
   | `CROO_SERVICE_ID_CREATE_ENS` | Yes |
   | `CROO_SERVICE_ID_EXECUTE_PAYMENT` | Yes |
   | `PROVIDER_AA_WALLET_ADDRESS` | Yes |
   | `AGENT_WALLET_PRIVATE_KEY` | Yes |
   | `ENS_REGISTRAR_PRIVATE_KEY` | Yes |
   | `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | For NL `createPolicy` |
   | `BASE_RPC_URL`, `BASE_CHAIN_ID`, `USDC_ADDRESS` | Chain config |
   | `NODE_ENV` | `production` |
   | `DEV_MOCK_SETTLEMENT` | `false` |
   | `DEV_MOCK_ENS_SUBNAMES` | `false` |

5. Deploy → logs should show `production env validated`, `health server listening`, and `provider online`.
6. Confirm agent shows **Online** on [agent.croo.network](https://agent.croo.network).
7. `https://<your-railway-url>/health` → `{ "ok": true, "provider": "online" }`.

Without Docker: `npm run build:prod && NODE_ENV=production npm start`.

**Pre-deploy checklist:**

```bash
npm run setup:check        # local .env validation
npm run build:prod         # compile TypeScript
npm run verify:agent       # CAP agent + service IDs
```

---

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `CROO_SDK_KEY` | Yes | Provider API key (`croo_sk_...`) |
| `CROO_SERVICE_ID_CREATE_POLICY` | Yes | Dashboard service ID |
| `CROO_SERVICE_ID_CREATE_ENS` | Yes | Dashboard service ID |
| `CROO_SERVICE_ID_EXECUTE_PAYMENT` | Yes | Dashboard service ID |
| `PROVIDER_AA_WALLET_ADDRESS` | For payouts | AA Wallet from Configure page |
| `AGENT_WALLET_PRIVATE_KEY` | For payouts | Signs `USDC.transfer()` on Base |
| `ENS_REGISTRAR_PRIVATE_KEY` | For ENS | Operator wallet — pays Base ENS gas |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | For NL policy | `createPolicy` text input |
| `CROO_REQUESTER_SDK_KEY` | E2E tests | Second registered agent |
| `CROO_TARGET_SERVICE_ID` | E2E tests | Service to hire (defaults per script) |
| `BASE_RPC_URL` | Optional | Default: `https://mainnet.base.org` |
| `USDC_ADDRESS` | Optional | Default: Base mainnet USDC |

Copy **AA Wallet** from [agent.croo.network](https://agent.croo.network) → Configure → **AA Wallet Address** (not Controller/Executor). Fund it with USDC on Base.

Full setup wizard: [setup.md](./setup.md)

---

## Architecture

```
Hiring agent → CAP (hire + pay) → Remifi (policy + split) → USDC on Base → proof back
```

| Layer | Path |
|-------|------|
| CAP handlers | `src/cap/` |
| LangChain + ENS | `src/policy/` |
| viem USDC splits | `src/chain/` |

MVP uses **agent AA wallet transfers** — no custom Solidity contracts. See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

CAP details: [docs/CAP_INTEGRATION.md](./docs/CAP_INTEGRATION.md)

---

## Order flow

```
NegotiateOrder → AcceptNegotiation → PayOrder → order_paid
→ createPolicy (LangChain) or executePaymentJob (viem)
→ DeliverOrder → order_completed
```

---

## Hackathon checklist

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Listed on Agent Store | ☐ |
| 2 | CAP + on-chain USDC | ☐ |
| 3 | Open source (MIT) | ☑ `LICENSE` |
| 4 | Demo video + README | ☐ |
| 5 | DoraHacks BUIDL | ☐ |

Progress tracker: [planupdate.md](./planupdate.md)

---

## Repo layout

```
src/cap            CAP provider (WebSocket + handlers)
src/policy         LangChain interpreter + ENS resolve
src/chain          viem USDC transfers
scripts/           setup-check + smoke tests
docs/              Architecture, CAP, demo script
```

---

## License

MIT — see [LICENSE](./LICENSE)

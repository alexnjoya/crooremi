# Remifi

**Programmable USDC splits for agent payroll, treasury, and revenue — hireable on CROO.**

CROO Agent Hackathon · **DeFi / On-chain Ops** (primary) · **Open A2A** (secondary)  
Settlement: USDC on Base via CAP (CROO direct — no provider signing key for payouts)

---

## Services

| Service | Input | Output |
|---------|-------|--------|
| `createEnsName` | JSON | `{ org, ens, address, txHashes }` |
| `createPolicy` | Text or JSON | `{ policyId, policy }` |
| `executePaymentJob` | Schema JSON + fund | `{ txHashes, settlement: "croo_direct" }` |

**Typical flow:** `createPolicy` → `executePaymentJob` per recipient (one CAP hire per payout leg).

---

## Quick start

```bash
cp .env.example .env   # fill CROO keys + service IDs
npm install
npm run setup:check
npm run dev            # provider Online on Agent Store
```

E2E demo (second funded requester agent required):

```bash
npm run sample:flow    # createPolicy → execute payouts (minimal USDC)
```

Full setup: [setup.md](./setup.md) · CAP details: [docs/CAP_INTEGRATION.md](./docs/CAP_INTEGRATION.md)

---

## Environment

| Variable | Required | Purpose |
|----------|----------|---------|
| `CROO_SDK_KEY` | Yes | Provider API key |
| `CROO_SERVICE_ID_CREATE_POLICY` | Yes | Agent Store service ID |
| `CROO_SERVICE_ID_CREATE_ENS` | Yes | Agent Store service ID |
| `CROO_SERVICE_ID_EXECUTE_PAYMENT` | Yes | Agent Store service ID |
| `ENS_REGISTRAR_PRIVATE_KEY` | ENS services | Operator wallet — Base ETH for name gas |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | NL policy | Natural-language `createPolicy` |
| `CROO_REQUESTER_SDK_KEY` | E2E only | Second agent for integration tests |
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

`NODE_ENV=production` validates: all three service IDs, `ENS_REGISTRAR_PRIVATE_KEY`, mocks disabled.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run setup:check` | Validate `.env` |
| `npm run verify:agent` | CAP service IDs + local policy smoke |
| `npm run sample:flow` | E2E: createPolicy → execute payouts (optional demo) |

`sample:flow` needs a second funded CROO agent (`CROO_REQUESTER_SDK_KEY`).

---

## Architecture

```
Hiring agent → CAP (hire + pay) → Remifi → deliver Schema JSON
executePaymentJob: CROO payOrder → recipient USDC on Base (tx proof in delivery)
createEnsName / createPolicy: operator wallet for Base Names gas only
```

| Path | Role |
|------|------|
| `src/cap/` | WebSocket provider, handlers |
| `src/policy/` | Policy interpreter, ENS |
| `src/chain/croo-settlement.ts` | Execute delivery proof from CROO `payTxHash` |

---

## Hackathon checklist

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Listed on [Agent Store](https://agent.croo.network) | ☐ deploy + Online |
| 2 | CAP + on-chain USDC on Base | ☑ `sample:flow` proven |
| 3 | Open source MIT | ☑ |
| 4 | Demo video + README | ☐ |
| 5 | [DoraHacks BUIDL](https://dorahacks.io/hackathon/croo-hackathon/detail) | ☐ |

---

## License

MIT — see [LICENSE](./LICENSE)

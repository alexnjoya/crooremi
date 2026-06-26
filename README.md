# Remifi

**The AI agent that automates payroll, treasury, and revenue splits — hireable by other agents on CROO.**

> CROO Agent Hackathon · [DoraHacks BUIDL](https://dorahacks.io/hackathon/croo-hackathon/detail)  
> **Tracks:** DeFi / On-chain Ops (primary) · Open – Any A2A (secondary)  
> **Settlement:** USDC on [Base](https://base.org) via [CAP](https://docs.croo.network)

| | |
|---|---|
| **Agent Store** | [agent.croo.network](https://agent.croo.network) *(listing link TBD)* |
| **Demo video** | *(link TBD — max 5 min)* |
| **License** | MIT |

---

## For judges (60-second read)

**Problem:** AI agents and DAOs move money manually or through rigid contracts. Payrolls, treasury distributions, bounties, and revenue splits have no shared, hireable payment orchestration layer on-chain.

**What Remifi does:** A callable CAP agent that turns a plain-English policy (e.g. *"40% team, 30% ops, 20% treasury, 10% reinvest"*) into real **USDC splits on Base**, with on-chain proof returned to the hiring agent.

**Why this is not "another CAP demo":** Most BUIDLs are **terminal nodes** — pay USDC, get a signal, forecast, or verification, done. Remifi is **infrastructure**: other agents hire it as a **payout leg** in their own pipelines. That is the composability story CAP is built for.

**What to look for in the demo:** Natural language → policy → multi-recipient USDC transfer → **another team's agent** hiring Remifi via the Agent Store (not a self-spun mock unless disclosed).

---

## The problem

Thousands of agents and DAOs need to:

- Run **payroll** and contributor payments  
- Distribute **treasury** funds on a schedule  
- Split **creator / platform / agent** revenue  
- Route **bounty** and subscription payouts  

Today this is done manually, with one-off scripts, or with inflexible smart contracts. There is no standard way for **Agent A to hire Agent B** specifically to handle policy-based payment routing with auditable on-chain execution.

---

## The solution

Remifi is a paid, callable agent on the [CROO Agent Store](https://agent.croo.network):

1. **Hire** Remifi via CAP (USDC payment, on-chain escrow).  
2. **Submit** a policy in natural language or JSON.  
3. **Receive** automatic USDC distribution to multiple recipients on Base.  
4. **Get proof** — transaction hashes and structured delivery JSON for the hiring agent's reputation trail.

Optional identity layer: ENS names (e.g. `team.remifi.eth`) as human-readable payment destinations linked to split policies.

### CAP services

| Service | Input | Output |
|---------|-------|--------|
| `createPolicy` | Text or JSON policy spec | Structured `SplitPolicy` (recipients + basis points) |
| `executePaymentJob` | Policy + amount | Base tx hashes + split breakdown |

Full SDK and order lifecycle: [docs/CAP_INTEGRATION.md](./docs/CAP_INTEGRATION.md)

---

## Why Remifi stands out

### 1. Unique category on the BUIDL board

Scanning competing submissions: DeFi entries cluster around **trading signals and swaps**; verification entries around **attestations**; Open A2A around **translation pipelines**. **No other team is building payment / treasury orchestration.** Remifi fills a gap other agents can plug into.

### 2. Infrastructure, not a one-shot answer

| Typical agent | Remifi |
|---------------|--------|
| Agent calls → gets answer → done | Agent calls → **funds move on-chain** → proof returned |
| Terminal node | **Composable dependency** in larger workflows |

**Target integrations (real teams on the board):**

| Partner | Use case |
|---------|----------|
| [CAProxy](https://dorahacks.io) (orchestrator) | Uses Remifi as the **payout step** after composing sub-agents |
| [Pygmalion](https://dorahacks.io) (creator KOL) | **Revenue split** between creator, platform, and agent |

We pursue **genuine cross-team CAP hires** — not undisclosed self-built mocks — to satisfy anti-sybil rules and demonstrate real A2A composability.

### 3. Pitch framing (what wins reviews)

Judges see many entries described as *"callable agent + CAP + USDC on Base."* That is table stakes. Remifi leads with **what it automates** (payroll, treasury, revenue splits) and **who hires it** (other agents), not protocol integration alone.

### 4. Post-hackathon viability

Fee model: **0.1–0.5%** on routed volume. Payment orchestration is recurring infrastructure — not a one-time query.

---

## Architecture

```
Hiring agent (CAP / Agent Store)
        │  hire + pay USDC
        ▼
CROO CAP — negotiate → escrow → settle
        │
        ▼
Remifi agent (Node.js + CAP SDK)
  ├── policy interpreter (NL → split rules)
  └── USDC transfers on Base (per recipient)
        │
        ▼
On-chain proof → delivery JSON → hiring agent reputation
```

**Layers:**

| Layer | Role |
|-------|------|
| **CROO / CAP** | Discovery, hiring, identity, order lifecycle — not a blockchain |
| **Remifi server** | Policy logic + execution (`agent/`) |
| **Base** | USDC settlement and verifiable tx proofs |

Details: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

---

## Hackathon compliance

All five [submission requirements](https://dorahacks.io/hackathon/croo-hackathon/detail) are mandatory.

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Listed on CROO Agent Store | ☐ | Agent Store URL above |
| 2 | CAP integration + on-chain USDC | ☐ | `agent/src/cap/`, Base tx hashes in delivery |
| 3 | Open source (MIT) | ☐ | This repo + `LICENSE` |
| 4 | Demo video + README | ☐ | Video link above; setup below |
| 5 | BUIDL on DoraHacks | ☐ | Hackathon link above |

**Demo must show:** policy creation → USDC split on Base → hire via CAP from another agent → on-chain proof.

**Anti-sybil:** We target ≥3 unique counterparty agents and ≥5 buyer wallets via real integrations. Any test-only agents are **disclosed in this README and the demo narration**.

---

## Quick start

### Prerequisites

- Node.js 18+
- [CROO account](https://agent.croo.network) + agent API key (`CROO_SDK_KEY`)
- USDC on Base (testnet for dev) — order fees only; [CROO sponsors gas](https://docs.croo.network/developer-docs/quick-start) for CAP orders

### Setup

```bash
git clone <this-repo>
cd remifi   # or your clone folder name

cp .env.example .env
# Fill: CROO_SDK_KEY, BASE_RPC_URL, USDC_ADDRESS, ANTHROPIC_API_KEY or OPENAI_API_KEY

pnpm install          # once package.json is added
pnpm dev              # agent + web demo
```

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `CROO_SDK_KEY` | Yes | CAP provider authentication |
| `CROO_API_URL` | Yes | `https://api.croo.network` |
| `CROO_WS_URL` | Yes | `wss://api.croo.network/ws` |
| `BASE_RPC_URL` | Yes | Base RPC (Sepolia or mainnet) |
| `USDC_ADDRESS` | Yes | USDC contract on Base |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | Yes | Natural-language policy parsing |

See [.env.example](./.env.example) for the full list.

### Run agent (CAP provider)

```bash
cd agent
npm install @croo-network/sdk viem
npm run dev           # once implemented — listens for CAP orders
```

Agent should show **Online** in the [CROO dashboard](https://agent.croo.network).

### Test end-to-end

1. Register a **second** agent as requester in the dashboard.  
2. Fund its **AA wallet** with USDC (not the controller address).  
3. Hire Remifi's `executePaymentJob` from the Store or requester script.  
4. Verify delivery JSON contains Base transaction hashes.

---

## Repository structure

```
├── agent/           # CAP-callable Remifi agent (core)
│   └── src/
│       ├── cap/     # CAP SDK + order handlers
│       ├── policy/  # NL → SplitPolicy
│       └── chain/   # USDC splits on Base (viem)
├── web/             # Thin demo UI (Next.js)
├── docs/            # Architecture, CAP integration, demo script
├── contracts/       # Optional Phase 2 on-chain router
└── scripts/         # Setup & submission checks
```

---

## Tech stack

| Component | Choice |
|-----------|--------|
| Agent runtime | Node.js / TypeScript |
| Agent protocol | [@croo-network/sdk](https://docs.croo.network) |
| Chain | [viem](https://viem.sh) on Base |
| Payments | USDC (ERC-20) |
| Demo UI | Next.js |
| AI | Claude / OpenAI for policy interpretation |

**MVP note:** Initial release uses CAP settlement + USDC `transfer()` from the agent wallet. Custom Solidity routers are optional Phase 2.

---

## Demo script (5 min)

| Time | Content |
|------|---------|
| 0:00–0:20 | Problem: manual agent/DAO payouts → type NL policy |
| 0:20–1:30 | Live split: policy → USDC to multiple addresses on Base |
| 1:30–3:00 | **Another team's agent** hires Remifi on Agent Store |
| 3:00–4:00 | BaseScan txs + CAP delivery / reputation trail |
| 4:00–5:00 | Fee model + vision as default agent settlement layer |

Full script: [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md)

---

## Links

| Resource | URL |
|----------|-----|
| CROO | https://croo.network |
| Docs | https://docs.croo.network |
| Agent Store | https://agent.croo.network |
| Hackathon | https://dorahacks.io/hackathon/croo-hackathon/detail |
| Discord | https://discord.gg/y3xHr3t8nx |

---

## License

MIT — see [LICENSE](./LICENSE) *(add before final submission)*.

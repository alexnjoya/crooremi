# Remifi

**Programmable USDC splits for agent payroll, treasury, and revenue — hireable on CROO.**

CROO Agent Hackathon · DeFi / On-chain Ops · Open A2A  
Settlement: USDC on Base via CAP

---

## Problem

Agents and DAOs still handle payroll, treasury, bounties, and revenue splits manually or with rigid contracts. There is no hireable agent that other agents can call to route USDC to multiple recipients with on-chain proof.

## Solution

Remifi is a CAP agent on the [CROO Agent Store](https://agent.croo.network):

1. Hire Remifi via CAP (USDC on Base)
2. Send a policy in plain English or JSON
3. Remifi splits USDC to recipients and returns transaction hashes

**Services**

| Service | Does |
|---------|------|
| `createPolicy` | Text/JSON → split rules (addresses + %) |
| `executePaymentJob` | Run split on Base, return tx proof |

## Why Remifi

- **Different category** — most BUIDLs sell signals, verification, or content. Remifi is **payment infrastructure** other agents plug into.
- **A2A composability** — built to be hired as a payout step (e.g. orchestrators, creator monetization agents), not a one-off answer.
- **Real use case** — payroll, treasury, creator/platform/agent revenue splits.

## Architecture

```
Hiring agent → CAP (hire + pay) → Remifi (policy + split) → USDC on Base → proof back
```

| Layer | Role |
|-------|------|
| CROO / CAP | Discovery, hiring, orders |
| `src/` | Policy logic + USDC execution |
| Base | Settlement + verifiable txs |

More detail: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) · [docs/CAP_INTEGRATION.md](./docs/CAP_INTEGRATION.md)

## Hackathon checklist

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Listed on Agent Store | ☐ |
| 2 | CAP + on-chain USDC | ☐ |
| 3 | Open source (MIT) | ☐ |
| 4 | Demo video + README | ☐ |
| 5 | DoraHacks BUIDL | ☐ |

Demo: policy → split on Base → another agent hires Remifi → on-chain proof.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Agent should show **Online** in the CROO dashboard.

## Repo layout

```
src/cap            CAP handlers
src/policy         NL → split policy (LangChain + ENS)
src/chain          USDC transfers on Base
scripts/           Requester test client
web/               Demo UI
docs/              Architecture, CAP notes, demo script
```

## License

MIT

# Remifi — Dev Plan & Project Structure

> Lean monorepo for CROO Agent Hackathon · v1 · June 26, 2026  
> Product spec: [remifi.md](./remifi.md)

---

## Design Principles

| Principle | How we apply it |
|-----------|-----------------|
| **Hackathon-first** | Every top-level folder maps to a submission requirement |
| **Not over-built** | One agent runtime (Node), one contract toolkit (Hardhat), one thin demo UI |
| **Fast onboarding** | `pnpm install` → copy `.env` → `pnpm dev` |
| **Real settlement** | Contracts + USDC on Base; CAP SDK for hire/pay |
| **Judge-ready docs** | `docs/` holds CAP methods, architecture, demo script, Store checklist |

---

## Repo Layout

**Workspace root = repo root.** All code lives directly under `hackathon/` (publish as `remifi` on GitHub if desired). There is no nested `remifi/` code folder.

```
hackathon/                    # ← repo root (open-source root)
├── remifi.md                 # product & hackathon strategy
├── devplan.md                # this file
├── README.md                 # setup, env vars, CAP methods, demo link (to add)
├── LICENSE                   # MIT (to add)
├── .gitignore
├── .env.example
├── package.json              # workspace root scripts (to add)
├── .cursor/skills/           # Cursor agent skills
│
├── agent/                    # CAP-callable Remifi agent (Node.js + CAP SDK)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── src/
│   │   ├── index.ts
│   │   ├── config.ts
│   │   ├── cap/
│   │   │   ├── server.ts
│   │   │   └── handlers.ts
│   │   ├── policy/
│   │   │   └── interpreter.ts
│   │   └── chain/
│   │       ├── client.ts
│   │       └── router.ts
│   └── test/
│       └── smoke.test.ts
│
├── contracts/                # Base on-chain (Hardhat) — Phase 2
│   ├── contracts/
│   │   ├── PolicyRegistry.sol
│   │   └── PaymentRouter.sol
│   ├── scripts/deploy.ts
│   ├── test/
│   └── deployments/
│
├── web/                      # thin demo UI (Next.js)
│   ├── app/
│   │   ├── page.tsx
│   │   └── api/health/route.ts
│   └── lib/chain.ts
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── CAP_INTEGRATION.md
│   ├── AGENT_STORE.md
│   └── DEMO_SCRIPT.md
│
└── scripts/
    ├── setup.ps1
    ├── setup.sh
    └── check-submission.ps1
```

---

## Hackathon Requirement Mapping

| # | Requirement | Where it lives |
|---|-------------|----------------|
| 1 | Listed on CROO Agent Store | `docs/AGENT_STORE.md` + agent CAP registration in `agent/src/cap/` |
| 2 | CAP integration, on-chain settlement | `agent/src/cap/` + `contracts/` + `agent/src/chain/` |
| 3 | Open source (MIT) | `LICENSE` + public `remifi/` repo |
| 4 | Demo + README | `README.md` + `web/` + `docs/CAP_INTEGRATION.md` + video (link in README) |
| 5 | DoraHacks BUIDL | [dorahacks.io/hackathon/croo-hackathon](https://dorahacks.io/hackathon/croo-hackathon/detail) |

---

## What We Intentionally Skip (for now)

| Skipped | Why |
|---------|-----|
| Foundry + Hardhat | One toolchain (Hardhat) is enough |
| `packages/shared` workspace | Two consumers only; duplicate tiny types if needed |
| ERC-4337 smart wallet | Agent wallet via CAP; add post-hackathon if needed |
| ENS subname automation | Manual ENS for demo; resolver wiring in v2 of contracts |
| LangChain heavy folder tree | Single `interpreter.ts` until policies get complex |
| Docker / Terraform | `pnpm dev` is faster for judges cloning the repo |
| E2E Playwright | Smoke tests + 5-min video are sufficient for hackathon |

---

## Onboarding (target: 3 commands)

```bash
# from repo root (hackathon/)
cp .env.example .env
pnpm install
pnpm dev
```

### First-time deploy (Base Sepolia)

```bash
pnpm deploy:contracts         # writes addresses → contracts/deployments/
pnpm test                     # agent smoke + contract unit tests
```

### Env vars (single source: root `.env.example`)

| Variable | Used by |
|----------|---------|
| `BASE_RPC_URL` | agent, contracts, web |
| `DEPLOYER_PRIVATE_KEY` | contracts deploy only |
| `USDC_ADDRESS` | contracts + agent |
| `POLICY_REGISTRY_ADDRESS` | agent + web (after deploy) |
| `PAYMENT_ROUTER_ADDRESS` | agent + web (after deploy) |
| `CAP_AGENT_ID` / CAP SDK creds | agent |
| `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` | agent policy interpreter |

---

## Build Order (16-day plan alignment)

| Phase | Folder | Deliverable |
|-------|--------|-------------|
| **Day 1–2** | `contracts/` | PolicyRegistry + PaymentRouter deployable on Base Sepolia |
| **Day 3–4** | `agent/src/chain/` | Agent reads/writes contracts via viem |
| **Day 5–6** | `agent/src/policy/` | NL policy → split struct |
| **Day 7** | `agent/src/cap/` | CAP handlers live; callable from Store |
| **Day 8–9** | `contracts/test/` + `agent/test/` | Multi-recipient split + execution proof |
| **Day 10–11** | `agent/src/cap/` | Partner agent integration (CAProxy / Pygmalion) or disclosed mock |
| **Day 12–13** | `web/` + `docs/DEMO_SCRIPT.md` | Record demo video |
| **Day 14–16** | `docs/` + `README.md` | Store listing, DoraHacks submit, `check-submission` pass |

---

## Root `package.json` Scripts (planned)

```json
{
  "scripts": {
    "dev": "concurrently \"pnpm --filter agent dev\" \"pnpm --filter web dev\"",
    "test": "pnpm --filter contracts test && pnpm --filter agent test",
    "deploy:contracts": "pnpm --filter contracts deploy",
    "check:submission": "node scripts/check-submission.ps1"
  }
}
```

---

## CAP Surface (agent exposes)

Document fully in `docs/CAP_INTEGRATION.md` once implemented:

| Method | Purpose |
|--------|---------|
| `createPolicy` | NL or JSON policy → stored on Base PolicyRegistry |
| `executePaymentJob` | Receive USDC intent → Router split → return tx hash proof |

---

## Status

- [x] Structure defined
- [x] Folder scaffold created (flat layout at repo root)
- [x] Cursor skills created (`.cursor/skills/`)
- [x] `.gitignore` + `.env.example` files (root, agent, contracts, web)
- [ ] `pnpm install` works
- [ ] Contracts deploy to Base Sepolia
- [ ] CAP agent callable
- [ ] Agent Store listed
- [ ] Demo video recorded
- [ ] DoraHacks submitted

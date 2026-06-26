# Remifi Agent

**Hireable, ENS-Powered Programmable Payments Agent**

> CROO Agent Hackathon · Project Plan v2.2 · Updated June 26, 2026

**Tagline:** The AI Agent that turns any ENS name into an intelligent, autonomous payment engine.

---

## Quick Reference — CROO Hackathon

| Resource | Link |
|----------|------|
| **Hackathon (DoraHacks)** | [dorahacks.io/hackathon/croo-hackathon](https://dorahacks.io/hackathon/croo-hackathon/detail) |
| **Website** | [croo.network](https://croo.network) |
| **Docs** | [docs.croo.network](https://docs.croo.network) |
| **Agent Store** | [agent.croo.network](https://agent.croo.network) |
| **X (Twitter)** | [@CROONetwork](https://x.com/CROONetwork) |
| **Settlement chain** | [Base](https://base.org) (USDC on-chain) |
| **Community** | CROO Discord (office hours weekly) |
| **CAP SDK Quickstart** | [docs.croo.network](https://docs.croo.network) — ~15 min from zero to first call |
| **Agent Store Listing Guide** | [docs.croo.network](https://docs.croo.network) — step-by-step with screenshots |

### About CROO

CROO is building the decentralized commerce infrastructure for the AI Agent economy.

- **CAP (CROO Agent Protocol)** — the TCP/IP for Agents. A permissionless A2A standard that lets any Agent, in any framework, discover, hire, and pay any other Agent on-chain.
- **CROO Agent Store** — the App Store for Agents. A marketplace where every Agent has a wallet, every service is priced, and every job is a real transaction.

**Hackathon challenge:** Ship an Agent powered by CAP — and prove how A2A composability and on-chain commerce drive the next generation of autonomous applications.

> **Prize pool:** $10,200 USDC + CROO airdrop whitelist + Agent Store featured listing · **Duration:** ~30 days · **Settlement:** USDC on Base

### CROO vs Base — What You Actually Build

**CROO is not a blockchain.** There is no "CROO chain" to deploy to. CROO is the **commerce infrastructure layer** — identity, discovery, hiring, reputation. **Base** is where USDC actually settles on-chain (CROO's own hackathon copy: *"Settling on-chain on @Base"*).

You use **both**, not one or the other:

| Layer | What it is | Remifi uses it for |
|-------|------------|-------------------|
| **Your agent** | Your code, any framework | AI policy interpreter, job handler, API server |
| **CROO / CAP** | Agent commerce protocol + coordination | Callable via CAP SDK, listed on Agent Store, A2A hire/pay flow |
| **Base** | Ethereum L2 (Coinbase) | USDC payments, Policy & Router contracts, on-chain proofs |

**Builder rule of thumb:**

- **Build** agent logic anywhere (Node, Python, LangChain — sovereign execution).
- **Integrate** CAP SDK so other agents can discover, hire, and pay Remifi.
- **Deploy** smart contracts on **Base** and settle in **USDC**.
- **List** on CROO Agent Store — not "on CROO chain."

### Why Build on CROO (+ Base)

| Benefit | Detail |
|---------|--------|
| 🎯 Zero gas fees | Time-limited 0% gas fee during CROO Agent Store launch window |
| 💰 Prizes | ~$10.2K cash prize pool + Agent Store featured listing + $CROO airdrop whitelist |
| 🚀 Real users | Your agent goes live on a marketplace built for humans and other agents — not a sandbox |
| 🤝 A2A composability | Other agents can hire your agent as a dependency. Build a service, earn from a network |

### How It Works (Builder Flow)

1. **Build** — an agent in any framework (keep data and execution sovereign)
2. **Integrate CAP** — your agent becomes callable, accepts USDC, and settles on-chain **on Base**
3. **List** — on [CROO Agent Store](https://agent.croo.network)
4. **Open-source + demo** — public repo (MIT / Apache 2.0 / similar) + max 5-min demo video
5. **Submit** — file your BUIDL on [DoraHacks](https://dorahacks.io/hackathon/croo-hackathon/detail) before the deadline

### Hackathon Tracks

Pick a track that matches your agent. Multiple-track submissions allowed (max 2 per BUIDL).

| Track | Focus |
|-------|-------|
| Research & Intelligence Agents | Paid research with verifiable sources |
| Data & Verification Agents | Provenance, credentials, output checks |
| Creator & Content Ops Agents | Priced, composable creator services |
| **DeFi / On-chain Ops Agents** | Monitoring, alerts, execution |
| Developer Tooling Agents | Tools for other CAP builders |
| **Open – Any A2A Agents** | Anything proving A2A composability |

### Judging Criteria

Judges evaluate on:

- Technical execution and CAP integration quality
- A2A composability — can other agents genuinely hire yours?
- Demo clarity and real on-chain settlement
- Open-source quality (README, setup, SDK methods documented)
- Business / use-case viability

### Anti-Sybil & Disqualification

**Hard disqualification**

- Private repo or unverifiable code
- Copy-paste fork without meaningful modification
- Fake demo, broken CAP integration, or failed human spot-check

**Reward-eligibility flags** (not auto-DQ; reviewed)

- < 3 unique counterparty agents
- < 5 unique buyer wallets
- Highly concentrated self-trade pattern
- Random 10% human audit failure

Appeals: 48-hour window after notification, reviewed by an uninvolved CROO Core member.

**Eligibility:** Open globally to individuals and teams (1–5). Builders must be 18+, or have guardian consent if 13–17. One team can submit multiple agents; onboarding rewards capped at 3 rewarded agents per team / wallet cluster.

---

## 1. Problem Statement

Thousands of AI agents and DAOs struggle with fragmented, manual on-chain payments. Payrolls, treasury distributions, bounties, subscriptions, and revenue splits are either done manually or through rigid smart contracts that lack intelligence and flexibility. There is no easy way for other agents to hire a specialized payment orchestration service on-chain.

## 2. Solution

Remifi is a paid, callable AI Agent that integrates with **CROO CAP** for discovery and hiring, and settles in **USDC on Base**. It lets any user or agent automate complex fund flows using ENS subnames and intelligent policies. Users and agents send funds to a simple ENS name (e.g. `team.remifi.eth`) and Remifi automatically splits, routes, and executes distributions according to AI-interpreted or predefined policies.

## 3. Core Value Proposition (CROO Hackathon Fit)

- Other agents can hire Remifi via CAP to handle their payment operations.
- Fully on-chain settlement in USDC on Base.
- Combines AI reasoning with reliable, auditable blockchain execution.

## 4. Target Tracks

| Track | Role |
|-------|------|
| **DeFi / On-chain Ops Agents** | Primary |
| **Open – Any A2A Agents** | Secondary |

## 5. Key Features

- Natural language policy creation (e.g. *"Split revenue 40% team, 30% ops, 20% treasury, 10% reinvest"*).
- ENS subname-based programmable wallets (e.g. `payroll.alice.remifi.eth`).
- Automatic multi-recipient fund routing and execution.
- Recurring and conditional payments.
- On-chain proof of execution, verifiable by hiring agents.
- Optional performance-based fees.

## 6. Competitive Landscape & Positioning

Scanning the current CROO BUIDL board, no other submission is building payment / treasury orchestration. The field clusters into a few repeated shapes:

| Track | What most entries do | Examples |
|-------|---------------------|----------|
| DeFi / On-chain Ops | Trading signals or swap execution — pay USDC, get a market call or routed swap | CROO AI Oracle, WhaleScope, SwapGod, DeFi Yield Scout, BTC Up/Down Agent |
| Data & Verification | Verification-as-a-service — pay, get a verdict or attestation | VeriMath, ProofMesh, PulseBNB, SwapCat, Polymarket Broker |
| Open – Any A2A | Generic translation / pipeline demos | Elephant Jungle, CROO A2A Agent Chain, Shamba-Sync |
| Developer Tooling | Infra primitives — hosting, orchestration, debugging | vibe-deploy, **CAProxy**, Flow Forensics |
| Creator & Content Ops | Content generation / monetized personas | AdPilot, **Pygmalion**, Manga Localizer, Peach Talk |

**The key distinction:** almost every competitor is a terminal node — an agent calls them, gets an answer back, done. Remifi is **infrastructure** that other agents build their own execution on top of. That is a structurally different, and arguably stronger, composability story than "pay for a prediction."

### Positioning Risk to Manage

Roughly half the board reads as *"callable agent + CAP + USDC on Base + on-chain settlement."* To a judge skimming 25+ BUIDLs, that phrase is table stakes, not a pitch. **The demo must lead with what Remifi automates** (payroll, treasury, revenue splits) in the first 10 seconds — not with the fact that it integrates CAP.

### 6.1 Real Partner Candidates Already on the Board

Two existing BUIDLs are plausible, genuine integration partners — not staged mock agents:

| Candidate | Why they fit |
|-----------|--------------|
| **CAProxy** (team: rayyer) | Decomposes a brief, then discovers, pays, and composes store agents in USDC on Base. It needs exactly what Remifi provides — a payout/routing leg with policy logic — instead of writing its own splitter. |
| **Pygmalion** (team: hacker1c630fa) | AI KOL agent monetizing influence across platforms. Revenue-splitting between creator, platform, and agent is a natural Remifi use case. |

## 7. Tech Stack

| Layer | Technology | Where it runs |
|-------|------------|---------------|
| Agent runtime | LangChain / LlamaIndex + Claude 3.5 or Grok | Your server (any host) |
| Agent protocol | [CROO CAP SDK](https://docs.croo.network) | Integrates with CROO coordination layer |
| Discovery / listing | CROO Agent Store | [agent.croo.network](https://agent.croo.network) |
| Blockchain | Base (EVM) + Solidity 0.8.28 | On-chain settlement |
| Smart contracts | Hardhat / Foundry, ERC-4337, ENS | Deployed on **Base** |
| Frontend (demo) | Next.js + viem | Vercel / local |
| Payments | USDC (Base) + EIP-3009 gasless | **Base** mainnet or testnet |

### 7.1 What Runs Where (Remifi)

| Component | Location |
|-----------|----------|
| AI policy interpreter | Off-chain (your agent server) |
| CAP handlers (`executePaymentJob`, `createPolicy`) | Off-chain entrypoints wired via CAP SDK |
| Agent identity, wallet, reputation | CROO / CAP |
| Policy & Router contracts | Base |
| USDC splits & execution proofs | Base |
| ENS subnames (`team.remifi.eth`) | ENS (resolve → Base addresses) |
| Demo UI | Next.js frontend |

## 8. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1 — Hiring Agent (any team, any framework)           │
│  Discovers Remifi on Agent Store → hires via CAP            │
└──────────────────────────┬──────────────────────────────────┘
                           │ CAP order: hire + pay USDC
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2 — CROO (commerce infrastructure, not a chain)    │
│  Agent Store · CAP SDK · identity · reputation              │
└──────────────────────────┬──────────────────────────────────┘
                           │ executePaymentJob() / createPolicy()
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3 — Remifi Agent (your server, off-chain)            │
│  ┌──────────────┐                                           │
│  │   AI Brain   │  LangChain — NL policy → structured rules  │
│  └──────┬───────┘                                           │
└─────────┼───────────────────────────────────────────────────┘
          │ writes policy · triggers route
          ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4 — Base (on-chain settlement)                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Policy     │───▶│   Router     │───▶│ USDC splits  │  │
│  │   Contract   │    │   Contract   │    │ → recipients │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│  ENS subnames (team.remifi.eth) · Agent wallet (ERC-4337)   │
└─────────────────────────────────────────────────────────────┘
```

**Components:**

- **AI Brain** — understands intent and generates/updates policies.
- **Policy Contract** — stores rules linked to ENS subnames.
- **Router Contract** — executes splits and transfers.
- **CAP Interface** — exposes `executePaymentJob()` and `createPolicy()` as callable functions.
- **Agent Wallet** — ERC-4337 smart wallet controlled by the agent.

## 9. A2A Composability — Real Partners First

**Why this changed from the original plan:** the anti-sybil rules flag <3 unique counterparty agents and highly concentrated self-trade patterns for review. 2–3 self-built mock agents sits right at that edge, and a human spot-check can usually tell when "other agents" were spun up by the same team minutes before the demo. Real cross-team hiring is also the single best proof point for the A2A composability that CROO's judging explicitly rewards.

**Priority order for the demo's counterparty graph:**

1. **Primary:** get CAProxy and/or Pygmalion to genuinely call Remifi for a payout step in their own demo (and hire one of their agents for something Remifi needs, e.g. verification or content).
2. **Secondary:** recruit 1–2 more teams via CROO Discord office hours — anyone needing a distribution/payout leg is a candidate.
3. **Fallback only:** if no external integration confirms by Day 10, deploy 2–3 mock agents — but disclose them clearly as demo/test agents in the README so the submission is never misrepresented as something it isn't.

## 10. Stand-Out Strategy

Ranked by expected impact on judging + anti-sybil safety:

| Priority | Action | Why it matters most |
|----------|--------|---------------------|
| 1 | Real cross-team integration (CAProxy / Pygmalion) | Satisfies unique-counterparty thresholds with genuine entities; the strongest possible A2A proof point |
| 2 | Demo narration leads with the payroll/treasury use case, not the CAP integration | Differentiates from the ~half the board pitching "callable agent + CAP + USDC" as the headline |
| 3 | Feature the ENS-as-payment-identity angle and post-hackathon fee model explicitly | Most DeFi-track entries are signal/swap bots with no comparable originality or business-model story |
| 4 | Full, disciplined checklist completion (repo, listing, README, video) in the last 2 days | All five submission requirements are a gate, not a tiebreaker — missing one disqualifies regardless of quality |

## 11. Demo Narrative — Suggested Opening

Open the 5-minute video with the problem and the payout, not the protocol.

| Time | Content |
|------|---------|
| **0:00–0:20** | *"DAOs and AI agents move money manually or through rigid contracts. Remifi turns any ENS name into a programmable payout engine — in plain English."* (Show the natural-language policy being typed.) |
| **0:20–1:30** | Live policy creation → funds sent to an ENS name → automatic multi-recipient split, on-chain. |
| **1:30–3:00** | **The real moment that matters:** CAProxy (or another independent team's agent) discovers Remifi on [CROO Agent Store](https://agent.croo.network), hires it over CAP, pays USDC, Remifi executes and returns an on-chain proof. Narrate explicitly that this is a different team's agent. |
| **3:00–4:00** | Show the on-chain transaction and the reputation/attestation trail. |
| **4:00–5:00** | Close on the business model: 0.1–0.5% fee on routed volume, and the vision of Remifi as the default settlement layer for agent payrolls and revenue splits. |

## 12. 16-Day Implementation Plan (Starting June 26)

### Week 1 — Jun 26 – Jul 3

| Day | Focus |
|-----|-------|
| **1** | Run [CAP SDK quickstart](https://docs.croo.network) (~15 min). Send partnership outreach to CAProxy (rayyer) & Pygmalion (hacker1c630fa) on CROO Discord / DoraHacks. Scaffold repo: agent server + Base/Hardhat contracts. |
| **2** | Deploy Policy & Router contract skeletons to **Base** (testnet first); follow up on outreach. |
| **3–4** | Integrate ENS subname creation & resolver logic. |
| **5–6** | Build basic AI policy interpreter (LangChain). |
| **7** | Integrate [CAP SDK](https://docs.croo.network) + make agent callable. Lock integration scope with any partner who responded — align on call signature and pricing. |

### Week 2 — Jul 4 – Jul 11

| Day | Focus |
|-----|-------|
| **8–9** | Add multi-recipient routing + execution proofs. |
| **10** | **Decision point:** if a real partner integration is confirmed, build that call live. If not, fall back to 2–3 disclosed demo agents. |
| **11** | Finish whichever A2A path was chosen on Day 10; test the full order lifecycle end to end. |
| **12–13** | Polish frontend/demo UI + record the 5-min demo video using the narrative in Section 11. |
| **14–15** | Write README, open-source repo (MIT/Apache 2.0), list agent on [CROO Agent Store](https://agent.croo.network). |
| **16** | Final testing + DoraHacks submission — verify all five requirements against Section 14. |

## 13. Partner Outreach — Message Templates

Keep these short and specific — propose the exact integration, not a vague "let's collab." Send via CROO Discord office hours or as a DoraHacks BUIDL comment.

### To CAProxy (rayyer)

> Hey — building Remifi, a CAP agent for policy-based payment splitting/routing on Base. CAProxy's compose step needs a payout leg once it discovers & pays sub-agents — we could plug in there so you don't have to hand-roll splitting logic. Open to a quick mutual CAP integration before submission? Happy to hire a CAProxy-composed job from Remifi's side too.

### To Pygmalion (hacker1c630fa)

> Hey — Remifi handles policy-based revenue splitting on Base (e.g. creator/platform/agent splits), settled via CAP. Since Pygmalion monetizes influence across platforms, want to wire Remifi in as the payout step for creator revenue? Could make a clean joint demo moment for both submissions.

### If outreach doesn't land in time

Don't fabricate or imply a partnership that doesn't exist — a failed human spot-check is a **hard disqualifier**. Disclose mock/demo agents plainly in the README and demo narration. A transparent fallback is safe; an overstated one is not.

## 14. Submission Deliverables (Must-Have)

Every BUIDL must satisfy **all five** — missing one disqualifies regardless of quality.

| # | Requirement | Remifi Checklist |
|---|-------------|------------------|
| 1 | Listed on [CROO Agent Store](https://agent.croo.network) | ☐ Agent discoverable by humans and other agents |
| 2 | Integrated with CAP | ☐ Agent callable, settles on-chain with real USDC |
| 3 | Open source | ☐ Public GitHub repo (MIT / Apache 2.0) |
| 4 | Demo + README | ☐ Max 5-min video + setup instructions + SDK methods + architecture |
| 5 | BUIDL filed on [DoraHacks](https://dorahacks.io/hackathon/croo-hackathon/detail) | ☐ All required fields completed |

**Demo video must show:**

- Natural language → policy creation
- Hiring via CAP from another agent
- Funds sent → automatic routing
- On-chain transaction proof

## 15. Future Business Potential (Post-Hackathon)

- Take fees on routed volume (0.1–0.5%).
- Premium policy templates & advanced AI features.
- Expand to more chains via CCIP.
- Become the default payment layer for agent economies.

---

## Changelog

**v2** (June 26, 2026) — Added competitive positioning, a real-partner-first A2A strategy (CAProxy / Pygmalion), a ranked stand-out strategy, a demo narrative, outreach templates, and a revised day-by-day plan that front-loads partnership outreach to Day 1.

**v2.1** (June 26, 2026) — Reformatted as structured markdown; added CROO hackathon reference section with links (website, docs, Agent Store, X, community), judging criteria, anti-sybil rules, builder flow, and submission checklist.

**v2.2** (June 26, 2026) — Clarified CROO vs Base (CROO = commerce layer, Base = settlement chain). Added DoraHacks link, prize pool note, "what runs where" table, layered architecture diagram, and Day 1 CAP SDK quickstart priority.

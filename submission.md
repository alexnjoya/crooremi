# Remifi — DoraHacks BUIDL Submission

Hackathon: [CROO Agent Hackathon](https://dorahacks.io/hackathon/croo-hackathon/detail)  
Tracks: **DeFi / On-chain Ops** (primary) · **Open A2A** (secondary)

Use this doc to copy-paste into the DoraHacks BUIDL form. Replace `[TODO]` fields before submitting.

---

## Profile

### BUIDL name

```
Remifi
```

### BUIDL logo

**Requirements:** JPEG or PNG · &lt; 2 MB · **480 × 480 px** recommended

**Status:** `[TODO]` — no logo in repo yet. Options:

1. Export a square mark: **R** on Base-blue (#0052FF) background, white text
2. Use Canva / Figma template at 480×480
3. Simple wordmark: **Remifi** + small USDC/Base split icon

Save as `assets/logo.png` and upload to DoraHacks.

---

## Details

### Vision — *Describe the problem which this project solves* (max **250 characters**)

**Paste this** (209 chars):

```
Problem: AI agents and DAOs have no hireable USDC payout layer for payroll, treasury, or revenue splits. Remifi solves it as a CROO CAP provider Base names, split policies, on-chain USDC with tx proof via A2A.
```

**Structure:** `Problem:` … what's broken → `Remifi solves it` … how.

**Alternate** (215 chars):

```
Problem: Agents and DAOs cannot compose USDC payroll, treasury, or revenue splits, every team rebuilds payout logic. Remifi fixes this: a hireable CROO CAP provider with Base names, policies, and on-chain USDC proof.
```

### Category — *Is this BUIDL an AI Agent?*

**Recommended:** **Yes** — Remifi is a registered CAP provider on the CROO Agent Store; other agents hire it via A2A. It optionally uses AI (Claude/OpenAI) for natural-language policy parsing.

If you selected **No**, the judges may still accept it as agent infrastructure — but **Yes** aligns better with the hackathon brief.

**Hackathon tracks to tag mentally (if the form asks):**

- DeFi / On-chain Ops Agents
- Open – Any A2A Agents

### Key innovation domains — *Crypto/Web3 (optional)*

DoraHacks uses a **Tech Tree** + **Category** tag picker. Select the ones below (pick **4–6** if there is a limit).

**Recommended (check these):**

| Tag | Why Remifi fits |
|-----|-----------------|
| **Crypto / Web3** | Top-level — on-chain USDC commerce on Base |
| **Defi** | USDC splits, treasury, payroll, revenue distribution |
| **Base** | Settlement chain + Base Names (`*.base.eth`) |
| **Crypto-AI** | Hireable CAP agent; other AI agents compose via A2A |
| **Infra / API** | Payout *infrastructure* other agents hire — not a terminal app |
| **DAO / Community** | DAO treasury and multi-recipient payout use case |

**Optional (add if slots remain):**

| Tag | Why |
|-----|-----|
| **Account Abstraction** | CROO agent AA wallets + CAP fund transfer |
| **Creator Economy** | Revenue splits (creator / platform / agent) |

**Do not select** (poor fit): NFT, GameFi, Metaverse, ZK, Liquid Staking, Social, X-2-Earn.

**If the form is free-text instead of checkboxes**, paste:

```
Crypto / Web3, Defi, Base, Crypto-AI, Infra / API, DAO / Community
```

**One-line for judges** (optional notes field):

```
Composable agent-commerce infra: hireable USDC payout + Base payment identities via CROO CAP (DeFi ops + A2A on Base).
```

---

## Team

`[TODO]` — fill with team member names, roles, and links (GitHub, LinkedIn, etc.)

| Name | Role | Link |
|------|------|------|
| Alex Njoya | Builder | https://github.com/alexnjoya |

---

## Contact

`[TODO]` — email or Discord handle for judges / organizers

---

## Submission — Links

### GitHub / Gitlab / Bitbucket * (required)

```
https://github.com/alexnjoya/crooremi
```

### Project website (optional)

Pick one:

```
https://github.com/alexnjoya/crooremi
```

Or, once live:

```
https://agent.croo.network   → link to your Remifi Agent Store listing
```

Or Railway health endpoint:

```
https://[YOUR-RAILWAY-DOMAIN]/health
```

### Demo video * (required)

```
[TODO] https://www.youtube.com/watch?v=XXXXXXXXXXX
```

**Video checklist (≤ 5 min):**

| Time | Show |
|------|------|
| 0:00–0:20 | Problem: agents need payroll/treasury splits, not one-off answers |
| 0:20–0:45 | Agent Store listing — three services, prices |
| 0:45–1:30 | Hire `createPolicy` → policy JSON with recipients + bps |
| 1:30–2:30 | Hire `executePaymentJob` → USDC lands on Base |
| 2:30–3:30 | BaseScan tx hashes + CAP delivery proof JSON |
| 3:30–4:30 | Optional: `createEnsName` → payroll.acme.base.eth |
| 4:30–5:00 | Vision: composable payout layer for the agent economy |

**Tip:** Upload unlisted to YouTube, then paste link. Embedded player works best.

### Social links (at least one required)

```
[TODO] https://x.com/YOUR_HANDLE
```

Optional extras:

```
[TODO] https://github.com/alexnjoya
[TODO] https://warpcast.com/YOUR_FARCaster
```

---

## Pre-submit checklist

Copy this before clicking Submit:

- [ ] Logo uploaded (480×480 PNG/JPG)
- [ ] Vision pasted
- [ ] GitHub link live and public (`MIT` + `LICENSE` in repo)
- [ ] Demo video uploaded and linked
- [ ] At least one social link
- [ ] Agent listed on [Agent Store](https://agent.croo.network) with provider **Online**
- [ ] README has setup steps + link to demo video
- [ ] No secrets in repo (`.env` gitignored, no `croo_sk_` in commits)
- [ ] Real USDC settlement on Base demonstrated in video

---

## One-liners (for social / video title)

**Title:** Remifi — Programmable USDC splits for agent payroll & treasury on Base

**Tweet-length:**

```
Remifi: a hireable CAP agent for USDC splits on Base. Register payout names → define split policy → execute with on-chain proof. Built for the @CROONetwork hackathon. 🧵
```

**YouTube title:**

```
Remifi | CROO Hackathon — Composable USDC Splits for AI Agents on Base
```

**YouTube description (starter):**

```
Remifi is a CAP provider agent on CROO that other agents hire for payroll, treasury, and revenue splits.

🔗 GitHub: https://github.com/alexnjoya/crooremi
🔗 Agent Store: https://agent.croo.network
🔗 Hackathon: https://dorahacks.io/hackathon/croo-hackathon/detail

Services:
• ENS Payout Identity — named Base recipients (payroll.acme.base.eth)
• USDC Split Policy — multi-recipient rules in JSON or natural language
• USDC Split Execution — real USDC on Base + tx hash proof via CAP

Built with @croo-network CAP SDK · Settlement on @base
```

---

## What judges care about (quick reference)

| Criterion | How Remifi answers it |
|-----------|------------------------|
| CAP integration | WebSocket provider, negotiate → accept → pay → deliver |
| On-chain settlement | USDC on Base; tx hashes in delivery JSON |
| A2A composability | Three hireable Store services; other agents are the buyers |
| Demo clarity | Video shows Store → hire → BaseScan proof |
| Open source | Public repo, `.env.example`, `docs/CAP_INTEGRATION.md` |

---

## After submission

1. Add demo video link to `README.md` under Hackathon checklist
2. Post BUIDL link in [CROO Discord](https://discord.gg/y3xHr3t8nx)
3. Ask 2–3 other teams to hire Remifi (anti-sybil: ≥ 3 unique counterparty agents)

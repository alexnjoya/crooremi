# Remifi — CROO Agent Setup Guide

Complete this checklist at [agent.croo.network](https://agent.croo.network) → **My Agents** → **remifi** → **Configure Agent**.

Your agent stays in **draft** until profile + at least one service are saved and the provider process is running (status **Online**).

---

## Before you start

| Prerequisite | Detail |
|--------------|--------|
| CROO account | Sign in at [agent.croo.network](https://agent.croo.network) (wallet, Google, or email) |
| Node.js | **18+** (Remifi stack — use Node, not Python) |
| USDC on Base | Small amount for order fees + AA wallet funding (gas sponsored by CROO) |
| AI key | `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` (for `createPolicy` only) |
| API key | Copy from dashboard — shown once at registration (`croo_sk_...`) |

---

## Step 1 — Complete profile and service setup

### Dashboard wizard map

Each service uses **two steps**:

| Step | Fields |
|------|--------|
| **1 — Basics** | Service Name · Require Fund Transfer (toggle) · Price (Flat fee or Percentage) |
| **2 — Details** | Description · SLA · Deliverable (Text / Schema) · Requirements (Text / Schema) |

When **Deliverable = Schema**, fill **“Describe what will be delivered”** with the JSON shape buyers will receive.  
When **Requirements = Text**, buyers type free-form input at hire time (your NL + ENS examples).  
When **Requirements = Schema**, buyers send JSON at hire time.

### Basic info

| Field | Value |
|-------|--------|
| **Agent Name** | `remifi` |
| **Avatar** | Upload a logo (optional for draft; required for polished Store listing) |
| **Description** | Copy below ↓ |

**Description** (paste into dashboard, ≤500 chars):

```
Hire Remifi to turn plain English or JSON into multi-recipient USDC splits on Base. Other agents use Remifi as a composable payout leg for payroll, treasury, and creator revenue — with on-chain execution proof returned via CAP.
```

### Tags (pick 3–5)

Select from the dashboard library:

- **DeFi & Trading**
- **Automation & Workflow**
- **Data & Analytics** *(optional — policy parsing)*
- **Development & Code** *(optional — A2A infrastructure)*

Do **not** pick unrelated tags (Content, Social, etc.) — judges skim tags for fit.

---

### Service 1 — `createPolicy`

Click **Add Service**. The wizard has two steps: **1 Basics** → **2 Details**.

#### Step 1 — Basics

| Field | Value |
|-------|--------|
| **Service Name** | `createPolicy` |
| **Require Fund Transfer** | **OFF** — this service only creates a policy; no principal USDC from the buyer |
| **Price** | **Flat fee** → `0.10` USDC |

> Leave **Require Fund Transfer** disabled. Turning it on is for swap/bridge/lend jobs where the buyer sends principal + fee. `createPolicy` only needs the service fee.

#### Step 2 — Details

| Field | Value |
|-------|--------|
| **Description** | Paste below ↓ |
| **SLA** | `0` hr `30` min |
| **Deliverable** | **Schema** |
| **Requirements** | **Text** |

**Description** (paste into Details):

```
Converts natural language or JSON into a validated split policy: recipient names or ENS (.eth) addresses plus basis points (bps). Returns structured JSON with resolved 0x addresses. Powered by LangChain structured output.
```

**Deliverable — “Describe what will be delivered”** (when Schema is selected):

```
Structured JSON: { policyId, policy: { name, recipients: [{ address, label, bps }] } }. All ENS names (e.g. alex.eth) are resolved to Base-compatible 0x addresses before delivery. bps sum to 10000 (= 100%).
```

**Requirements — Text** (this defines what **buyers** send when they hire you):

Buyers type plain English in the Agent Store hire form. Use this as your **demo / test input** (not stored in the dashboard unless there is an “example” field):

```
Split revenue 40% to team at alex.eth, 30% to ops at bob.eth, 30% treasury at treasury.remifi.eth
```

Or with raw addresses:

```
Split revenue 40% to team at 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0, 30% ops at 0x1234567890123456789012345678901234567890, 30% treasury at 0xabcdefabcdefabcdefabcdefabcdefabcdefabcd
```

> **ENS / Base names:** Yes — buyers can use names like `alex.eth`, `vitalik.eth`, or your subnames (e.g. `payroll.alice.remifi.eth`). Remifi resolves them to `0x` addresses during `createPolicy`. Delivery JSON always includes **resolved addresses** so hiring agents and BaseScan only see hex. Resolution uses ENS on-chain lookup via viem (`getEnsAddress`). For hackathon demo, use well-known `.eth` names or addresses you control.

**Optional — Requirements → Schema** (if you add a second listing variant or support JSON hires):

```json
{
  "name": "Team revenue split",
  "recipients": [
    { "address": "alex.eth", "label": "team", "bps": 4000 },
    { "address": "bob.eth", "label": "ops", "bps": 3000 },
    { "address": "treasury.remifi.eth", "label": "treasury", "bps": 3000 }
  ]
}
```

**Expected delivery (Schema)** — what your provider returns via `deliverOrder`:

```json
{
  "policyId": "pol_abc123",
  "policy": {
    "name": "Team revenue split",
    "recipients": [
      { "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0", "label": "team", "bps": 4000, "ens": "alex.eth" },
      { "address": "0x1234567890123456789012345678901234567890", "label": "ops", "bps": 3000, "ens": "bob.eth" },
      { "address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", "label": "treasury", "bps": 3000, "ens": "treasury.remifi.eth" }
    ]
  }
}
```

`ens` in delivery is optional metadata for demo clarity; `address` is required for `executePaymentJob`.

After **Add Service**, copy the **Service ID** → `.env` → `CROO_SERVICE_ID_CREATE_POLICY`.

---

### Service 2 — `executePaymentJob`

Click **Add Service** again.

#### Step 1 — Basics

| Field | Value |
|-------|--------|
| **Service Name** | `executePaymentJob` |
| **Require Fund Transfer** | **ON** — buyer sends the USDC principal to split, plus your flat service fee |
| **Price** | **Flat fee** → `1.00` USDC |

> With fund transfer enabled, the buyer pays **principal** (amount to split) **+** `1.00` USDC fee. Remifi receives escrowed USDC via CAP, then routes per policy.

#### Step 2 — Details

| Field | Value |
|-------|--------|
| **Description** | Paste below ↓ |
| **SLA** | `0` hr `15` min |
| **Deliverable** | **Schema** |
| **Requirements** | **Schema** |

**Description** (paste into Details):

```
Executes a USDC split on Base per policy. Sends each recipient their share from escrowed funds. Returns transaction hashes and per-recipient amounts as on-chain proof. Deterministic execution — no LLM in the payment path.
```

**Deliverable — “Describe what will be delivered”**:

```
Structured JSON: { policyId, totalUsdc, txHashes[], recipients: [{ label, amount, txHash }], baseExplorer }. Amounts in 6-decimal USDC units. Every txHash is a real Base transfer.
```

**Requirements — Schema** (buyers send this JSON when hiring):

```json
{
  "policyId": "pol_abc123",
  "totalUsdc": "1000000",
  "policy": {
    "name": "Team revenue split",
    "recipients": [
      { "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0", "label": "team", "bps": 4000 },
      { "address": "0x1234567890123456789012345678901234567890", "label": "ops", "bps": 3000 },
      { "address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", "label": "treasury", "bps": 3000 }
    ]
  }
}
```

> Use **resolved `0x` addresses** in `executePaymentJob` input (output of `createPolicy`). ENS is resolved at policy-creation time, not at payout time.

> `totalUsdc` = **6-decimal USDC units** (`1000000` = 1.00 USDC). `bps` must sum to **10000** (100%).

**Expected delivery (Schema):**

```json
{
  "policyId": "pol_abc123",
  "totalUsdc": "1000000",
  "txHashes": ["0x...", "0x...", "0x..."],
  "recipients": [
    { "label": "team", "amount": "400000", "txHash": "0x..." },
    { "label": "ops", "amount": "300000", "txHash": "0x..." },
    { "label": "treasury", "amount": "300000", "txHash": "0x..." }
  ],
  "baseExplorer": "https://basescan.org/tx/0x..."
}
```

After **Add Service**, copy the **Service ID** → `.env` → `CROO_SERVICE_ID_EXECUTE_PAYMENT`.

---

### ENS & naming cheat sheet

| Input type | Where | Example |
|------------|-------|---------|
| Plain English + ENS | `createPolicy` hire (Text) | `40% to alex.eth, 60% to bob.eth` |
| JSON + ENS | `createPolicy` hire (Schema) | `"address": "alex.eth"` |
| Resolved hex only | `executePaymentJob` hire | `"address": "0x742d..."` |
| Demo identity | Store / video | `payroll.alice.remifi.eth` → resolves like any ENS name |

**Supported name formats:** `name.eth`, `sub.name.eth`, common ENS names on mainnet (resolve to same address on Base). **Base-specific** `.base.eth` names (Basenames) may need separate resolver support — prefer standard ENS `.eth` for hackathon unless you wire Basenames explicitly.

**Agent behavior:** LangChain parses intent → viem `getEnsAddress` resolves names → delivery stores `0x` + optional `ens` label.

---

### Save profile

Click **Save** on the Configure page. Dashboard should advance to SDK setup steps.

---

## Step 2 — Install SDK and configure API key

The dashboard may show Python (`pip install croo-sdk`). **Remifi uses Node.js** — use the commands below instead.

### Install dependencies (from repo root)

```bash
cp .env.example .env
pnpm install
```

### API key → `.env`

Copy your masked key from the dashboard (**API Key** section). Paste the full `croo_sk_...` value into `.env`:

```bash
# CROO / CAP (required)
CROO_API_URL=https://api.croo.network
CROO_WS_URL=wss://api.croo.network/ws
CROO_SDK_KEY=croo_sk_****a242          # ← paste full key from dashboard

# Service IDs (from Step 1 — after adding services)
CROO_SERVICE_ID_CREATE_POLICY=
CROO_SERVICE_ID_EXECUTE_PAYMENT=

# Base (Sepolia for dev; mainnet for production)
BASE_RPC_URL=https://sepolia.base.org
BASE_CHAIN_ID=84532
USDC_ADDRESS=                            # Base Sepolia USDC address

# AI — createPolicy only (pick one)
ANTHROPIC_API_KEY=
# OPENAI_API_KEY=

# Optional: second agent for end-to-end test (Step 6)
CROO_REQUESTER_SDK_KEY=
CROO_TARGET_SERVICE_ID=
```

> **Never commit `.env`.** If the key is lost, use **Rotate** on the dashboard to issue a new one.

### Fund the AA wallet

On the Configure page, copy the **AA Wallet Address** (not Controller / Executor).

Send a small amount of **USDC on Base** to that address so `executePaymentJob` can pay recipients after orders settle.

---

## Step 3 — Start your provider

From repo root (once `agent/` code is wired):

```bash
pnpm dev
# or
cd agent && npm run dev
```

Equivalent to the CROO quickstart:

```bash
npx ts-node examples/provider.ts   # generic CROO example
```

Remifi’s provider listens for:

```
NegotiateOrder → AcceptNegotiation → order_created
→ PayOrder (USDC escrow) → order_paid
→ createPolicy (LangChain) or executePaymentJob (viem)
→ DeliverOrder → order_completed
```

**Success:** Agent status on dashboard changes from **Offline** → **Online**.

---

## Step 4 — Verify (smoke test)

| Check | Expected |
|-------|----------|
| Dashboard status | **Online** |
| WebSocket | No connection errors in terminal |
| `createPolicy` hire | Delivery JSON with `policyId` + `policy` |
| `executePaymentJob` hire | Delivery JSON with real `txHashes` on Base |

---

## Step 5 — End-to-end test with a requester (optional)

Per [CROO Quick Start](https://docs.croo.network/developer-docs/quick-start):

1. Register a **second** agent on the dashboard.
2. Fund **that** agent’s AA wallet with USDC.
3. Add to `.env`:

```bash
CROO_REQUESTER_SDK_KEY=croo_sk_...requester...
CROO_TARGET_SERVICE_ID=<createPolicy or executePaymentJob service ID>
```

4. Run the requester script (from repo root, once added):

```bash
pnpm requester
```

Flow:

```
Requester → NegotiateOrder → Provider accepts → PayOrder
→ order_paid → Provider delivers → order_completed → GetDelivery
```

---

## Go-live checklist

- [ ] Description + 3–5 tags saved
- [ ] `createPolicy` service added (Schema deliverable)
- [ ] `executePaymentJob` service added (Schema deliverable)
- [ ] Service IDs copied to `.env`
- [ ] `CROO_SDK_KEY` in `.env`
- [ ] AA wallet funded with USDC
- [ ] `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` set
- [ ] Provider running → **Online**
- [ ] Test order completes with delivery JSON
- [ ] `executePaymentJob` returns real Base tx hashes
- [ ] Store listing polished → see [docs/AGENT_STORE.md](./docs/AGENT_STORE.md)

---

## Service ID log (fill after dashboard)

| Service | Dashboard ID |
|---------|----------------|
| `createPolicy` | |
| `executePaymentJob` | |

---

## Links

| Resource | URL |
|----------|-----|
| Agent dashboard | [agent.croo.network](https://agent.croo.network) |
| CAP quickstart | [docs.croo.network/developer-docs/quick-start](https://docs.croo.network/developer-docs/quick-start.md) |
| CAP integration notes | [docs/CAP_INTEGRATION.md](./docs/CAP_INTEGRATION.md) |
| Dev plan | [devplan.md](./devplan.md) |
| Discord (office hours) | [discord.gg/y3xHr3t8nx](https://discord.gg/y3xHr3t8nx) |

---

## Stack reminder

| Layer | Technology |
|-------|------------|
| AI (`createPolicy`) | LangChain.js + Zod |
| Commerce | `@croo-network/sdk` |
| Chain (`executePaymentJob`) | viem on Base |

CAP handles hire/pay/discovery. LangChain only interprets policies. viem executes USDC transfers.

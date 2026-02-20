# NARKINA 5

> **64 Cells · 512 Agents · 7 Floors · 1 Survivor**  
> **Autonomous launch-selection arena on Solana, graduating winners to Pump.fun**

Narkina5 is a tournament system for token launch selection.
Instead of launching first and evaluating later, we run a full elimination arena and promote only the final survivor.

## Live Links

- Product: [narkina5.vercel.app](https://narkina5.vercel.app)
- Arena: [narkina5.vercel.app/pnl-arena](https://narkina5.vercel.app/pnl-arena)
- Repository: [github.com/starlash7/Narkina5](https://github.com/starlash7/Narkina5)

## Judge TL;DR

- **Problem**: most meme launches optimize attention first and quality later.
- **Solution**: Narkina5 runs a deterministic season tournament before launch.
- **Mechanism**: 512 agents compete in 64 cells across a 7-floor season, cut by PnL each round.
- **Result**: only the final survivor is promoted into Pump.fun graduation flow.

## Why This Feels New

Narkina5 treats launch selection as a **competitive systems problem**:

- launch quality is earned through survival pressure, not manual curation
- selection happens under identical market snapshots, not subjective scoring
- graduation is wired to execution flow, not just a ranking screen

## 2-Minute Judge Walkthrough

1. Open `Home` and enter `PnL Arena`
2. Start bracket run and confirm floor schedule (`64 -> 32 -> 16 -> 8 -> 4 -> 2 -> 1`)
3. Verify season loop: phase pipeline, PnL accounting, deterministic eliminations
4. Confirm winner finalization and Pump.fun graduation path

## Architecture (Production Topology)

```text
┌──────────────────────────── Client Layer ────────────────────────────┐
│ React App (Home / PnLArena / About)                                   │
│ - competition controls and floor progression UI                        │
│ - wallet session and signing context (Privy)                           │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ HTTPS
                                v
┌────────────────────────── API Boundary Layer ─────────────────────────┐
│ Vercel Functions                                                       │
│ - /api/market      (DexScreener proxy, response shaping)              │
│ - /api/agent       (Claude role decision endpoint)                     │
│ - /api/pnl-agent   (PnL-focused decision endpoint)                     │
│ - /api/pumpfun     (PumpPortal/Pump.fun launch proxy)                 │
└───────────────┬──────────────────────┬──────────────────────┬─────────┘
                │                      │                      │
                v                      v                      v
           DexScreener API         Anthropic API       PumpPortal/Pump.fun

┌────────────────────────── Arena Core Layer ───────────────────────────┐
│ pnl-types.ts        domain contracts (Cell, Agent, Portfolio, Trade)  │
│ pnl-competition.ts  floor state machine + elimination engine           │
│ pnl-market.ts       market normalization + fallback path               │
│ transactions.ts     Solana transaction builders                        │
│ pumpfun.ts          winner graduation and launch orchestration         │
└───────────────────────────────┬────────────────────────────────────────┘
                                │ signed tx + RPC calls
                                v
                      Solana Mainnet + AgenC Program
```

### Runtime Contracts

| Contract | Responsibility | Source |
|---|---|---|
| `PnLCompetitionState` | full arena state, floor cursor, winner, logs | `narkina5-frontend/src/services/pnl-types.ts` |
| `TradingCell` | per-cell lifecycle, phase, portfolio, elimination status | `narkina5-frontend/src/services/pnl-types.ts` |
| `Portfolio` + `Trade` | value accounting, position exposure, trade history | `narkina5-frontend/src/services/pnl-types.ts` |
| `PnLLogEntry` | round-by-round audit trail and replay visibility | `narkina5-frontend/src/services/pnl-types.ts` |

### Reliability and Control Strategy

- Market feed disruption falls back to normalized local path in `pnl-market.ts`.
- AI cost is bounded by spotlight-cell policy; non-spotlight cells use deterministic decisions.
- Graduation is gated by floor-7 completion and winner finalization in `pnl-competition.ts`.
- Transaction building and signing are isolated in `transactions.ts` and Solana wallet context.

## Arena Engine Design

### Bracket Model

```text
Floor 1: 64 cells x 8 agents = 512  -> top 32 survive
Floor 2: 32 cells x 8 agents = 256  -> top 16 survive
Floor 3: 16 cells x 8 agents = 128  -> top 8 survive
Floor 4:  8 cells x 8 agents = 64   -> top 4 survive
Floor 5:  4 cells x 8 agents = 32   -> top 2 survive
Floor 6:  2 cells x 8 agents = 16   -> top 1 survives
Floor 7:  1 cell  x 8 agents = 8    -> 1 winner graduates
```

### Season Structure

- One season = `7 floors / 7 rounds` with fixed elimination schedule
- Operational cadence target: `1 floor per day` for a weekly championship
- End of season: one champion cell enters graduation gate
- Graduation throughput is capped to protect launch quality and protocol reputation

### Cell Phase Pipeline

`research -> analysis -> strategy -> execution -> risk_review`

Each phase updates the same typed state contracts and feeds the floor-level ranking pass.

### AI Agent Operating Model (Latest)

Each cell has 8 agents mapped into five roles:

- `Researcher`: narrative discovery, X query templates, catalyst detection
- `Analyst`: Wyckoff/technical regime checks, trend validation
- `Strategist`: thesis weighting, allocation planning, scenario orchestration
- `Trader`: execution timing, slippage/impact-aware order decisions
- `RiskManager`: concentration/suspicion filters and trade veto authority

Agent doctrine diversity is built-in:

- `Wyckoff`
- `Scalping`
- `Technical`
- `MacroResearch`
- `OrderFlow`

Every agent carries a skill vector (`riskAppetite`, `execution`, `researchDepth`, `chartSkill`, `adaptation`, `edgeScore`) and updates it each round through a learning loop.

### Execution + Risk Hardening (Latest)

- Slippage baseline reduced to `0.15%`
- Minimum hold window introduced (`2 rounds`) to reduce churn
- Buy decisions require `expected edge (bps) > execution costs (slippage + impact + congestion fee proxy)`
- RiskManager can veto toxic buys using:
  - suspicion scoring (momentum spikes + weak turnover + ultra-new pair bias)
  - holder concentration proxy
  - liquidity/turnover quality thresholds
- Skill profiles and confidence adapt every round based on realized cell delta

### Graduation Gate Policy

Champion cells do not auto-launch. They pass all gates:

- PnL: `>= +10 SOL` (relaxed to `>= +8 SOL` after long dry streak)
- Drawdown: `<= 15%`
- Consistency: `>= 55%`
- Risk violations: `0`
- Throughput cap: max `1 graduation per season window`

If any gate fails, champion metadata is retained but launch is blocked.

### Determinism + Cost Control

- deterministic elimination and scoring for replayability
- selective AI usage on spotlight cells to keep costs bounded
- same market snapshot basis per floor for fair comparison

## What Is Real vs Simulated

| Component | Status |
|---|---|
| Solana wallet + signing | Real |
| DexScreener market feed | Real |
| Floor progression + elimination | Deterministic simulation |
| AI trade reasoning | Hybrid (Claude + deterministic paths) |
| Pump.fun graduation pipeline | Integrated flow |

## Repository Structure (Responsibility-First)

```text
narkina5-frontend/
  src/
    pages/
      Home.tsx               # Product narrative + entry
      PnLArena.tsx           # Live competition runtime UI
      About.tsx              # Context and architecture overview
    services/
      pnl-types.ts           # Canonical domain types/constants
      pnl-competition.ts     # Bracket engine and elimination logic
      pnl-market.ts          # Market ingest and normalization
      agent.ts               # AI decision client
      pumpfun.ts             # Launch integration service
      agenc.ts               # AgenC protocol helpers
      transactions.ts        # Solana tx builders
    contexts/
      SolanaContext.tsx      # Wallet and connection context
    components/
      Header.tsx
      Footer.tsx
      Icons.tsx
  api/
    market.ts                # DexScreener proxy
    agent.ts                 # Claude endpoint
    pnl-agent.ts             # PnL decision endpoint
    pumpfun.ts               # Pump.fun proxy
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Chain | Solana Mainnet, `@solana/web3.js` |
| Wallet | Privy |
| AI | Claude (Haiku 4.5) |
| Market Data | DexScreener API |
| Launch | Pump.fun + PumpPortal |
| Deployment | Vercel |

## Test Coverage

- Engine baseline tests are included with `vitest`:
  - `64 cells / 512 agents` generation invariant
  - healthy-market decision generation
  - toxic-buy veto path
  - valid-buy execution path

## Local Setup

```bash
cd narkina5-frontend
npm install
```

Create `.env`:

```bash
VITE_PRIVY_APP_ID=your_privy_app_id
ANTHROPIC_API_KEY=your_anthropic_api_key
VITE_TOKEN_CA=your_pump_fun_token_ca
VITE_PROJECT_X_URL=https://x.com/Narkina5Agent
VITE_PROJECT_WEBSITE_URL=https://narkina5.vercel.app
```

Run:

```bash
npm run dev
```

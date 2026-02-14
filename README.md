# NARKINA 5

> **64 Cells · 512 Agents · 7 Floors · 1 Survivor**  
> **PnL Elimination Arena on Solana that graduates winners to Pump.fun**

Narkina5 is a tournament system for token launch selection.
Instead of launching first and evaluating later, we run a full elimination arena and promote only the final survivor.

## Live Links

- Product: [narkina5.vercel.app](https://narkina5.vercel.app)
- Arena: [narkina5.vercel.app/pnl-arena](https://narkina5.vercel.app/pnl-arena)
- Repository: [github.com/starlash7/Narkina5](https://github.com/starlash7/Narkina5)

## Judge TL;DR

- **Problem**: launch candidates are usually selected by narrative velocity, not trading resilience.
- **Approach**: run a large deterministic bracket (512 agents, 64 cells, 7 floors).
- **Decision Rule**: eliminate by floor-level PnL performance until one cell remains.
- **Outcome**: winner is graduated into Pump.fun launch flow.

## Why This Feels New

Narkina5 treats launch selection as a **competitive systems problem**:

- launch quality is earned through survival, not picked manually
- multi-agent diversity is preserved until elimination pressure removes weak cells
- graduation is tied to an on-chain launch pipeline, not a static leaderboard

## 2-Minute Judge Walkthrough

1. Open `Home` and enter `PnL Arena`
2. Initialize the bracket (`64 -> 32 -> 16 -> 8 -> 4 -> 2 -> 1`)
3. Observe each floor: phase execution, PnL update, elimination
4. Confirm final winner and graduation flow to Pump.fun

## Architecture

```text
User + Wallet (Privy)
        |
        v
React App (Home / PnLArena / About)
        |
        v
Arena Engine (state machine, floors, eliminations)
   |                 |                    |
   v                 v                    v
Market Service     AI Service         Launch Service
(DexScreener)      (Claude)           (Pump.fun / PumpPortal)
        \            |                /
         \           |               /
          -------- Solana Mainnet --------
```

### Subsystems

- **Orchestration Layer**
  - floor progression
  - elimination scheduling
  - winner finalization
- **Decision Layer**
  - role-based cell decisions
  - spotlight AI calls with deterministic fallback
- **Execution Layer**
  - portfolio updates
  - transaction builders
  - graduation launch integration

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

### Cell Phase Pipeline

`research -> analysis -> strategy -> execution -> risk_review`

Each phase updates the same typed state contracts and feeds the floor-level ranking pass.

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

## Local Setup

```bash
cd narkina5-frontend
npm install
```

Create `.env`:

```bash
VITE_PRIVY_APP_ID=your_privy_app_id
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

Run:

```bash
npm run dev
```

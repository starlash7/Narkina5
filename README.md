# NARKINA 5

> **64 Cells · 512 Agents · 7 Floors · 1 Survivor**  
> **PnL Elimination Arena on Solana, graduating winners to Pump.fun**

Narkina5 is an AI agent competition arena inspired by *Andor*.  
Agents are seeded into trading cells, compete on real market data, and are eliminated floor by floor until one winner remains.

## Live

- App: [narkina5.vercel.app](https://narkina5.vercel.app)
- Arena: `https://narkina5.vercel.app/pnl-arena`
- Repo: [github.com/starlash7/Narkina5](https://github.com/starlash7/Narkina5)

## Why This Is Fresh

Most launch flows pick a token candidate first and ask quality questions later.
Narkina5 flips that model:

- 512 agents compete first, launch later
- launch eligibility is earned through multi-floor PnL survival
- one winner is promoted from bracket performance, not hype alone

This makes Narkina5 a **pre-launch quality filter** for Pump.fun.

## Arena Concept

### `CREATE`
Initialize **64 trading cells** with **8 agents per cell** (total **512 agents**).

### `COMPETE`
Each cell trades with role-based decisions using live Solana token market data.

### `ELIMINATE`
At the end of each floor, lower-performing cells are removed from the bracket.

### `GRADUATE`
The final winning cell graduates and executes a Pump.fun launch flow.

## Elimination Bracket

```text
Floor 1: 64 cells x 8 agents = 512  -> top 32 cells survive
Floor 2: 32 cells x 8 agents = 256  -> top 16 cells survive
Floor 3: 16 cells x 8 agents = 128  -> top 8 cells survive
Floor 4:  8 cells x 8 agents = 64   -> top 4 cells survive
Floor 5:  4 cells x 8 agents = 32   -> top 2 cells survive
Floor 6:  2 cells x 8 agents = 16   -> top 1 cell survives
Floor 7:  1 cell  x 8 agents = 8    -> 1 survivor graduates
```

## System Architecture (Judge View)

```text
User + Wallet (Privy)
        |
        v
React UI (Home / PnLArena / About)
        |
        v
Arena Engine (state machine, floors, eliminations)
        |                     |                       |
        |                     |                       |
        v                     v                       v
Market Service         AI Decision Service      Launch Service
(DexScreener)          (Claude via API)         (Pump.fun/PumpPortal)
        \                     |                       /
         \                    |                      /
          ---------------- Solana Mainnet ----------------
```

## Execution Pipeline

For each floor:

1. Seed or carry over eligible cells
2. Pull market snapshot from DexScreener
3. Run cell phases (`research -> analysis -> strategy -> execution -> risk_review`)
4. Calculate portfolio PnL and update rankings
5. Eliminate lower cells based on bracket rule
6. Advance survivors to next floor

After floor 7, the final cell triggers graduation and launch flow.

## Core Design Choices

- **Deterministic tournament**: same bracket logic for reproducibility
- **Hybrid AI budget model**: spotlight cells call Claude, others use deterministic simulation
- **Real data grounding**: market input from live Solana token feed
- **On-chain finality**: graduation is connected to launch transaction flow

## What Makes It Strong for Pump.fun

- **Quality filter before launch**: launch candidate is selected through multi-floor PnL competition.
- **Scale-first simulation**: large deterministic bracket (512 agents) in a single run.
- **Cost-aware AI architecture**: spotlight cells use Claude, others run deterministic simulation.
- **Real market grounding**: DexScreener feed with local fallback behavior.

## Tech Stack

| Layer | Stack |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Chain | Solana Mainnet + `@solana/web3.js` |
| Wallet/Auth | Privy |
| AI | Claude (Haiku 4.5) |
| Market Data | DexScreener API |
| Launch | Pump.fun + PumpPortal |
| Deploy | Vercel |

## Project Structure (Responsibility-First)

```text
narkina5-frontend/
  src/
    pages/
      Home.tsx               # Landing narrative and arena entry
      PnLArena.tsx           # Main competition UI and floor progression
      About.tsx              # Product/stack explanation
    services/
      pnl-types.ts           # Canonical types + constants (64/512/7 bracket)
      pnl-competition.ts     # Arena state machine and elimination logic
      pnl-market.ts          # DexScreener fetch + fallback + normalization
      agent.ts               # AI role decision client
      pumpfun.ts             # Pump.fun launch integration logic
      agenc.ts               # AgenC protocol integration utilities
      transactions.ts        # Solana transaction builders
    contexts/
      SolanaContext.tsx      # Wallet connection and chain context
    components/
      Header.tsx             # Global navigation
      Footer.tsx             # Global footer and GitHub link
      Icons.tsx              # Shared icon components
  api/
    market.ts                # Server-side market proxy
    agent.ts                 # Server-side AI endpoint
    pnl-agent.ts             # PnL-focused AI decision endpoint
    pumpfun.ts               # Pump.fun proxy endpoint
```

## Data Model Highlights

- `PnLCompetitionState`: total competition state (floors, cells, logs, winner)
- `TradingCell`: per-cell portfolio, phase, elimination status
- `PnLAgent`: role-specialized agent metadata and cell membership
- `Portfolio` / `Position` / `Trade`: value, exposure, and transaction records

Together these models keep the simulation transparent and replayable.

## Local Development

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

Open `http://localhost:5173`.

## License

MIT

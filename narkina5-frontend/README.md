# NARKINA 5 Frontend

> **PnL Elimination Arena UI**  
> 64 Cells · 512 Agents · 7 Floors · 1 Survivor

This package contains the web app for Narkina5.
It presents the full arena flow from cell seeding to Pump.fun graduation.

## Pages

- `Home`: arena overview, concept, and entry points
- `PnLArena`: live competition view, floor progression, eliminations, winner graduation
- `About`: architecture, stack, and project context

## Core UI Flows

1. Enter the arena and initialize the 64-cell bracket
2. Track floor-by-floor eliminations and PnL progression
3. Finalize the winner and execute Pump.fun graduation flow

## Architecture

```text
src/
  pages/
    Home.tsx               # Brand, concept, CTA to arena
    PnLArena.tsx           # Competition runtime UI (floors, cells, winner)
    About.tsx              # Product and architecture narrative
  services/
    pnl-types.ts           # Shared domain types/constants
    pnl-competition.ts     # State machine: round progression + elimination
    pnl-market.ts          # Market ingestion + normalization + fallback
    agent.ts               # AI decision client per role
    pumpfun.ts             # Launch integration service
    agenc.ts               # On-chain protocol helpers
    transactions.ts        # Solana tx construction helpers
  contexts/
    SolanaContext.tsx      # Wallet/connection provider
  components/
    Header.tsx
    Footer.tsx
    Icons.tsx
api/
  agent.ts                 # Claude endpoint
  pnl-agent.ts             # PnL strategy endpoint
  market.ts                # DexScreener proxy
  pumpfun.ts               # Pump.fun proxy
```

## Runtime Flow

1. UI initializes competition state (`PnLCompetitionState`)
2. Engine seeds 64 cells and maps 512 agents
3. Market service provides token snapshot for the floor
4. Each cell runs phase pipeline:
   - research
   - analysis
   - strategy
   - execution
   - risk review
5. PnL is recalculated and elimination is applied
6. Surviving cells advance to the next floor
7. Final winner triggers launch flow to Pump.fun

## State and Domain Contracts

- `TradingCell`: cell identity, agents, phase, portfolio, elimination state
- `PnLAgent`: role identity and contribution metadata
- `Portfolio`: cash, positions, realized/unrealized PnL, drawdown
- `Trade`: side, size, price, slippage, role reasoning

These contracts keep UI rendering, simulation logic, and API interaction aligned.

## Stack

- React 19
- TypeScript
- Vite
- Solana Web3.js
- Privy
- Claude
- DexScreener

## Environment

Create `.env` in `narkina5-frontend/`:

```bash
VITE_PRIVY_APP_ID=your_privy_app_id
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Local Run

```bash
npm install
npm run dev
```

Default URL: `http://localhost:5173`

## Notes

- Arena simulation is deterministic by design for reproducible elimination results
- Market data uses DexScreener with fallback behavior for resilience
- Winner graduation is wired for Pump.fun launch flow

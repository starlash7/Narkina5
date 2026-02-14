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
    Home.tsx
    PnLArena.tsx
    About.tsx
  services/
    pnl-competition.ts
    pnl-market.ts
    pnl-types.ts
    agent.ts
    pumpfun.ts
    agenc.ts
    transactions.ts
  contexts/
    SolanaContext.tsx
  components/
    Header.tsx
    Footer.tsx
    Icons.tsx
api/
  agent.ts
  pnl-agent.ts
  market.ts
  pumpfun.ts
```

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

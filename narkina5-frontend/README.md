# NARKINA 5

> **512 AI Agents. 64 Trading Cells. 7 Floors. 1 Survivor.**
> PnL-driven AI elimination arena on Solana.

Narkina5 is a build-in-public competition platform inspired by *Andor*. Agents trade with real pump.fun market data, cells are eliminated floor-by-floor, and the final survivor launches on Pump.fun.

## Demo

**Live**: [narkina5.vercel.app](https://narkina5.vercel.app) (Solana Mainnet)

## What It Does

1. Deterministically generates **512 AI agents** (8 agents per cell, 64 cells total).
2. Runs a **7-floor elimination bracket** using real token prices and role-based trading.
3. Graduates the champion to a **real Pump.fun token launch** via wallet signing.

## Arena Structure

```
Floor 1: 64 cells x 8 agents = 512  -> top 32 cells survive
Floor 2: 32 cells x 8 agents = 256  -> top 16 cells survive
Floor 3: 16 cells x 8 agents = 128  -> top 8 cells survive
Floor 4:  8 cells x 8 agents = 64   -> top 4 cells survive
Floor 5:  4 cells x 8 agents = 32   -> top 2 cells survive
Floor 6:  2 cells x 8 agents = 16   -> top 1 cell survives
Floor 7:  1 cell  x 8 agents = 8    -> 1 survivor graduates
```

- Real market feed: DexScreener Solana tokens
- Cell portfolio rules: 100 SOL start, 20% max position size, 1% slippage
- AI usage: spotlight cells use Claude; non-spotlight cells use deterministic simulation
- Output: on-chain graduation flow to Pump.fun

## Architecture

```
narkina5-frontend/
  src/
    pages/
      Home.tsx
      Dashboard.tsx         # Create/train custom agents
      PnLArena.tsx          # 512-agent unified elimination arena
      Marketplace.tsx
      About.tsx
    services/
      pnl-competition.ts    # Arena engine (cells, floors, eliminations)
      pnl-market.ts         # DexScreener market client + caching
      pnl-types.ts          # PnL/floor/cell type system
      agent.ts              # Claude training/trading client
      pumpfun.ts            # Pump.fun launch pipeline
      agenc.ts              # AgenC on-chain protocol integration
      transactions.ts       # Solana transaction builders (Borsh)
    contexts/
      SolanaContext.tsx
    components/
      Header.tsx
      Footer.tsx
      Icons.tsx
  api/
    agent.ts                # Claude serverless endpoint
    pnl-agent.ts            # Claude trading endpoint
    market.ts               # DexScreener proxy
    pumpfun.ts              # Pump.fun CORS proxy
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Blockchain | Solana (Mainnet), @solana/web3.js |
| Wallet | Privy |
| AI | Claude Haiku 4.5 |
| Token Launch | Pump.fun + PumpPortal API |
| Market Data | DexScreener API |
| Deployment | Vercel |

## Getting Started

```bash
cd narkina5-frontend
npm install
```

Create `.env`:

```
VITE_PRIVY_APP_ID=your_privy_app_id
VITE_ANTHROPIC_API_KEY=your_anthropic_key
```

```bash
npm run dev
```

Open `http://localhost:5173`.

## Key Features

- **Large-scale simulation**: 512 agents and 64 cells in one run
- **Floor-based elimination**: deterministic bracket from 64 cells to 1
- **Real prices**: live Solana token pricing from DexScreener
- **Hybrid AI cost control**: spotlight-only Claude calls
- **Pump.fun graduation**: champion launch with wallet signing
- **Type-safe engine**: business logic in TypeScript service layer

## Smart Contract

AgenC Protocol (`EopUaCV2svxj9j4hd7KjbrWfdjkspmm2BCBe7jGpKzKZ`):
- PDA-derived task and agent accounts
- Escrow model for rewards
- Capability bitmask (Compute, Storage, Inference, Network)
- Task lifecycle: Open -> InProgress -> PendingValidation -> Completed

## License

MIT

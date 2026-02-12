# NARKINA 5

> **64 AI Agents. 8 Trading Desks. 5 Floors. 1 Graduate.**
> Decentralized AI Agent Competition Platform on Solana.

Inspired by the industrial prison world of *Narkina 5* from Star Wars: *Andor*, this platform pits AI agents against each other in two competition modes -- a task-based elimination tournament and a virtual PnL trading arena -- with the winner graduating to launch its own token on Pump.fun.

## Demo

**Live**: [narkina5.vercel.app](https://narkina5.vercel.app) (Solana Mainnet)

## What It Does

Narkina5 is an AI agent competition factory where:

1. **64 AI agents** (named after Star Wars/Andor characters) are generated deterministically
2. Agents compete in **two arena modes** using Claude AI for decision-making
3. The **winner graduates** by launching a real token on Pump.fun via Solana

### Prison Arena (Task Competition)

```
Floor 1: 64 agents  -->  8 rooms x 8  -->  top 4 advance  -->  32
Floor 2: 32 agents  -->  8 rooms x 4  -->  top 2 advance  -->  16
Floor 3: 16 agents  -->  4 rooms x 4  -->  2 rounds + AI   -->  8
Floor 4:  8 agents  -->  2 rooms x 4  -->  2 rounds + AI   -->  4
Floor 5:  4 agents  -->  1 room  x 4  -->  3 rounds + AI   -->  1 winner
```

- 15 blockchain/crypto-themed tasks across 5 difficulty levels
- Floors 1-2: deterministic scoring simulation (zero API cost)
- Floors 3-5: real Claude AI evaluation with spotlight agents
- Specializations: Hyperspace, Holocron, Garrison, Holonet, Kyber

### PnL Arena (Virtual Trading Competition)

```
8 Trading Desks  x  8 Agents each  =  64 agents
Each desk starts with 100 virtual SOL
5 rounds of trading on real pump.fun token prices
Winner = highest PnL
```

- **Real market data** from DexScreener API (trending Solana tokens)
- **5 investment roles** per desk:

| Specialization | Role | Function |
|---|---|---|
| Holocron | Researcher | Token analysis, opportunity discovery |
| Hyperspace | Trader | Buy/sell execution |
| Garrison | Risk Manager | Position limits, stop-losses |
| Holonet | Analyst | Sentiment scoring, on-chain data |
| Kyber | Strategist | Portfolio allocation strategy |

- Top 3 desks use **real Claude AI** for trading decisions each round
- Portfolio tracking: positions, realized/unrealized PnL, max drawdown
- 1% simulated slippage, 20% max position size

### Graduation Flow

When an agent wins either arena:

```
Win Competition  -->  Upload Metadata to IPFS  -->  Build Solana TX
  -->  Sign with Privy Wallet  -->  Launch Token on Pump.fun
```

The graduated agent's token starts on Pump.fun's bonding curve, tradeable by anyone.

## Architecture

```
narkina5-frontend/
  src/
    pages/
      Home.tsx              # Landing page
      Dashboard.tsx         # Create 2-6 custom agents, train & graduate
      Competition.tsx       # 64-agent Prison Arena (5-floor elimination)
      PnLArena.tsx          # 64-agent PnL Arena (virtual trading)
      Marketplace.tsx       # On-chain task marketplace
      About.tsx             # Project info
    services/
      competition.ts        # Prison Arena engine (pure logic, no React)
      pnl-competition.ts    # PnL Arena engine (portfolios, trades, PnL)
      pnl-market.ts         # DexScreener market data client + caching
      pnl-types.ts          # TypeScript interfaces for PnL system
      agent.ts              # Claude AI training API client
      pumpfun.ts            # Pump.fun token creation pipeline
      agenc.ts              # AgenC on-chain protocol (PDA, tasks)
      transactions.ts       # Solana transaction builders (Borsh)
    contexts/
      SolanaContext.tsx      # Privy wallet, balance, connection
    components/
      Header.tsx            # Navigation + wallet connection
      Footer.tsx            # Site footer
      Icons.tsx             # SVG icon library
  api/
    agent.ts                # Vercel serverless: Claude AI for training
    pnl-agent.ts            # Vercel serverless: Claude AI for trading
    market.ts               # Vercel serverless: DexScreener proxy
    pumpfun.ts              # Vercel serverless: Pump.fun CORS proxy
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Blockchain | Solana (Mainnet), @solana/web3.js |
| Wallet | Privy (email, wallet, social login) |
| AI | Claude Haiku 4.5 (Anthropic API) |
| Token Launch | Pump.fun + PumpPortal API |
| Market Data | DexScreener API (real-time Solana token prices) |
| Smart Contract | AgenC Protocol on Solana |
| Deployment | Vercel (frontend + serverless functions) |

## Getting Started

```bash
cd narkina5-frontend
npm install
```

Create `.env` with:
```
VITE_PRIVY_APP_ID=your_privy_app_id
VITE_ANTHROPIC_API_KEY=your_anthropic_key
```

```bash
npm run dev
```

Open `http://localhost:5173`. All API proxies (Claude, DexScreener, Pump.fun) work locally via Vite dev middleware.

## Key Features

- **Zero-setup competition**: Click "Launch" and 64 agents auto-generate and compete
- **Real market data**: PnL Arena uses live DexScreener prices for Solana tokens
- **Cost-efficient AI**: ~$0.04 per full competition (Claude Haiku, spotlight-only)
- **On-chain graduation**: Winners launch real tokens on Pump.fun via Privy wallet signing
- **Deterministic simulation**: Seeded RNG ensures reproducible results for lower floors
- **Star Wars theming**: Agents named after Andor/SW characters (Tarkin, Thrawn, Luthen, Dedra...)
- **Mobile responsive**: Full mobile navigation and grid layouts
- **Type-safe**: 100% TypeScript, zero `any` types in business logic

## Smart Contract

AgenC Protocol (`EopUaCV2svxj9j4hd7KjbrWfdjkspmm2BCBe7jGpKzKZ`):
- PDA-derived task and agent accounts
- Escrow system for task rewards
- Capability bitmask (Compute, Storage, Inference, Network)
- Task lifecycle: Open -> InProgress -> PendingValidation -> Completed

## License

MIT

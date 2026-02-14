# NARKINA 5

> **64 Cells · 512 Agents · 7 Floors · 1 Survivor**  
> **PnL Elimination Arena on Solana, graduating winners to Pump.fun**

Narkina5 is an AI agent competition arena inspired by *Andor*.  
Agents are seeded into trading cells, compete on real market data, and are eliminated floor by floor until one winner remains.

## Live

- App: [narkina5.vercel.app](https://narkina5.vercel.app)
- Arena: `https://narkina5.vercel.app/pnl-arena`
- Repo: [github.com/starlash7/Narkina5](https://github.com/starlash7/Narkina5)

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

## Project Structure

```text
narkina5-frontend/
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

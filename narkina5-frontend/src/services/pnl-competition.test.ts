import { describe, expect, it } from 'vitest';
import { applyTrades, generatePnLAgents, simulateCellTrades } from './pnl-competition';
import type { PumpToken, TradeDecision } from './pnl-types';

function makeToken(overrides: Partial<PumpToken> = {}): PumpToken {
  return {
    mint: 'mint-default',
    name: 'Default',
    symbol: 'DFT',
    priceSOL: 1,
    priceUSD: 120,
    marketCapSOL: 50000,
    volume24h: 20000,
    priceChange24h: 12,
    holders: 1200,
    createdAt: Date.now() - 48 * 60 * 60 * 1000,
    bondingCurveProgress: 50,
    ...overrides,
  };
}

describe('pnl competition engine', () => {
  it('generates 64 cells and 512 agents with 8 agents per cell', () => {
    const { agents, cells } = generatePnLAgents();

    expect(cells).toHaveLength(64);
    expect(Object.keys(agents)).toHaveLength(512);
    expect(new Set(cells.flatMap((cell) => cell.agents)).size).toBe(512);
    for (const cell of cells) {
      expect(cell.agents).toHaveLength(8);
    }
  });

  it('produces trade decisions for healthy market tokens', () => {
    const { agents, cells } = generatePnLAgents();
    const tokens: PumpToken[] = [
      makeToken({ mint: 'mint-a', symbol: 'AAA', name: 'Alpha', priceChange24h: 18 }),
      makeToken({ mint: 'mint-b', symbol: 'BBB', name: 'Beta', priceChange24h: 10 }),
      makeToken({ mint: 'mint-c', symbol: 'CCC', name: 'Gamma', priceChange24h: 7 }),
    ];

    const decisions = simulateCellTrades(cells[0], agents, tokens, 1);

    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions.every((d) => d.amountSOL > 0)).toBe(true);
    expect(decisions.some((d) => d.side === 'buy')).toBe(true);
  });

  it('vetoes toxic buy decisions via risk manager filter', () => {
    const { agents, cells } = generatePnLAgents();
    const toxic = makeToken({
      mint: 'mint-toxic',
      symbol: 'TOX',
      name: 'Toxic',
      marketCapSOL: 1_000_000,
      volume24h: 5,
      priceChange24h: 180,
      holders: 0,
      createdAt: Date.now() - 30 * 60 * 1000,
    });

    const decisions: TradeDecision[] = [
      { side: 'buy', mint: toxic.mint, symbol: toxic.symbol, amountSOL: 5, reasoning: 'test toxic buy' },
    ];

    const result = applyTrades(cells[0], decisions, [toxic], agents, 1);

    expect(result.trades).toHaveLength(0);
    expect(result.logs.some((log) => log.type === 'risk_alert')).toBe(true);
    expect(result.cell.portfolio.cashSOL).toBe(100);
  });

  it('executes buy decisions when quality and costs are acceptable', () => {
    const { agents, cells } = generatePnLAgents();
    const clean = makeToken({
      mint: 'mint-clean',
      symbol: 'CLN',
      name: 'Clean',
      marketCapSOL: 80_000,
      volume24h: 50_000,
      priceChange24h: 15,
      holders: 1800,
      createdAt: Date.now() - 72 * 60 * 60 * 1000,
    });

    const decisions: TradeDecision[] = [
      { side: 'buy', mint: clean.mint, symbol: clean.symbol, amountSOL: 5, reasoning: 'test valid buy' },
    ];

    const result = applyTrades(cells[0], decisions, [clean], agents, 1);

    expect(result.trades).toHaveLength(1);
    expect(result.cell.portfolio.positions.length).toBe(1);
    expect(result.cell.portfolio.cashSOL).toBeLessThan(100);
  });
});

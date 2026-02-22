import { describe, expect, it } from 'vitest';
import { isMarketFeedReliable } from './pnl-market';
import type { MarketFeedHealth } from './pnl-market';

function makeHealth(status: MarketFeedHealth['status'], consecutiveErrors = 0): MarketFeedHealth {
  return {
    status,
    consecutiveErrors,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
  };
}

describe('market feed reliability mode', () => {
  it('balanced mode blocks only FAILING feed', () => {
    expect(isMarketFeedReliable('balanced', makeHealth('WORKING'))).toBe(true);
    expect(isMarketFeedReliable('balanced', makeHealth('FLAKY', 2))).toBe(true);
    expect(isMarketFeedReliable('balanced', makeHealth('FAILING', 3))).toBe(false);
  });

  it('strict mode allows only WORKING feed', () => {
    expect(isMarketFeedReliable('strict', makeHealth('WORKING'))).toBe(true);
    expect(isMarketFeedReliable('strict', makeHealth('FLAKY', 1))).toBe(false);
    expect(isMarketFeedReliable('strict', makeHealth('FAILING', 4))).toBe(false);
  });
});

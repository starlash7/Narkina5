import { describe, expect, it } from 'vitest';
import { evaluateGraduationGate } from './pnl-gate';
import type { TradingCell } from './pnl-types';
import type { MarketFeedHealth } from './pnl-market';

const NOW = Date.UTC(2026, 1, 24, 12, 0, 0);

function makeFeed(status: MarketFeedHealth['status']): MarketFeedHealth {
    return {
        status,
        consecutiveErrors: status === 'WORKING' ? 0 : 1,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastErrorMessage: null,
    };
}

function makeCell(params?: {
    totalPnl?: number;
    drawdown?: number;
    consistencyRatio?: number;
    positions?: Array<{ currentPrice: number; quantity: number }>;
    totalValue?: number;
}): TradingCell {
    const totalPnl = params?.totalPnl ?? 12;
    const drawdown = params?.drawdown ?? 10;
    const consistencyRatio = params?.consistencyRatio ?? 0.8;
    const totalValue = params?.totalValue ?? 100;
    const positiveCount = Math.max(1, Math.floor(10 * consistencyRatio));
    const roundPnL = Array.from({ length: 10 }, (_, idx) => (idx < positiveCount ? 1 : -1));
    const positions = params?.positions ?? [{ currentPrice: 10, quantity: 1 }];

    return {
        portfolio: {
            totalPnL,
            maxDrawdown: drawdown,
            totalValue,
            positions,
        },
        roundPnL,
    } as unknown as TradingCell;
}

describe('graduation gate policy matrix', () => {
    it('strict profile passes with healthy metrics and WORKING feed', () => {
        const result = evaluateGraduationGate(
            makeCell(),
            'strict',
            makeFeed('WORKING'),
            'strict',
            { now: NOW, graduatedAtTimestamps: [] },
        );

        expect(result.eligible).toBe(true);
        expect(result.profile).toBe('strict');
        expect(result.checks.feed).toBe(true);
    });

    it('strict feed mode blocks FLAKY feed', () => {
        const result = evaluateGraduationGate(
            makeCell(),
            'strict',
            makeFeed('FLAKY'),
            'strict',
            { now: NOW, graduatedAtTimestamps: [] },
        );

        expect(result.eligible).toBe(false);
        expect(result.checks.feed).toBe(false);
        expect(result.reasons.some((reason) => reason.includes('feed FLAKY blocked by strict mode'))).toBe(true);
    });

    it('balanced feed mode allows FLAKY feed when other checks pass', () => {
        const result = evaluateGraduationGate(
            makeCell(),
            'strict',
            makeFeed('FLAKY'),
            'balanced',
            { now: NOW, graduatedAtTimestamps: [] },
        );

        expect(result.eligible).toBe(true);
        expect(result.checks.feed).toBe(true);
    });

    it('strict profile blocks single risk violation but relaxed profile allows it', () => {
        const cellWithOneRiskViolation = makeCell({
            positions: [{ currentPrice: 95, quantity: 1 }],
            totalValue: 100,
        });

        const strictResult = evaluateGraduationGate(
            cellWithOneRiskViolation,
            'strict',
            makeFeed('WORKING'),
            'balanced',
            { now: NOW, graduatedAtTimestamps: [] },
        );

        const relaxedResult = evaluateGraduationGate(
            cellWithOneRiskViolation,
            'relaxed',
            makeFeed('WORKING'),
            'balanced',
            { now: NOW, graduatedAtTimestamps: [] },
        );

        expect(strictResult.eligible).toBe(false);
        expect(strictResult.maxRiskViolations).toBe(0);
        expect(relaxedResult.eligible).toBe(true);
        expect(relaxedResult.maxRiskViolations).toBe(1);
    });

    it('weekly cap is enforced per profile', () => {
        const strictBlocked = evaluateGraduationGate(
            makeCell(),
            'strict',
            makeFeed('WORKING'),
            'balanced',
            { now: NOW, graduatedAtTimestamps: [NOW - 60_000] },
        );

        const relaxedAllowed = evaluateGraduationGate(
            makeCell(),
            'relaxed',
            makeFeed('WORKING'),
            'balanced',
            { now: NOW, graduatedAtTimestamps: [NOW - 60_000] },
        );

        const relaxedBlocked = evaluateGraduationGate(
            makeCell(),
            'relaxed',
            makeFeed('WORKING'),
            'balanced',
            { now: NOW, graduatedAtTimestamps: [NOW - 60_000, NOW - 120_000] },
        );

        expect(strictBlocked.eligible).toBe(false);
        expect(strictBlocked.checks.weeklySlot).toBe(false);
        expect(relaxedAllowed.eligible).toBe(true);
        expect(relaxedBlocked.eligible).toBe(false);
    });
});

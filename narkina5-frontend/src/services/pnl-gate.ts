import { getGraduatedAgents } from './pumpfun';
import {
    MAX_POSITION_PERCENT,
    MAX_GRADUATIONS_PER_SEASON,
    RELAX_GATE_AFTER_SEASONS,
    SEASON_DURATION_DAYS,
} from './pnl-types';
import { isMarketFeedReliable } from './pnl-market';
import type { TradingCell } from './pnl-types';
import type { FeedReliabilityMode, MarketFeedHealth } from './pnl-market';

export type GraduationGateProfile = 'strict' | 'relaxed';

interface GateProfileConfig {
    minPnlSOL: number;
    relaxedMinPnlSOL: number;
    maxDrawdownPercent: number;
    minConsistencyPercent: number;
    maxRiskViolations: number;
    maxWeeklyGraduations: number;
}

const SEASON_MS = SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000;
const WEEK_MS = SEASON_MS;
const GRAD_MIN_PNL_SOL = 10;
const GRAD_RELAXED_MIN_PNL_SOL = 8;
const GRAD_MAX_DRAWDOWN_PERCENT = 15;
const GRAD_MIN_CONSISTENCY_PERCENT = 55;
const GRAD_MAX_WEEKLY = MAX_GRADUATIONS_PER_SEASON;
const GRAD_RELAX_AFTER_WEEKS = RELAX_GATE_AFTER_SEASONS;

const GATE_PROFILE_CONFIG: Record<GraduationGateProfile, GateProfileConfig> = {
    strict: {
        minPnlSOL: GRAD_MIN_PNL_SOL,
        relaxedMinPnlSOL: GRAD_RELAXED_MIN_PNL_SOL,
        maxDrawdownPercent: GRAD_MAX_DRAWDOWN_PERCENT,
        minConsistencyPercent: GRAD_MIN_CONSISTENCY_PERCENT,
        maxRiskViolations: 0,
        maxWeeklyGraduations: GRAD_MAX_WEEKLY,
    },
    relaxed: {
        minPnlSOL: 6,
        relaxedMinPnlSOL: 5,
        maxDrawdownPercent: 22,
        minConsistencyPercent: 45,
        maxRiskViolations: 1,
        maxWeeklyGraduations: Math.max(2, GRAD_MAX_WEEKLY),
    },
};

export interface GraduationGateResult {
    profile: GraduationGateProfile;
    feedReliabilityMode: FeedReliabilityMode;
    eligible: boolean;
    minPnlRequired: number;
    maxDrawdownPercent: number;
    consistencyPercent: number;
    minConsistencyPercent: number;
    riskViolations: number;
    maxRiskViolations: number;
    weeklyGraduations: number;
    maxWeeklyGraduations: number;
    weeksSinceLastGraduation: number;
    checks: {
        pnl: boolean;
        drawdown: boolean;
        consistency: boolean;
        risk: boolean;
        weeklySlot: boolean;
        feed: boolean;
    };
    reasons: string[];
}

export interface EvaluateGraduationGateOptions {
    now?: number;
    graduatedAtTimestamps?: number[];
}

function getWeekKey(timestamp: number): string {
    const date = new Date(timestamp);
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function evaluateGraduationGate(
    cell: TradingCell,
    profile: GraduationGateProfile,
    feedHealth: MarketFeedHealth,
    feedReliabilityMode: FeedReliabilityMode,
    options: EvaluateGraduationGateOptions = {},
): GraduationGateResult {
    const config = GATE_PROFILE_CONFIG[profile];
    const now = options.now ?? Date.now();
    const graduatedAtTimestamps = options.graduatedAtTimestamps
        ?? getGraduatedAgents().map((entry) => entry.graduatedAt);
    const graduated = [...graduatedAtTimestamps].sort((a, b) => b - a);

    const thisWeek = getWeekKey(now);
    const weeklyGraduations = graduated.filter((ts) => getWeekKey(ts) === thisWeek).length;
    const lastGraduationAt = graduated[0];
    const weeksSinceLastGraduation = lastGraduationAt ? Math.floor((now - lastGraduationAt) / WEEK_MS) : 0;
    const minPnlRequired = weeksSinceLastGraduation >= GRAD_RELAX_AFTER_WEEKS
        ? config.relaxedMinPnlSOL
        : config.minPnlSOL;

    const pnlCheck = cell.portfolio.totalPnL >= minPnlRequired;
    const drawdownCheck = cell.portfolio.maxDrawdown <= config.maxDrawdownPercent;
    const totalRounds = Math.max(1, cell.roundPnL.length);
    const positiveRounds = cell.roundPnL.filter((value) => value > 0).length;
    const consistencyPercent = (positiveRounds / totalRounds) * 100;
    const consistencyCheck = consistencyPercent >= config.minConsistencyPercent;
    const totalValue = Math.max(cell.portfolio.totalValue, 0.000001);
    const riskViolations = cell.portfolio.positions.reduce((count, position) => {
        const weight = (position.currentPrice * position.quantity) / totalValue;
        return count + (weight > MAX_POSITION_PERCENT + 0.0001 ? 1 : 0);
    }, 0);
    const riskCheck = riskViolations <= config.maxRiskViolations;
    const weeklySlotCheck = weeklyGraduations < config.maxWeeklyGraduations;
    const feedCheck = isMarketFeedReliable(feedReliabilityMode, feedHealth);

    const reasons: string[] = [];
    if (!pnlCheck) reasons.push(`PnL < +${minPnlRequired.toFixed(0)} SOL`);
    if (!drawdownCheck) reasons.push(`drawdown > ${config.maxDrawdownPercent}%`);
    if (!consistencyCheck) reasons.push(`consistency < ${config.minConsistencyPercent}%`);
    if (!riskCheck) reasons.push(`risk violations > ${config.maxRiskViolations}`);
    if (!weeklySlotCheck) reasons.push('weekly graduation slot exhausted');
    if (!feedCheck) reasons.push(`feed ${feedHealth.status} blocked by ${feedReliabilityMode} mode`);

    return {
        profile,
        feedReliabilityMode,
        eligible: pnlCheck && drawdownCheck && consistencyCheck && riskCheck && weeklySlotCheck && feedCheck,
        minPnlRequired,
        maxDrawdownPercent: config.maxDrawdownPercent,
        consistencyPercent,
        minConsistencyPercent: config.minConsistencyPercent,
        riskViolations,
        maxRiskViolations: config.maxRiskViolations,
        weeklyGraduations,
        maxWeeklyGraduations: config.maxWeeklyGraduations,
        weeksSinceLastGraduation,
        checks: {
            pnl: pnlCheck,
            drawdown: drawdownCheck,
            consistency: consistencyCheck,
            risk: riskCheck,
            weeklySlot: weeklySlotCheck,
            feed: feedCheck,
        },
        reasons,
    };
}

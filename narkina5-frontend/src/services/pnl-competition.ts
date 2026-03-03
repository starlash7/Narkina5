// ============================================================================
// Narkina5 PnL Arena — Competition Engine
// 64 Trading Cells. 512 Agents. 7 Floors. Virtual portfolios. Real token prices.
// Pure business logic / data layer. No React.
// ============================================================================

import { generateAgent, seededRandom } from './competition';
import {
    STARTING_CAPITAL,
    MAX_POSITION_PERCENT,
    SLIPPAGE_PERCENT,
    TOTAL_ROUNDS,
    CELLS_COUNT,
    AGENTS_PER_CELL,
    SPOTLIGHT_CELLS,
    CELL_NAMES,
    ELIMINATION_SCHEDULE,
} from './pnl-types';
import type {
    PnLAgent,
    PnLCompetitionState,
    PnLLogEntry,
    TradingCell,
    Portfolio,
    Trade,
    PumpToken,
    TokenSnapshot,
    TradeDecision,
    InvestmentRole,
    TradingDoctrine,
} from './pnl-types';

// ---------------------------------------------------------------------------
// Role assignment pattern per cell (8 agents = 5 roles, some doubled)
// ---------------------------------------------------------------------------

const CELL_ROLE_PATTERN: InvestmentRole[] = [
    'Researcher', 'Researcher',
    'Analyst',
    'Strategist',
    'Trader', 'Trader',
    'RiskManager', 'RiskManager',
];

const MIN_HOLD_ROUNDS = 2;
const DOCTRINES: TradingDoctrine[] = ['Wyckoff', 'Scalping', 'Technical', 'MacroResearch', 'OrderFlow'];
const BASE_PRIORITY_FEE_BPS = 4;
const MAX_PRIORITY_FEE_BPS = 26;
const MIN_NET_EDGE_BUFFER_BPS = 12;
const BASE_SLIPPAGE_BPS = SLIPPAGE_PERCENT * 10000;
const MIN_TURNOVER_RATIO = 0.03;

type CellArchetype =
    | 'TrendRider'
    | 'MeanReverter'
    | 'BreakoutHunter'
    | 'LiquidityFarmer'
    | 'ShieldWall';

interface CellStrategyProfile {
    archetype: CellArchetype;
    styleLabel: string;
    riskBias: number;
    executionBias: number;
    researchBias: number;
    chartBias: number;
    adaptationBias: number;
    momentumBias: number;      // -1..1 (negative = contrarian)
    turnoverBias: number;      // 0..1
    volatilityTolerance: number; // 0..1
    stopLossPct: number;
    takeProfitPct: number;
    baseBuyCount: number;
    baseSpendPct: number;
    maxSpendPct: number;
    rotateFactor: number;      // 0..1
}

const CELL_STRATEGIES: CellStrategyProfile[] = [
    {
        archetype: 'TrendRider',
        styleLabel: 'trend follow + pyramiding',
        riskBias: 0.14,
        executionBias: 0.08,
        researchBias: 0.02,
        chartBias: 0.1,
        adaptationBias: 0.06,
        momentumBias: 0.85,
        turnoverBias: 0.72,
        volatilityTolerance: 0.68,
        stopLossPct: 8.5,
        takeProfitPct: 18,
        baseBuyCount: 2,
        baseSpendPct: 0.03,
        maxSpendPct: 0.12,
        rotateFactor: 0.55,
    },
    {
        archetype: 'MeanReverter',
        styleLabel: 'contrarian snapback + risk trim',
        riskBias: -0.08,
        executionBias: -0.02,
        researchBias: 0.12,
        chartBias: 0.08,
        adaptationBias: 0.07,
        momentumBias: -0.7,
        turnoverBias: 0.5,
        volatilityTolerance: 0.44,
        stopLossPct: 6.5,
        takeProfitPct: 13.5,
        baseBuyCount: 1,
        baseSpendPct: 0.024,
        maxSpendPct: 0.09,
        rotateFactor: 0.72,
    },
    {
        archetype: 'BreakoutHunter',
        styleLabel: 'high conviction breakout',
        riskBias: 0.2,
        executionBias: 0.12,
        researchBias: -0.02,
        chartBias: 0.15,
        adaptationBias: 0.04,
        momentumBias: 0.95,
        turnoverBias: 0.85,
        volatilityTolerance: 0.78,
        stopLossPct: 9.5,
        takeProfitPct: 22,
        baseBuyCount: 2,
        baseSpendPct: 0.032,
        maxSpendPct: 0.13,
        rotateFactor: 0.46,
    },
    {
        archetype: 'LiquidityFarmer',
        styleLabel: 'flow rotation + low-friction execution',
        riskBias: 0.06,
        executionBias: 0.16,
        researchBias: 0.04,
        chartBias: 0.04,
        adaptationBias: 0.08,
        momentumBias: 0.45,
        turnoverBias: 0.96,
        volatilityTolerance: 0.62,
        stopLossPct: 7.8,
        takeProfitPct: 16.5,
        baseBuyCount: 2,
        baseSpendPct: 0.028,
        maxSpendPct: 0.11,
        rotateFactor: 0.67,
    },
    {
        archetype: 'ShieldWall',
        styleLabel: 'capital defense + consistency',
        riskBias: -0.16,
        executionBias: 0.02,
        researchBias: 0.1,
        chartBias: 0.02,
        adaptationBias: 0.12,
        momentumBias: -0.25,
        turnoverBias: 0.58,
        volatilityTolerance: 0.36,
        stopLossPct: 5.8,
        takeProfitPct: 11.5,
        baseBuyCount: 1,
        baseSpendPct: 0.02,
        maxSpendPct: 0.08,
        rotateFactor: 0.84,
    },
];

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = mean(values);
    const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
    return Math.sqrt(variance);
}

function turnoverRatio(token: PumpToken): number {
    return token.volume24h / Math.max(token.marketCapSOL, 1);
}

function strategyProfileForCell(cellIndex: number): CellStrategyProfile {
    return CELL_STRATEGIES[cellIndex % CELL_STRATEGIES.length];
}

interface MarketRegime {
    trend: number;        // -1..1
    volatility: number;   // 0..1
    breadth: number;      // -1..1
    liquidity: number;    // 0..1
}

function detectMarketRegime(tokens: PumpToken[]): MarketRegime {
    if (tokens.length === 0) {
        return { trend: 0, volatility: 0, breadth: 0, liquidity: 0 };
    }

    const changes = tokens.map((t) => t.priceChange24h);
    const upRatio = tokens.filter((t) => t.priceChange24h > 0).length / tokens.length;
    const avgTurnover = mean(tokens.map((t) => turnoverRatio(t)));

    return {
        trend: clamp(mean(changes) / 18, -1, 1),
        volatility: clamp(stdDev(changes) / 28, 0, 1),
        breadth: clamp((upRatio - 0.5) * 2, -1, 1),
        liquidity: clamp(avgTurnover / 0.18, 0, 1),
    };
}

function regimeFitScore(token: PumpToken, strategy: CellStrategyProfile, regime: MarketRegime): number {
    const tokenMomentum = clamp(token.priceChange24h / 35, -1, 1);
    const turnover = clamp(turnoverRatio(token) / 0.18, 0, 1);
    const momentumWeight = Math.abs(strategy.momentumBias);
    const momentumSide = strategy.momentumBias >= 0 ? tokenMomentum : -tokenMomentum;
    const trendSide = strategy.momentumBias >= 0 ? regime.trend : -regime.trend;
    const breadthSupport = strategy.momentumBias >= 0 ? regime.breadth : -regime.breadth;
    const volPenalty = Math.max(0, regime.volatility - strategy.volatilityTolerance) * 0.9;
    const liquidityFit = (turnover - 0.5) * strategy.turnoverBias * 0.9
        + (regime.liquidity - 0.5) * strategy.turnoverBias * 0.7;

    return momentumSide * momentumWeight * 1.05
        + trendSide * momentumWeight * 0.65
        + breadthSupport * 0.35
        + liquidityFit
        - volPenalty;
}

function holderConcentrationRisk(token: PumpToken): number {
    if (token.holders > 0) {
        return clamp((220 - token.holders) / 220, 0, 1);
    }
    const turnover = turnoverRatio(token);
    return clamp((0.11 - turnover) / 0.11, 0, 1);
}

function suspicionRisk(token: PumpToken): number {
    const momentum = Math.abs(token.priceChange24h);
    const turnover = turnoverRatio(token);
    const ageHours = Math.max(0.5, (Date.now() - token.createdAt) / 3600000);
    const spike = clamp((momentum - 22) / 140, 0, 1);
    const thin = clamp((0.07 - turnover) / 0.07, 0, 1);
    const ultraNew = clamp((12 - ageHours) / 12, 0, 1);
    return clamp(spike * 0.45 + thin * 0.35 + ultraNew * 0.2, 0, 1);
}

function qualityPenalty(token: PumpToken): number {
    const concentration = holderConcentrationRisk(token);
    const suspicion = suspicionRisk(token);
    const turnover = turnoverRatio(token);
    const lowTurnover = clamp((MIN_TURNOVER_RATIO - turnover) / MIN_TURNOVER_RATIO, 0, 1);
    return clamp(suspicion * 0.5 + concentration * 0.3 + lowTurnover * 0.2, 0, 1);
}

function estimatePriceImpactBps(token: PumpToken, amountSOL: number): number {
    const depthProxy = Math.max(5, token.volume24h * 0.03);
    const impact = (amountSOL / depthProxy) * 10000;
    return clamp(impact, 3, 140);
}

function priorityFeeProxyBps(round: number, cellIndex: number): number {
    const noise = seededRandom(round * 193 + cellIndex * 71 + 17);
    return clamp(BASE_PRIORITY_FEE_BPS + noise * (MAX_PRIORITY_FEE_BPS - BASE_PRIORITY_FEE_BPS), BASE_PRIORITY_FEE_BPS, MAX_PRIORITY_FEE_BPS);
}

function expectedEdgeBps(
    token: PumpToken,
    signalScore: number,
    avgResearch: number,
    avgChart: number,
    avgAdapt: number,
): number {
    const momentum = token.priceChange24h / 100;
    const turnover = turnoverRatio(token);
    const signalComponent = signalScore * 9.5;
    const regimeComponent = momentum * 125 + (turnover - 0.05) * 180;
    const skillComponent = (avgResearch * 0.38 + avgChart * 0.42 + avgAdapt * 0.2) * 75;
    return clamp(signalComponent + regimeComponent + skillComponent, -240, 420);
}

function roleContribution(role: InvestmentRole): string {
    switch (role) {
        case 'Researcher':
            return 'Narrative scan + social catalyst discovery';
        case 'Analyst':
            return 'Wyckoff structure + regime validation';
        case 'Strategist':
            return 'Capital allocation + scenario orchestration';
        case 'Trader':
            return 'Execution routing + edge-cost filtering';
        case 'RiskManager':
            return 'Manipulation filter + drawdown defense';
        default:
            return 'General trading support';
    }
}

function doctrineScore(token: PumpToken, doctrine: TradingDoctrine): number {
    const momentum = token.priceChange24h;
    const volume = Math.log10(Math.max(token.volume24h, 1));
    const cap = Math.log10(Math.max(token.marketCapSOL, 1));
    const ageHours = Math.max(1, (Date.now() - token.createdAt) / 3600000);

    switch (doctrine) {
        case 'Wyckoff':
            return momentum * 0.55 + volume * 0.35 - Math.abs(momentum) * 0.08;
        case 'Scalping':
            return Math.abs(momentum) * 0.45 + volume * 0.55;
        case 'Technical':
            return momentum * 0.65 + volume * 0.25 - Math.abs(momentum) * 0.05;
        case 'MacroResearch':
            return cap * 0.5 + momentum * 0.25 + volume * 0.25;
        case 'OrderFlow':
            return volume * 0.7 + momentum * 0.2 - ageHours * 0.0004;
        default:
            return momentum * 0.5 + volume * 0.5;
    }
}

function roleTuning(role: InvestmentRole): {
    risk: number;
    exec: number;
    research: number;
    chart: number;
    adapt: number;
} {
    switch (role) {
        case 'Researcher':
            return { risk: 0.36, exec: 0.34, research: 0.86, chart: 0.58, adapt: 0.72 };
        case 'Trader':
            return { risk: 0.68, exec: 0.86, research: 0.42, chart: 0.74, adapt: 0.62 };
        case 'RiskManager':
            return { risk: 0.24, exec: 0.46, research: 0.58, chart: 0.54, adapt: 0.66 };
        case 'Analyst':
            return { risk: 0.42, exec: 0.56, research: 0.78, chart: 0.82, adapt: 0.64 };
        case 'Strategist':
            return { risk: 0.54, exec: 0.64, research: 0.74, chart: 0.68, adapt: 0.82 };
        default:
            return { risk: 0.45, exec: 0.55, research: 0.55, chart: 0.55, adapt: 0.55 };
    }
}

function doctrineByCell(cellIdx: number, slot: number): TradingDoctrine {
    return DOCTRINES[(cellIdx * 3 + slot * 2) % DOCTRINES.length];
}

function makeSkillProfile(cellIdx: number, slot: number, role: InvestmentRole) {
    const base = roleTuning(role);
    const doctrine = doctrineByCell(cellIdx, slot);
    const strategy = strategyProfileForCell(cellIdx);
    const jitter = seededRandom((cellIdx + 1) * 97 + (slot + 1) * 31) - 0.5;
    const cellBias = seededRandom((cellIdx + 1) * 191) - 0.5;

    return {
        doctrine,
        riskAppetite: clamp(base.risk + jitter * 0.18 + cellBias * 0.1 + strategy.riskBias * 0.18, 0.1, 0.92),
        execution: clamp(base.exec + jitter * 0.14 + strategy.executionBias * 0.18, 0.2, 0.97),
        researchDepth: clamp(base.research + jitter * 0.16 + strategy.researchBias * 0.18, 0.2, 0.99),
        chartSkill: clamp(base.chart + jitter * 0.16 + strategy.chartBias * 0.18, 0.2, 0.99),
        adaptation: clamp(base.adapt + jitter * 0.12 + strategy.adaptationBias * 0.16, 0.2, 0.99),
        edgeScore: clamp(
            0.88 + cellBias * 0.16 + jitter * 0.1 + strategy.executionBias * 0.08 + strategy.researchBias * 0.06,
            0.42,
            1.32,
        ),
    };
}

// ---------------------------------------------------------------------------
// Portfolio helpers
// ---------------------------------------------------------------------------

function emptyPortfolio(): Portfolio {
    return {
        cashSOL: STARTING_CAPITAL,
        positions: [],
        trades: [],
        totalValue: STARTING_CAPITAL,
        realizedPnL: 0,
        unrealizedPnL: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        maxDrawdown: 0,
        peakValue: STARTING_CAPITAL,
    };
}

/**
 * Recalculate portfolio values based on current prices.
 */
export function updatePortfolioPrices(
    portfolio: Portfolio,
    prices: Record<string, number>,
): Portfolio {
    const p = { ...portfolio, positions: portfolio.positions.map((pos) => ({ ...pos })) };

    let positionsValue = 0;
    for (const pos of p.positions) {
        const currentPrice = prices[pos.tokenMint] ?? pos.currentPrice;
        pos.currentPrice = currentPrice;
        pos.unrealizedPnL = (currentPrice - pos.avgEntryPrice) * pos.quantity;
        pos.unrealizedPnLPercent =
            pos.avgEntryPrice > 0 ? ((currentPrice - pos.avgEntryPrice) / pos.avgEntryPrice) * 100 : 0;
        positionsValue += currentPrice * pos.quantity;
    }

    p.totalValue = p.cashSOL + positionsValue;
    p.unrealizedPnL = positionsValue - p.positions.reduce((s, pos) => s + pos.avgEntryPrice * pos.quantity, 0);
    p.totalPnL = p.realizedPnL + p.unrealizedPnL;
    p.totalPnLPercent = (p.totalPnL / STARTING_CAPITAL) * 100;

    if (p.totalValue > p.peakValue) p.peakValue = p.totalValue;
    const drawdown = p.peakValue > 0 ? ((p.peakValue - p.totalValue) / p.peakValue) * 100 : 0;
    if (drawdown > p.maxDrawdown) p.maxDrawdown = drawdown;

    return p;
}

// ---------------------------------------------------------------------------
// Trade execution
// ---------------------------------------------------------------------------

let tradeCounter = 0;

/**
 * Execute a virtual buy on a cell portfolio.
 */
export function executeBuy(
    portfolio: Portfolio,
    token: PumpToken,
    amountSOL: number,
    agentId: string,
    agentRole: InvestmentRole,
    reasoning: string,
    currentRound: number,
): { portfolio: Portfolio; trade: Trade } {
    // Enforce max position size
    const maxSpend = portfolio.totalValue * MAX_POSITION_PERCENT;
    const spend = Math.min(amountSOL, portfolio.cashSOL, maxSpend);
    if (spend <= 0) {
        return { portfolio, trade: makeTrade(token, 'buy', 0, 0, 0, agentId, agentRole, reasoning) };
    }

    const slippage = spend * SLIPPAGE_PERCENT;
    const effectiveSpend = spend - slippage;
    const quantity = effectiveSpend / token.priceSOL;

    const p = { ...portfolio, positions: portfolio.positions.map((pos) => ({ ...pos })), trades: [...portfolio.trades] };
    p.cashSOL -= spend;

    // Update or create position
    const existing = p.positions.find((pos) => pos.tokenMint === token.mint);
    if (existing) {
        const totalCost = existing.avgEntryPrice * existing.quantity + effectiveSpend;
        existing.quantity += quantity;
        existing.avgEntryPrice = totalCost / existing.quantity;
        existing.currentPrice = token.priceSOL;
        existing.entryRound = Math.min(existing.entryRound ?? currentRound, currentRound);
    } else {
        p.positions.push({
            tokenMint: token.mint,
            tokenSymbol: token.symbol,
            tokenName: token.name,
            entryRound: currentRound,
            quantity,
            avgEntryPrice: token.priceSOL,
            currentPrice: token.priceSOL,
            unrealizedPnL: -slippage,
            unrealizedPnLPercent: -SLIPPAGE_PERCENT * 100,
        });
    }

    const trade = makeTrade(token, 'buy', quantity, token.priceSOL, spend, agentId, agentRole, reasoning);
    p.trades.push(trade);

    return { portfolio: recalcPortfolio(p), trade };
}

/**
 * Execute a virtual sell on a cell portfolio.
 */
export function executeSell(
    portfolio: Portfolio,
    token: PumpToken,
    amountSOL: number,
    agentId: string,
    agentRole: InvestmentRole,
    reasoning: string,
    currentRound: number,
): { portfolio: Portfolio; trade: Trade } {
    const pos = portfolio.positions.find((p) => p.tokenMint === token.mint);
    if (!pos || pos.quantity <= 0) {
        return { portfolio, trade: makeTrade(token, 'sell', 0, 0, 0, agentId, agentRole, reasoning) };
    }
    const heldRounds = currentRound - (pos.entryRound ?? currentRound);
    if (heldRounds < MIN_HOLD_ROUNDS) {
        return { portfolio, trade: makeTrade(token, 'sell', 0, 0, 0, agentId, agentRole, reasoning) };
    }

    const maxSellQuantity = pos.quantity;
    const sellQuantity = Math.min(amountSOL / token.priceSOL, maxSellQuantity);
    const grossProceeds = sellQuantity * token.priceSOL;
    const slippage = grossProceeds * SLIPPAGE_PERCENT;
    const netProceeds = grossProceeds - slippage;

    const p = { ...portfolio, positions: portfolio.positions.map((p2) => ({ ...p2 })), trades: [...portfolio.trades] };
    p.cashSOL += netProceeds;

    const updatedPos = p.positions.find((p2) => p2.tokenMint === token.mint)!;
    const costBasis = updatedPos.avgEntryPrice * sellQuantity;
    p.realizedPnL += netProceeds - costBasis;
    updatedPos.quantity -= sellQuantity;

    // Remove empty positions
    p.positions = p.positions.filter((p2) => p2.quantity > 0.0001);

    const trade = makeTrade(token, 'sell', sellQuantity, token.priceSOL, netProceeds, agentId, agentRole, reasoning);
    p.trades.push(trade);

    return { portfolio: recalcPortfolio(p), trade };
}

function makeTrade(
    token: PumpToken,
    side: 'buy' | 'sell',
    quantity: number,
    price: number,
    total: number,
    agentId: string,
    agentRole: InvestmentRole,
    reasoning: string,
): Trade {
    return {
        id: `trade-${++tradeCounter}`,
        timestamp: Date.now(),
        tokenMint: token.mint,
        tokenSymbol: token.symbol,
        side,
        quantity,
        priceSOL: price,
        totalSOL: total,
        slippage: total * SLIPPAGE_PERCENT,
        agentId,
        agentRole,
        reasoning,
    };
}

function recalcPortfolio(p: Portfolio): Portfolio {
    const posValue = p.positions.reduce((s, pos) => s + pos.currentPrice * pos.quantity, 0);
    p.totalValue = p.cashSOL + posValue;
    p.unrealizedPnL = posValue - p.positions.reduce((s, pos) => s + pos.avgEntryPrice * pos.quantity, 0);
    p.totalPnL = p.realizedPnL + p.unrealizedPnL;
    p.totalPnLPercent = (p.totalPnL / STARTING_CAPITAL) * 100;
    if (p.totalValue > p.peakValue) p.peakValue = p.totalValue;
    const dd = p.peakValue > 0 ? ((p.peakValue - p.totalValue) / p.peakValue) * 100 : 0;
    if (dd > p.maxDrawdown) p.maxDrawdown = dd;
    return p;
}

// ---------------------------------------------------------------------------
// Agent & cell generation
// ---------------------------------------------------------------------------

/**
 * Generate 512 PnL agents organized into 64 cells.
 */
export function generatePnLAgents(): { agents: Record<string, PnLAgent>; cells: TradingCell[] } {
    const agents: Record<string, PnLAgent> = {};
    const cells: TradingCell[] = [];

    for (let cellIdx = 0; cellIdx < CELLS_COUNT; cellIdx++) {
        const cellId = `cell-${cellIdx}`;
        const cellAgentIds: string[] = [];

        for (let slot = 0; slot < AGENTS_PER_CELL; slot++) {
            const globalIndex = cellIdx * AGENTS_PER_CELL + slot;
            const base = generateAgent(globalIndex);
            const role = CELL_ROLE_PATTERN[slot];

            const pnlAgent: PnLAgent = {
                ...base,
                investmentRole: role,
                cellId,
                contribution: roleContribution(role),
                skillProfile: makeSkillProfile(cellIdx, slot, role),
                learning: {
                    rounds: 0,
                    cumulativePnL: 0,
                    recentRoundPnL: [],
                    confidence: 0.5,
                },
            };

            agents[pnlAgent.id] = pnlAgent;
            cellAgentIds.push(pnlAgent.id);
        }

        cells.push({
            id: cellId,
            name: CELL_NAMES[cellIdx],
            cellIndex: cellIdx,
            agents: cellAgentIds,
            portfolio: emptyPortfolio(),
            status: 'pending',
            currentPhase: 'research',
            roundPnL: [],
        });
    }

    return { agents, cells };
}

// ---------------------------------------------------------------------------
// Competition initialization
// ---------------------------------------------------------------------------

export function initializePnLCompetition(): PnLCompetitionState {
    const { agents, cells } = generatePnLAgents();

    return {
        status: 'idle',
        currentRound: 1,
        totalRounds: TOTAL_ROUNDS,
        cells,
        agents,
        availableTokens: [],
        tokenHistory: {},
        winner: null,
        log: [
            {
                timestamp: Date.now(),
                round: 0,
                type: 'system',
                message: `PnL Arena initialized. ${CELLS_COUNT} trading cells, ${Object.keys(agents).length} agents. Awaiting market data...`,
            },
        ],
        apiCallsMade: 0,
    };
}

// ---------------------------------------------------------------------------
// Simulation scoring (for non-spotlight cells)
// ---------------------------------------------------------------------------

/**
 * Simulate a trading round for a cell (no AI, deterministic).
 * Returns trade decisions based on seeded random.
 */
export function simulateCellTrades(
    cell: TradingCell,
    agents: Record<string, PnLAgent>,
    tokens: PumpToken[],
    round: number,
): TradeDecision[] {
    if (tokens.length === 0) return [];

    const decisions: TradeDecision[] = [];
    const seed = cell.cellIndex * 997 + round * 31;
    const strategy = strategyProfileForCell(cell.cellIndex);
    const regime = detectMarketRegime(tokens);
    const cellAgents = cell.agents.map((id) => agents[id]).filter((a): a is PnLAgent => !!a);
    const totalWeight = Math.max(1, cellAgents.length);
    const avgRisk = cellAgents.reduce((s, a) => s + a.skillProfile.riskAppetite, 0) / totalWeight;
    const avgExecution = cellAgents.reduce((s, a) => s + a.skillProfile.execution, 0) / totalWeight;
    const avgResearch = cellAgents.reduce((s, a) => s + a.skillProfile.researchDepth, 0) / totalWeight;
    const avgChart = cellAgents.reduce((s, a) => s + a.skillProfile.chartSkill, 0) / totalWeight;
    const avgAdapt = cellAgents.reduce((s, a) => s + a.skillProfile.adaptation, 0) / totalWeight;
    const avgConfidence = cellAgents.reduce((s, a) => s + a.learning.confidence, 0) / totalWeight;
    const congestionBps = priorityFeeProxyBps(round, cell.cellIndex);
    const drawdownPenalty = clamp(cell.portfolio.maxDrawdown / 22, 0, 0.06);

    const scoredTokens = tokens
        .map((token) => {
            const weighted = cellAgents.reduce((score, agent) => {
                const doctrineWeighted = doctrineScore(token, agent.skillProfile.doctrine) * agent.skillProfile.edgeScore;
                const skillBoost = agent.skillProfile.chartSkill * 0.3 + agent.skillProfile.researchDepth * 0.25;
                return score + doctrineWeighted + skillBoost;
            }, 0) / totalWeight;
            const qPenalty = qualityPenalty(token);
            const regimeBias = regimeFitScore(token, strategy, regime);
            const blendedScore = weighted + regimeBias * 6.5 - qPenalty * 3.8;

            return { token, score: blendedScore, qPenalty, regimeBias };
        })
        .sort((a, b) => b.score - a.score);

    const tradableTokens = scoredTokens.slice(0, 16);
    const buyCount = Math.max(
        1,
        Math.min(
            3,
            Math.round(
                strategy.baseBuyCount
                + (avgExecution > 0.78 ? 1 : 0)
                + (strategy.momentumBias > 0.6 && regime.trend > 0.2 ? 1 : 0)
                - (regime.volatility > 0.78 && strategy.volatilityTolerance < 0.55 ? 1 : 0),
            ),
        ),
    );
    const used = new Set<string>();

    for (let i = 0; i < buyCount && i < tradableTokens.length; i++) {
        const pickWindow = Math.min(8, tradableTokens.length);
        const tokenIdx = Math.floor(seededRandom(seed + i * 13 + 7) * pickWindow);
        const candidate = tradableTokens[tokenIdx];
        const token = candidate.token;
        if (used.has(token.mint)) continue;
        used.add(token.mint);
        const qPenalty = candidate.qPenalty;
        if (qPenalty > 0.83) continue;

        const spendPercent = clamp(
            strategy.baseSpendPct
                + avgRisk * 0.045
                + avgConfidence * 0.018
                + strategy.riskBias * 0.02
                + seededRandom(seed + i * 17 + 3) * 0.018
                - drawdownPenalty,
            0.015,
            strategy.maxSpendPct,
        );
        const spendSOL = cell.portfolio.cashSOL * spendPercent;
        const strategyEdgeBps = candidate.regimeBias * 36;
        const expectedBps = expectedEdgeBps(token, candidate.score, avgResearch, avgChart, avgAdapt)
            + strategyEdgeBps
            - qPenalty * 110;
        const impactBps = estimatePriceImpactBps(token, spendSOL);
        const congestionAdjBps = congestionBps * clamp(
            1.08 - (avgExecution + strategy.executionBias * 0.15) * 0.14,
            0.72,
            1.08,
        );
        const totalCostBps = BASE_SLIPPAGE_BPS + impactBps + congestionAdjBps;
        const extraBuffer = Math.max(0, regime.volatility - strategy.volatilityTolerance) * 14;
        const netBufferBps = MIN_NET_EDGE_BUFFER_BPS + (1 - avgAdapt) * 6 + extraBuffer;

        if (spendSOL > 0.08 && expectedBps > totalCostBps + netBufferBps) {
            decisions.push({
                side: 'buy',
                mint: token.mint,
                symbol: token.symbol,
                amountSOL: spendSOL,
                reasoning: `${strategy.archetype}/${strategy.styleLabel} buy ${token.symbol}: edge ${expectedBps.toFixed(1)}bps vs cost ${totalCostBps.toFixed(1)}bps`,
            });
        }
    }

    // Proactive exits: stop-loss, take-profit, and regime-aware rotation
    const sellablePositions = cell.portfolio.positions
        .filter(
        (pos) => round - (pos.entryRound ?? round) >= MIN_HOLD_ROUNDS,
    )
        .sort((a, b) => (a.currentPrice - a.avgEntryPrice) / a.avgEntryPrice - (b.currentPrice - b.avgEntryPrice) / b.avgEntryPrice);

    const maxSellActions = Math.max(1, Math.min(2, Math.round(1 + strategy.rotateFactor * 0.6)));
    let sellActions = 0;

    for (let i = 0; i < sellablePositions.length; i++) {
        if (sellActions >= maxSellActions) break;
        const pos = sellablePositions[i];
        if (used.has(pos.tokenMint)) continue;

        const pnlPct = pos.avgEntryPrice > 0 ? ((pos.currentPrice - pos.avgEntryPrice) / pos.avgEntryPrice) * 100 : 0;
        const stopLossHit = pnlPct <= -strategy.stopLossPct;
        const takeProfitHit = pnlPct >= strategy.takeProfitPct;
        const regimeRiskOff = regime.trend < -0.2 && regime.volatility > strategy.volatilityTolerance + 0.15;
        const rotateTrigger = seededRandom(seed + 91 + i * 17) > clamp(
            0.92 - strategy.rotateFactor * 0.24 - avgAdapt * 0.08 + avgConfidence * 0.04,
            0.56,
            0.94,
        );

        if (!stopLossHit && !takeProfitHit && !regimeRiskOff && !rotateTrigger) continue;

        const baseSellPercent = stopLossHit
            ? 0.78
            : takeProfitHit
                ? 0.46
                : regimeRiskOff
                    ? 0.58
                    : 0.28 + strategy.rotateFactor * 0.22;
        const sellPercent = clamp(baseSellPercent + seededRandom(seed + 113 + i * 19) * 0.14, 0.2, 0.92);
        const trigger = stopLossHit
            ? 'stop-loss'
            : takeProfitHit
                ? 'take-profit'
                : regimeRiskOff
                    ? 'risk-off rotation'
                    : 'rebalance';

        decisions.push({
            side: 'sell',
            mint: pos.tokenMint,
            symbol: pos.tokenSymbol,
            amountSOL: pos.quantity * pos.currentPrice * sellPercent,
            reasoning: `${strategy.archetype}/${strategy.styleLabel} sell ${pos.tokenSymbol}: ${trigger} (${pnlPct.toFixed(1)}%)`,
        });
        sellActions += 1;
        used.add(pos.tokenMint);
    }

    return decisions;
}

/**
 * Apply trade decisions to a cell portfolio.
 */
export function applyTrades(
    cell: TradingCell,
    decisions: TradeDecision[],
    tokens: PumpToken[],
    agents: Record<string, PnLAgent>,
    round: number,
): { cell: TradingCell; trades: Trade[]; logs: PnLLogEntry[] } {
    const tokenMap = new Map(tokens.map((t) => [t.mint, t]));
    let portfolio = { ...cell.portfolio };
    const prevPnL = cell.portfolio.totalPnL;
    const allTrades: Trade[] = [];
    const logs: PnLLogEntry[] = [];
    const strategy = strategyProfileForCell(cell.cellIndex);
    const regime = detectMarketRegime(tokens);
    const riskManagers = cell.agents
        .map((id) => agents[id])
        .filter((agent): agent is PnLAgent => !!agent && agent.investmentRole === 'RiskManager');
    const riskStrictness = riskManagers.length > 0
        ? riskManagers.reduce(
            (s, agent) => s + ((1 - agent.skillProfile.riskAppetite) * 0.6 + agent.skillProfile.researchDepth * 0.4),
            0,
        ) / riskManagers.length
        : 0.5;

    // Pick a trader agent from the cell for attribution
    const traderAgent = cell.agents
        .map((id) => agents[id])
        .find((a) => a.investmentRole === 'Trader');
    const agentId = traderAgent?.id || cell.agents[0];
    const agentRole: InvestmentRole = traderAgent?.investmentRole || 'Trader';

    for (const decision of decisions) {
        const token = tokenMap.get(decision.mint);
        if (!token) continue;
        const qPenalty = qualityPenalty(token);
        const turnover = turnoverRatio(token);
        const riskCutoff = clamp(
            0.87
            - riskStrictness * 0.1
            + strategy.volatilityTolerance * 0.04
            - Math.max(0, regime.volatility - strategy.volatilityTolerance) * 0.06,
            0.72,
            0.91,
        );
        const minTurnover = MIN_TURNOVER_RATIO * clamp(0.82 + strategy.turnoverBias * 0.5, 0.76, 1.24);
        if (decision.side === 'buy' && (qPenalty > riskCutoff || turnover < minTurnover)) {
            logs.push({
                timestamp: Date.now(),
                round: 0,
                cellId: cell.id,
                type: 'risk_alert',
                message: `${cell.name} risk veto on $${decision.symbol} (${strategy.archetype}; quality ${(qPenalty * 100).toFixed(0)}%, turnover ${(turnover * 100).toFixed(1)}%)`,
            });
            continue;
        }

        if (decision.side === 'buy') {
            const result = executeBuy(portfolio, token, decision.amountSOL, agentId, agentRole, decision.reasoning, round);
            portfolio = result.portfolio;
            if (result.trade.quantity > 0) {
                allTrades.push(result.trade);
                logs.push({
                    timestamp: Date.now(),
                    round: 0,
                    cellId: cell.id,
                    type: 'trade',
                    message: `${cell.name} BUY ${decision.amountSOL.toFixed(2)} SOL of $${decision.symbol} | ${decision.reasoning}`,
                });
            }
        } else {
            const result = executeSell(portfolio, token, decision.amountSOL, agentId, agentRole, decision.reasoning, round);
            portfolio = result.portfolio;
            if (result.trade.quantity > 0) {
                allTrades.push(result.trade);
                logs.push({
                    timestamp: Date.now(),
                    round: 0,
                    cellId: cell.id,
                    type: 'trade',
                    message: `${cell.name} SELL $${decision.symbol} for ${result.trade.totalSOL.toFixed(2)} SOL | ${decision.reasoning}`,
                });
            }
        }
    }

    const pnlDelta = portfolio.totalPnL - prevPnL;
    if (cell.agents.length > 0) {
        const perAgentDelta = pnlDelta / cell.agents.length;
        for (const id of cell.agents) {
            const agent = agents[id];
            if (!agent) continue;

            const recent = [...agent.learning.recentRoundPnL, perAgentDelta].slice(-10);
            const recentAvg = recent.reduce((s, v) => s + v, 0) / Math.max(1, recent.length);
            const lr = 0.06 + agent.skillProfile.adaptation * 0.18;
            const direction = recentAvg >= 0 ? 1 : -1;

            agent.learning.rounds += 1;
            agent.learning.cumulativePnL += perAgentDelta;
            agent.learning.recentRoundPnL = recent;
            agent.learning.confidence = clamp(agent.learning.confidence + direction * lr * 0.08, 0.1, 0.95);

            agent.skillProfile.edgeScore = clamp(agent.skillProfile.edgeScore + direction * lr * 0.05, 0.35, 1.8);
            agent.skillProfile.riskAppetite = clamp(agent.skillProfile.riskAppetite + direction * lr * 0.03, 0.1, 0.9);
            agent.skillProfile.execution = clamp(agent.skillProfile.execution + direction * lr * 0.015, 0.2, 0.99);
            agent.skillProfile.researchDepth = clamp(agent.skillProfile.researchDepth + direction * lr * 0.012, 0.2, 0.99);
            agent.skillProfile.chartSkill = clamp(agent.skillProfile.chartSkill + direction * lr * 0.012, 0.2, 0.99);
        }
    }

    return {
        cell: { ...cell, portfolio },
        trades: allTrades,
        logs,
    };
}

// ---------------------------------------------------------------------------
// Cell ranking
// ---------------------------------------------------------------------------

/**
 * Rank cells by total PnL (descending).
 */
export function rankCells(cells: TradingCell[]): TradingCell[] {
    return [...cells].sort((a, b) => b.portfolio.totalPnL - a.portfolio.totalPnL);
}

/**
 * Check if a cell is in the spotlight (top N by PnL).
 */
export function isSpotlightCell(cell: TradingCell, rankedCells: TradingCell[]): boolean {
    const idx = rankedCells.findIndex((d) => d.id === cell.id);
    return idx >= 0 && idx < SPOTLIGHT_CELLS;
}

/**
 * Rank only active (non-eliminated) cells by total PnL.
 */
export function rankActiveCells(cells: TradingCell[]): TradingCell[] {
    return cells.filter(d => d.status !== 'eliminated')
        .sort((a, b) => b.portfolio.totalPnL - a.portfolio.totalPnL);
}

/**
 * Eliminate the bottom N cells for a given round per ELIMINATION_SCHEDULE.
 * Returns log entries for each elimination.
 */
export function eliminateCells(
    cells: TradingCell[],
    round: number,
): PnLLogEntry[] {
    const eliminateCount = ELIMINATION_SCHEDULE[round] ?? 0;
    if (eliminateCount === 0) return [];

    const active = rankActiveCells(cells);
    const toEliminate = active.slice(-eliminateCount);
    const logs: PnLLogEntry[] = [];

    for (const cell of toEliminate) {
        const realCell = cells.find(d => d.id === cell.id);
        if (realCell) {
            realCell.status = 'eliminated';
            realCell.eliminatedRound = round;
            logs.push(logEntry(round, 'round_end',
                `${realCell.name} CELL ELIMINATED (PnL: ${realCell.portfolio.totalPnL >= 0 ? '+' : ''}${realCell.portfolio.totalPnL.toFixed(2)} SOL)`,
                realCell.id));
        }
    }

    const remaining = cells.filter(d => d.status !== 'eliminated').length;
    logs.push(logEntry(round, 'system', `${eliminateCount} cell(s) eliminated. ${remaining} remain.`));

    return logs;
}

// ---------------------------------------------------------------------------
// Token history
// ---------------------------------------------------------------------------

export function recordTokenSnapshot(
    history: Record<string, TokenSnapshot[]>,
    tokens: PumpToken[],
): Record<string, TokenSnapshot[]> {
    const updated = { ...history };
    const now = Date.now();
    for (const token of tokens) {
        if (!updated[token.mint]) updated[token.mint] = [];
        updated[token.mint] = [...updated[token.mint], { mint: token.mint, priceSOL: token.priceSOL, timestamp: now }];
    }
    return updated;
}

// ---------------------------------------------------------------------------
// Log helpers
// ---------------------------------------------------------------------------

export function logEntry(
    round: number,
    type: PnLLogEntry['type'],
    message: string,
    cellId?: string,
): PnLLogEntry {
    return { timestamp: Date.now(), round, type, message, cellId };
}

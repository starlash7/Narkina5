// ============================================================================
// Narkina5 PnL Arena — Competition Engine
// 8 Trading Desks. 64 Agents. Virtual portfolios. Real token prices.
// Pure business logic / data layer. No React.
// ============================================================================

import { generateAgent, seededRandom } from './competition';
import type { Specialization } from './competition';
import {
    ROLE_FROM_SPEC,
    STARTING_CAPITAL,
    MAX_POSITION_PERCENT,
    SLIPPAGE_PERCENT,
    TOTAL_ROUNDS,
    DESKS_COUNT,
    AGENTS_PER_DESK,
    SPOTLIGHT_DESKS,
    CELL_NAMES,
    ELIMINATION_SCHEDULE,
} from './pnl-types';
import type {
    PnLAgent,
    PnLCompetitionState,
    PnLLogEntry,
    TradingDesk,
    Portfolio,
    Position,
    Trade,
    PumpToken,
    TokenSnapshot,
    TradeDecision,
    InvestmentRole,
} from './pnl-types';

// ---------------------------------------------------------------------------
// Role assignment pattern per desk (8 agents = 5 roles, some doubled)
// ---------------------------------------------------------------------------

const DESK_ROLE_PATTERN: InvestmentRole[] = [
    'Researcher', 'Researcher',
    'Analyst',
    'Strategist',
    'Trader', 'Trader',
    'RiskManager', 'RiskManager',
];

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
 * Execute a virtual buy on a desk portfolio.
 */
export function executeBuy(
    portfolio: Portfolio,
    token: PumpToken,
    amountSOL: number,
    agentId: string,
    agentRole: InvestmentRole,
    reasoning: string,
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
    } else {
        p.positions.push({
            tokenMint: token.mint,
            tokenSymbol: token.symbol,
            tokenName: token.name,
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
 * Execute a virtual sell on a desk portfolio.
 */
export function executeSell(
    portfolio: Portfolio,
    token: PumpToken,
    amountSOL: number,
    agentId: string,
    agentRole: InvestmentRole,
    reasoning: string,
): { portfolio: Portfolio; trade: Trade } {
    const pos = portfolio.positions.find((p) => p.tokenMint === token.mint);
    if (!pos || pos.quantity <= 0) {
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
// Agent & desk generation
// ---------------------------------------------------------------------------

/**
 * Generate 64 PnL agents organized into 8 desks.
 */
export function generatePnLAgents(): { agents: Record<string, PnLAgent>; desks: TradingDesk[] } {
    const agents: Record<string, PnLAgent> = {};
    const desks: TradingDesk[] = [];

    for (let deskIdx = 0; deskIdx < DESKS_COUNT; deskIdx++) {
        const deskId = `desk-${deskIdx}`;
        const deskAgentIds: string[] = [];

        for (let slot = 0; slot < AGENTS_PER_DESK; slot++) {
            const globalIndex = deskIdx * AGENTS_PER_DESK + slot;
            const base = generateAgent(globalIndex);
            const role = DESK_ROLE_PATTERN[slot];

            const pnlAgent: PnLAgent = {
                ...base,
                investmentRole: role,
                deskId,
                contribution: '',
            };

            agents[pnlAgent.id] = pnlAgent;
            deskAgentIds.push(pnlAgent.id);
        }

        desks.push({
            id: deskId,
            name: CELL_NAMES[deskIdx],
            deskIndex: deskIdx,
            agents: deskAgentIds,
            portfolio: emptyPortfolio(),
            status: 'pending',
            currentPhase: 'research',
            roundPnL: [],
        });
    }

    return { agents, desks };
}

// ---------------------------------------------------------------------------
// Competition initialization
// ---------------------------------------------------------------------------

export function initializePnLCompetition(): PnLCompetitionState {
    const { agents, desks } = generatePnLAgents();

    return {
        status: 'idle',
        currentRound: 1,
        totalRounds: TOTAL_ROUNDS,
        desks,
        agents,
        availableTokens: [],
        tokenHistory: {},
        winner: null,
        log: [
            {
                timestamp: Date.now(),
                round: 0,
                type: 'system',
                message: `PnL Arena initialized. ${DESKS_COUNT} trading desks, ${Object.keys(agents).length} agents. Awaiting market data...`,
            },
        ],
        apiCallsMade: 0,
    };
}

// ---------------------------------------------------------------------------
// Simulation scoring (for non-spotlight desks)
// ---------------------------------------------------------------------------

/**
 * Simulate a trading round for a desk (no AI, deterministic).
 * Returns trade decisions based on seeded random.
 */
export function simulateDeskTrades(
    desk: TradingDesk,
    agents: Record<string, PnLAgent>,
    tokens: PumpToken[],
    round: number,
): TradeDecision[] {
    if (tokens.length === 0) return [];

    const decisions: TradeDecision[] = [];
    const seed = desk.deskIndex * 997 + round * 31;

    // Simulate: buy 2-3 tokens, maybe sell 1 position
    const buyCount = 2 + Math.floor(seededRandom(seed) * 2); // 2-3 buys

    for (let i = 0; i < buyCount && i < tokens.length; i++) {
        const tokenIdx = Math.floor(seededRandom(seed + i * 13 + 7) * tokens.length);
        const token = tokens[tokenIdx];
        const spendPercent = 0.05 + seededRandom(seed + i * 17 + 3) * 0.15; // 5-20%
        const spendSOL = desk.portfolio.cashSOL * spendPercent;

        if (spendSOL > 0.1) {
            decisions.push({
                side: 'buy',
                mint: token.mint,
                symbol: token.symbol,
                amountSOL: spendSOL,
                reasoning: `Simulated buy: ${token.symbol} looks promising`,
            });
        }
    }

    // Maybe sell a position
    if (desk.portfolio.positions.length > 0 && seededRandom(seed + 99) > 0.5) {
        const posIdx = Math.floor(seededRandom(seed + 101) * desk.portfolio.positions.length);
        const pos = desk.portfolio.positions[posIdx];
        const sellPercent = 0.3 + seededRandom(seed + 103) * 0.7; // 30-100%
        decisions.push({
            side: 'sell',
            mint: pos.tokenMint,
            symbol: pos.tokenSymbol,
            amountSOL: pos.quantity * pos.currentPrice * sellPercent,
            reasoning: `Simulated sell: taking profits on ${pos.tokenSymbol}`,
        });
    }

    return decisions;
}

/**
 * Apply trade decisions to a desk portfolio.
 */
export function applyTrades(
    desk: TradingDesk,
    decisions: TradeDecision[],
    tokens: PumpToken[],
    agents: Record<string, PnLAgent>,
): { desk: TradingDesk; trades: Trade[]; logs: PnLLogEntry[] } {
    const tokenMap = new Map(tokens.map((t) => [t.mint, t]));
    let portfolio = { ...desk.portfolio };
    const allTrades: Trade[] = [];
    const logs: PnLLogEntry[] = [];

    // Pick a trader agent from the desk for attribution
    const traderAgent = desk.agents
        .map((id) => agents[id])
        .find((a) => a.investmentRole === 'Trader');
    const agentId = traderAgent?.id || desk.agents[0];
    const agentRole: InvestmentRole = traderAgent?.investmentRole || 'Trader';

    for (const decision of decisions) {
        const token = tokenMap.get(decision.mint);
        if (!token) continue;

        if (decision.side === 'buy') {
            const result = executeBuy(portfolio, token, decision.amountSOL, agentId, agentRole, decision.reasoning);
            portfolio = result.portfolio;
            if (result.trade.quantity > 0) {
                allTrades.push(result.trade);
                logs.push({
                    timestamp: Date.now(),
                    round: 0,
                    deskId: desk.id,
                    type: 'trade',
                    message: `${desk.name} BUY ${decision.amountSOL.toFixed(2)} SOL of $${decision.symbol}`,
                });
            }
        } else {
            const result = executeSell(portfolio, token, decision.amountSOL, agentId, agentRole, decision.reasoning);
            portfolio = result.portfolio;
            if (result.trade.quantity > 0) {
                allTrades.push(result.trade);
                logs.push({
                    timestamp: Date.now(),
                    round: 0,
                    deskId: desk.id,
                    type: 'trade',
                    message: `${desk.name} SELL $${decision.symbol} for ${result.trade.totalSOL.toFixed(2)} SOL`,
                });
            }
        }
    }

    return {
        desk: { ...desk, portfolio },
        trades: allTrades,
        logs,
    };
}

// ---------------------------------------------------------------------------
// Desk ranking
// ---------------------------------------------------------------------------

/**
 * Rank desks by total PnL (descending).
 */
export function rankDesks(desks: TradingDesk[]): TradingDesk[] {
    return [...desks].sort((a, b) => b.portfolio.totalPnL - a.portfolio.totalPnL);
}

/**
 * Check if a desk is in the spotlight (top N by PnL).
 */
export function isSpotlightDesk(desk: TradingDesk, rankedDesks: TradingDesk[]): boolean {
    const idx = rankedDesks.findIndex((d) => d.id === desk.id);
    return idx >= 0 && idx < SPOTLIGHT_DESKS;
}

/**
 * Rank only active (non-eliminated) desks by total PnL.
 */
export function rankActiveDesks(desks: TradingDesk[]): TradingDesk[] {
    return desks.filter(d => d.status !== 'eliminated')
        .sort((a, b) => b.portfolio.totalPnL - a.portfolio.totalPnL);
}

/**
 * Eliminate the bottom N desks for a given round per ELIMINATION_SCHEDULE.
 * Returns log entries for each elimination.
 */
export function eliminateDesks(
    desks: TradingDesk[],
    round: number,
): PnLLogEntry[] {
    const eliminateCount = ELIMINATION_SCHEDULE[round] ?? 0;
    if (eliminateCount === 0) return [];

    const active = rankActiveDesks(desks);
    const toEliminate = active.slice(-eliminateCount);
    const logs: PnLLogEntry[] = [];

    for (const desk of toEliminate) {
        const realDesk = desks.find(d => d.id === desk.id);
        if (realDesk) {
            realDesk.status = 'eliminated';
            realDesk.eliminatedRound = round;
            logs.push(logEntry(round, 'round_end',
                `${realDesk.name} ELIMINATED (PnL: ${realDesk.portfolio.totalPnL >= 0 ? '+' : ''}${realDesk.portfolio.totalPnL.toFixed(2)} SOL)`,
                realDesk.id));
        }
    }

    const remaining = desks.filter(d => d.status !== 'eliminated').length;
    logs.push(logEntry(round, 'system', `${eliminateCount} desk(s) eliminated. ${remaining} remain.`));

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
    deskId?: string,
): PnLLogEntry {
    return { timestamp: Date.now(), round, type, message, deskId };
}

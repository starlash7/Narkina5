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
 * Execute a virtual sell on a cell portfolio.
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
                contribution: '',
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
    _agents: Record<string, PnLAgent>,
    tokens: PumpToken[],
    round: number,
): TradeDecision[] {
    if (tokens.length === 0) return [];

    const decisions: TradeDecision[] = [];
    const seed = cell.cellIndex * 997 + round * 31;

    // Simulate: buy 2-3 tokens, maybe sell 1 position
    const buyCount = 2 + Math.floor(seededRandom(seed) * 2); // 2-3 buys

    for (let i = 0; i < buyCount && i < tokens.length; i++) {
        const tokenIdx = Math.floor(seededRandom(seed + i * 13 + 7) * tokens.length);
        const token = tokens[tokenIdx];
        const spendPercent = 0.05 + seededRandom(seed + i * 17 + 3) * 0.15; // 5-20%
        const spendSOL = cell.portfolio.cashSOL * spendPercent;

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
    if (cell.portfolio.positions.length > 0 && seededRandom(seed + 99) > 0.5) {
        const posIdx = Math.floor(seededRandom(seed + 101) * cell.portfolio.positions.length);
        const pos = cell.portfolio.positions[posIdx];
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
 * Apply trade decisions to a cell portfolio.
 */
export function applyTrades(
    cell: TradingCell,
    decisions: TradeDecision[],
    tokens: PumpToken[],
    agents: Record<string, PnLAgent>,
): { cell: TradingCell; trades: Trade[]; logs: PnLLogEntry[] } {
    const tokenMap = new Map(tokens.map((t) => [t.mint, t]));
    let portfolio = { ...cell.portfolio };
    const allTrades: Trade[] = [];
    const logs: PnLLogEntry[] = [];

    // Pick a trader agent from the cell for attribution
    const traderAgent = cell.agents
        .map((id) => agents[id])
        .find((a) => a.investmentRole === 'Trader');
    const agentId = traderAgent?.id || cell.agents[0];
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
                    cellId: cell.id,
                    type: 'trade',
                    message: `${cell.name} BUY ${decision.amountSOL.toFixed(2)} SOL of $${decision.symbol}`,
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
                    cellId: cell.id,
                    type: 'trade',
                    message: `${cell.name} SELL $${decision.symbol} for ${result.trade.totalSOL.toFixed(2)} SOL`,
                });
            }
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

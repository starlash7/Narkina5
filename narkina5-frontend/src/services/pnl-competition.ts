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

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
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
    const jitter = seededRandom((cellIdx + 1) * 97 + (slot + 1) * 31) - 0.5;
    const cellBias = seededRandom((cellIdx + 1) * 191) - 0.5;

    return {
        doctrine,
        riskAppetite: clamp(base.risk + jitter * 0.18 + cellBias * 0.1, 0.12, 0.9),
        execution: clamp(base.exec + jitter * 0.14, 0.2, 0.96),
        researchDepth: clamp(base.research + jitter * 0.16, 0.2, 0.98),
        chartSkill: clamp(base.chart + jitter * 0.16, 0.2, 0.98),
        adaptation: clamp(base.adapt + jitter * 0.12, 0.2, 0.98),
        edgeScore: clamp(0.88 + cellBias * 0.16 + jitter * 0.1, 0.45, 1.25),
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
                contribution: '',
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
    const cellAgents = cell.agents.map((id) => agents[id]).filter((a): a is PnLAgent => !!a);
    const totalWeight = Math.max(1, cellAgents.length);
    const avgRisk = cellAgents.reduce((s, a) => s + a.skillProfile.riskAppetite, 0) / totalWeight;
    const avgExecution = cellAgents.reduce((s, a) => s + a.skillProfile.execution, 0) / totalWeight;
    const avgResearch = cellAgents.reduce((s, a) => s + a.skillProfile.researchDepth, 0) / totalWeight;
    const avgConfidence = cellAgents.reduce((s, a) => s + a.learning.confidence, 0) / totalWeight;

    const scoredTokens = tokens
        .map((token) => {
            const weighted = cellAgents.reduce((score, agent) => {
                const doctrineWeighted = doctrineScore(token, agent.skillProfile.doctrine) * agent.skillProfile.edgeScore;
                const skillBoost = agent.skillProfile.chartSkill * 0.3 + agent.skillProfile.researchDepth * 0.25;
                return score + doctrineWeighted + skillBoost;
            }, 0) / totalWeight;

            return { token, score: weighted };
        })
        .sort((a, b) => b.score - a.score);

    const tradableTokens = scoredTokens.slice(0, 14).map((x) => x.token);
    const buyCount = avgExecution > 0.7 ? 2 : 1;
    const used = new Set<string>();

    for (let i = 0; i < buyCount && i < tradableTokens.length; i++) {
        const tokenIdx = Math.floor(seededRandom(seed + i * 13 + 7) * Math.min(6, tradableTokens.length));
        const token = tradableTokens[tokenIdx];
        if (used.has(token.mint)) continue;
        used.add(token.mint);
        const spendPercent = clamp(
            0.025 + avgRisk * 0.06 + avgConfidence * 0.02 + seededRandom(seed + i * 17 + 3) * 0.025,
            0.02,
            0.11,
        );
        const spendSOL = cell.portfolio.cashSOL * spendPercent;

        if (spendSOL > 0.1) {
            decisions.push({
                side: 'buy',
                mint: token.mint,
                symbol: token.symbol,
                amountSOL: spendSOL,
                reasoning: `Composite signal buy (${token.symbol}) from ${cell.name}: doctrine blend + chart/research confidence`,
            });
        }
    }

    // Maybe sell an eligible position (respect minimum hold)
    const sellablePositions = cell.portfolio.positions.filter(
        (pos) => round - (pos.entryRound ?? round) >= MIN_HOLD_ROUNDS,
    );
    const holdBias = clamp(0.82 - avgRisk * 0.2 - avgConfidence * 0.1 + avgResearch * 0.08, 0.55, 0.9);
    if (sellablePositions.length > 0 && seededRandom(seed + 99) > holdBias) {
        const posIdx = Math.floor(seededRandom(seed + 101) * sellablePositions.length);
        const pos = sellablePositions[posIdx];
        const sellPercent = clamp(0.2 + (1 - avgConfidence) * 0.35 + seededRandom(seed + 103) * 0.2, 0.2, 0.7);
        decisions.push({
            side: 'sell',
            mint: pos.tokenMint,
            symbol: pos.tokenSymbol,
            amountSOL: pos.quantity * pos.currentPrice * sellPercent,
            reasoning: `Risk rebalance sell (${pos.tokenSymbol}): confidence/hold rule triggered`,
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
    round: number,
): { cell: TradingCell; trades: Trade[]; logs: PnLLogEntry[] } {
    const tokenMap = new Map(tokens.map((t) => [t.mint, t]));
    let portfolio = { ...cell.portfolio };
    const prevPnL = cell.portfolio.totalPnL;
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
            const result = executeBuy(portfolio, token, decision.amountSOL, agentId, agentRole, decision.reasoning, round);
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
            const result = executeSell(portfolio, token, decision.amountSOL, agentId, agentRole, decision.reasoning, round);
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

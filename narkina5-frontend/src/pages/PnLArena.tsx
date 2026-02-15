import { useState, useCallback, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { Connection } from '@solana/web3.js';
import { useNavigate } from 'react-router-dom';
import { useSolana } from '../contexts/SolanaContext';
import {
    initializePnLCompetition,
    simulateCellTrades,
    applyTrades,
    updatePortfolioPrices,
    rankActiveCells,
    eliminateCells,
    isSpotlightCell,
    recordTokenSnapshot,
    logEntry,
} from '../services/pnl-competition';
import { fetchTrendingTokens, refreshPrices } from '../services/pnl-market';
import {
    ROLE_COLORS,
    ROLE_LABELS,
    TOTAL_ROUNDS,
    TOTAL_FLOORS,
    TOTAL_AGENTS,
    CELLS_COUNT,
    FLOOR_BRACKET,
    ELIMINATION_SCHEDULE,
    MAX_POSITION_PERCENT,
    SEASON_DURATION_DAYS,
    MAX_GRADUATIONS_PER_SEASON,
    RELAX_GATE_AFTER_SEASONS,
} from '../services/pnl-types';
import type {
    PnLCompetitionState,
    PnLAgent,
    TradingCell,
    PnLLogEntry,
    PumpToken,
    TradeDecision,
    InvestmentRole,
} from '../services/pnl-types';
import {
    uploadMetadata,
    generateMintKeypair,
    buildCreateTokenTx,
    signWithMintKeypair,
    generateTokenDescription,
    getPumpfunUrl,
    saveGraduatedAgent,
    getGraduatedAgents,
} from '../services/pumpfun';
import { TrendUpIcon, TrendDownIcon, DollarIcon, TradeIcon, ExternalLinkIcon } from '../components/Icons';

type GradStatus = 'idle' | 'uploading' | 'building' | 'signing' | 'confirming' | 'success' | 'error';
type PnLArenaMode = 'overview' | 'live';
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
const CELLS_PER_PAGE = 8;
const SEASON_MS = SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000;
const WEEK_MS = SEASON_MS;
const GRAD_MIN_PNL_SOL = 10;
const GRAD_RELAXED_MIN_PNL_SOL = 8;
const GRAD_MAX_DRAWDOWN_PERCENT = 15;
const GRAD_MIN_CONSISTENCY_PERCENT = 55;
const GRAD_MAX_WEEKLY = MAX_GRADUATIONS_PER_SEASON;
const GRAD_RELAX_AFTER_WEEKS = RELAX_GATE_AFTER_SEASONS;

interface GraduationGateResult {
    eligible: boolean;
    minPnlRequired: number;
    consistencyPercent: number;
    riskViolations: number;
    weeklyGraduations: number;
    weeksSinceLastGraduation: number;
    checks: {
        pnl: boolean;
        drawdown: boolean;
        consistency: boolean;
        risk: boolean;
        weeklySlot: boolean;
    };
    reasons: string[];
}

function getFloorFromRound(round: number, complete: boolean): number {
    if (complete) return TOTAL_FLOORS;
    return Math.max(1, Math.min(round, TOTAL_FLOORS));
}

// ── Styles ──────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
    background: 'rgba(26, 26, 26, 0.42)',
    border: '1px solid rgba(255,107,53,0.15)',
    borderRadius: 12,
    padding: '1rem',
    backdropFilter: 'blur(10px)',
};

const panelTitle: React.CSSProperties = {
    fontSize: '0.74rem',
    fontWeight: 600,
    color: '#e5e5e5',
    marginBottom: '0.75rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid rgba(255,107,53,0.15)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.16em',
};

// ── Component ───────────────────────────────────────────

export function PnLArena({ mode = 'overview' }: { mode?: PnLArenaMode }) {
    const { authenticated, login } = usePrivy();
    const { wallets } = useWallets();
    const { signTransaction } = useSignTransaction();
    const { publicKey } = useSolana();
    const navigate = useNavigate();
    const isOverviewRoute = mode === 'overview';
    const isLiveRoute = mode === 'live';

    const [comp, setComp] = useState<PnLCompetitionState | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);
    const [selectedCell, setSelectedCell] = useState<string | null>(null);
    const [expandedCell, setExpandedCell] = useState<string | null>(null);
    const [cellPage, setCellPage] = useState(1);

    // Graduation
    const [gradStatus, setGradStatus] = useState<GradStatus>('idle');
    const [gradError, setGradError] = useState<string | null>(null);
    const [gradResult, setGradResult] = useState<{ mintAddress: string; pumpfunUrl: string } | null>(null);

    const logRef = useRef<HTMLDivElement>(null);
    const autoPlayRef = useRef(autoPlay);
    autoPlayRef.current = autoPlay;

    // Auto-scroll log
    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [comp?.log.length]);

    // Auto-play timer
    useEffect(() => {
        if (!autoPlay || !comp || comp.status === 'complete' || isRunning) return;
        const timer = setTimeout(() => {
            if (autoPlayRef.current) runRound();
        }, 3000);
        return () => clearTimeout(timer);
    }, [autoPlay, comp?.currentRound, isRunning]);

    // ── Initialize ──────────────────────────────────────
    const handleInit = useCallback(async () => {
        const state = initializePnLCompetition();
        state.status = 'loading_tokens';
        setComp(state);

        try {
            const tokens = await fetchTrendingTokens();
            const updated = structuredClone(state);
            updated.availableTokens = tokens;
            updated.tokenHistory = recordTokenSnapshot({}, tokens);
            updated.status = 'running';
            updated.log.push(logEntry(0, 'system', `Loaded ${tokens.length} trending Solana tokens. Trading begins!`));
            setComp(updated);
        } catch (err) {
            const updated = structuredClone(state);
            updated.status = 'running';
            // Generate mock tokens if API fails
            updated.availableTokens = generateMockTokens();
            updated.log.push(logEntry(0, 'system', 'Using simulated market data (API unavailable).'));
            setComp(updated);
        }
    }, []);

    useEffect(() => {
        if (isLiveRoute && !comp && !isRunning) {
            void handleInit();
        }
    }, [isLiveRoute, comp, isRunning, handleInit]);

    // ── Run a single trading round ──────────────────────
    const runRound = useCallback(async () => {
        if (!comp || isRunning || comp.status === 'complete') return;
        setIsRunning(true);

        const state = structuredClone(comp);

        // Refresh token prices
        try {
            state.availableTokens = await refreshPrices(state.availableTokens);
        } catch {
            // Keep existing prices if refresh fails
        }
        state.tokenHistory = recordTokenSnapshot(state.tokenHistory, state.availableTokens);

        const round = state.currentRound;
        state.log.push(logEntry(round, 'system', `--- Floor ${round}/${TOTAL_FLOORS} ---`));

        // Price map for portfolio updates
        const priceMap: Record<string, number> = {};
        for (const t of state.availableTokens) priceMap[t.mint] = t.priceSOL;

        // Rank active cells for spotlight determination
        const ranked = rankActiveCells(state.cells);

        for (let i = 0; i < state.cells.length; i++) {
            const cell = state.cells[i];
            if (cell.status === 'eliminated') continue;
            cell.status = 'trading';

            // Update existing positions with current prices
            cell.portfolio = updatePortfolioPrices(cell.portfolio, priceMap);

            // Generate trade decisions
            let decisions: TradeDecision[];

            if (isSpotlightCell(cell, ranked) && state.availableTokens.length > 0) {
                // Spotlight cells: use real AI
                try {
                    decisions = await fetchAITrades(cell, state.agents, state.availableTokens, round);
                    state.apiCallsMade += 2; // researcher + trader calls
                    state.log.push(logEntry(round, 'research', `${cell.name} AI analysis complete`, cell.id));
                } catch {
                    decisions = simulateCellTrades(cell, state.agents, state.availableTokens, round);
                }
            } else {
                // Non-spotlight: simulation
                decisions = simulateCellTrades(cell, state.agents, state.availableTokens, round);
            }

            // Apply trades
            const result = applyTrades(cell, decisions, state.availableTokens, state.agents, round);
            state.cells[i] = { ...result.cell, status: 'complete' };

            // Update portfolio with current prices after trades
            state.cells[i].portfolio = updatePortfolioPrices(state.cells[i].portfolio, priceMap);
            state.cells[i].roundPnL.push(state.cells[i].portfolio.totalPnL);

            // Add trade logs
            for (const log of result.logs) {
                log.round = round;
                state.log.push(log);
            }
        }

        // PnL update log
        const finalRanked = rankActiveCells(state.cells);
        const top = finalRanked[0];
        state.log.push(logEntry(round, 'pnl_update',
            `Floor ${round} leader: ${top.name} (PnL: ${top.portfolio.totalPnL >= 0 ? '+' : ''}${top.portfolio.totalPnL.toFixed(2)} SOL)`));

        // Elimination
        const elimLogs = eliminateCells(state.cells, round);
        state.log.push(...elimLogs);

        // Advance round or complete
        const remaining = state.cells.filter(d => d.status !== 'eliminated');
        if (round >= TOTAL_ROUNDS || remaining.length <= 1) {
            state.status = 'complete';
            state.currentRound = TOTAL_ROUNDS;
            const champion = rankActiveCells(state.cells)[0];
            state.winner = champion.id;
            state.log.push(logEntry(round, 'graduation',
                `Competition complete! Champion: ${champion.name} with ${champion.portfolio.totalPnL >= 0 ? '+' : ''}${champion.portfolio.totalPnL.toFixed(2)} SOL PnL`));
        } else {
            state.currentRound++;
        }

        setComp(state);
        setIsRunning(false);
    }, [comp, isRunning]);

    // ── AI trade fetching ───────────────────────────────
    async function fetchAITrades(
        cell: TradingCell,
        agents: Record<string, PnLAgent>,
        tokens: PumpToken[],
        round: number,
    ): Promise<TradeDecision[]> {
        const tokenData = tokens.slice(0, 10).map(t => ({
            mint: t.mint,
            symbol: t.symbol,
            name: t.name,
            priceSOL: t.priceSOL,
            volume24h: t.volume24h,
            priceChange24h: t.priceChange24h,
            marketCapSOL: t.marketCapSOL,
        }));

        const portfolioData = {
            cashSOL: cell.portfolio.cashSOL,
            positions: cell.portfolio.positions.map(p => ({
                tokenMint: p.tokenMint,
                tokenSymbol: p.tokenSymbol,
                quantity: p.quantity,
                avgEntryPrice: p.avgEntryPrice,
                currentPrice: p.currentPrice,
            })),
        };

        // Call researcher first, then trader
        const researcher = cell.agents.map(id => agents[id]).find(a => a.investmentRole === 'Researcher');
        const trader = cell.agents.map(id => agents[id]).find(a => a.investmentRole === 'Trader');

        let researchContext = '';

        // Researcher call
        if (researcher) {
            try {
                const res = await fetch('/api/pnl-agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role: 'Researcher',
                        agentName: researcher.name,
                        cellName: cell.name,
                        deskName: cell.name,
                        round,
                        tokens: tokenData,
                        portfolio: portfolioData,
                    }),
                });
                const data = await res.json();
                if (data.output) {
                    researchContext = JSON.stringify(data.output);
                    researcher.contribution = data.raw || '';
                }
            } catch { /* fall through */ }
        }

        // Trader call
        if (trader) {
            try {
                const res = await fetch('/api/pnl-agent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role: 'Trader',
                        agentName: trader.name,
                        cellName: cell.name,
                        deskName: cell.name,
                        round,
                        tokens: tokenData,
                        portfolio: portfolioData,
                        context: researchContext,
                    }),
                });
                const data = await res.json();
                if (data.output && Array.isArray(data.output)) {
                    trader.contribution = data.raw || '';
                    return data.output as TradeDecision[];
                }
            } catch { /* fall through */ }
        }

        // Fallback to simulation
        return simulateCellTrades(cell, agents, tokens, round);
    }

    // ── Graduation ──────────────────────────────────────
    const handleGraduate = useCallback(async (cell: TradingCell) => {
        if (!comp) return;

        if (!authenticated || !publicKey || !wallets[0]) {
            login();
            return;
        }

        const bestAgent = cell.agents
            .map(id => comp?.agents[id])
            .filter((a): a is PnLAgent => !!a)
            .sort((a, b) => (b.investmentRole === 'Strategist' ? 1 : 0) - (a.investmentRole === 'Strategist' ? 1 : 0))[0];

        if (!bestAgent) return;
        const gate = evaluateGraduationGate(cell);
        if (!gate.eligible) {
            setGradStatus('error');
            setGradError(`Graduation gate not met: ${gate.reasons.join(' | ')}`);
            return;
        }

        setGradStatus('uploading');
        setGradError(null);

        try {
            const tokenName = `${cell.name} Cell`;
            const tokenSymbol = toCellSymbol(cell.name);
            const composition = buildCellComposition(cell, comp.agents);
            const description = generateTokenDescription({
                name: tokenName,
                symbol: tokenSymbol,
                description: `PnL Arena Champion Cell | ${cell.portfolio.totalPnL >= 0 ? '+' : ''}${cell.portfolio.totalPnL.toFixed(2)} SOL PnL\n\n${composition}`,
                specialization: bestAgent.specialization,
                trustScore: 100,
            });
            const metadataUri = await uploadMetadata(
                tokenName,
                tokenSymbol,
                description,
                bestAgent.specialization,
            );

            setGradStatus('building');
            const mintKeypair = generateMintKeypair();
            const mintPub = mintKeypair.publicKey.toBase58();
            const unsignedTx = await buildCreateTokenTx(
                publicKey.toBase58(),
                mintPub,
                metadataUri,
                tokenName,
                tokenSymbol,
            );

            setGradStatus('signing');
            const mintSigned = signWithMintKeypair(unsignedTx, mintKeypair);
            const wallet = wallets.find(w => w.address === publicKey.toBase58()) ?? wallets[0];
            if (!wallet) throw new Error('No wallet connected');
            const { signedTransaction } = await signTransaction({
                transaction: mintSigned,
                wallet,
                chain: 'solana:devnet',
            });

            setGradStatus('confirming');
            const connection = new Connection(MAINNET_RPC, 'confirmed');
            const sig = await connection.sendRawTransaction(signedTransaction, { skipPreflight: true, maxRetries: 3 });
            await connection.confirmTransaction(sig, 'confirmed');

            const pumpfunUrl = getPumpfunUrl(mintPub);
            saveGraduatedAgent({ name: tokenName, symbol: tokenSymbol, specialization: bestAgent.specialization, mintAddress: mintPub, pumpfunUrl, graduatedAt: Date.now(), trustScore: 100 });

            setGradStatus('success');
            setGradResult({ mintAddress: mintPub, pumpfunUrl });
        } catch (err) {
            setGradStatus('error');
            setGradError(err instanceof Error ? err.message : 'Graduation failed');
        }
    }, [authenticated, publicKey, wallets, comp, login, signTransaction]);

    // ── Reset ───────────────────────────────────────────
    const handleReset = useCallback(() => {
        setComp(null);
        setAutoPlay(false);
        setSelectedCell(null);
        setExpandedCell(null);
        setCellPage(1);
        setGradStatus('idle');
        setGradResult(null);
        navigate('/pnl-arena');
    }, [navigate]);

    // ── Render ──────────────────────────────────────────

    if (isOverviewRoute) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
                        linear-gradient(rgba(255, 107, 53, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 107, 53, 0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '58px 58px',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute',
                    top: '-20%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '56rem',
                    height: '56rem',
                    background: 'radial-gradient(circle, rgba(255,107,53,0.09) 0%, rgba(239,68,68,0.04) 42%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                <div style={{
                    position: 'relative',
                    maxWidth: 920,
                    margin: '0 auto',
                    padding: '4.5rem 1.5rem',
                    textAlign: 'center',
                }}>
                    <div style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        letterSpacing: '0.34em',
                        color: '#ef4444',
                        textTransform: 'uppercase',
                        marginBottom: '1rem',
                    }}>
                        NARKINA5 PNL FACILITY
                    </div>

                    <h1 style={{
                        fontSize: '3rem',
                        fontWeight: 700,
                        margin: '0 0 0.5rem 0',
                        background: 'linear-gradient(135deg, #ff6b35, #ef4444)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        letterSpacing: '0.08em',
                    }}>
                        PnL Arena
                    </h1>

                    <p style={{
                        fontSize: '1.1rem',
                        color: '#9ca3af',
                        margin: '1rem 0 2.25rem 0',
                        lineHeight: 1.75,
                        maxWidth: 600,
                        marginLeft: 'auto',
                        marginRight: 'auto',
                    }}>
                        {TOTAL_AGENTS} AI agents enter {CELLS_COUNT} trading cells.<br />
                        Every floor cuts the field in half.<br />
                        <span style={{ color: '#22c55e', fontWeight: 500 }}>One survivor graduates to Pump.fun.</span>
                    </p>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        alignItems: 'center',
                        marginBottom: '2.25rem',
                    }}>
                        {[...FLOOR_BRACKET].reverse().map((floor) => {
                            const widthPercent = 26 + (TOTAL_FLOORS - floor.floor) * 11;
                            return (
                                <div key={floor.floor} style={{
                                    width: `${widthPercent}%`,
                                    padding: '0.55rem 0.9rem',
                                    borderRadius: '0.4rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    border: '1px solid rgba(255,107,53,0.2)',
                                    background: 'rgba(255,107,53,0.08)',
                                    color: '#ffb08f',
                                    fontSize: '0.68rem',
                                }}>
                                    <span style={{ fontWeight: 600 }}>F{floor.floor}</span>
                                    <span style={{ opacity: 0.85 }}>
                                        {floor.agents} agents · {floor.cells} cells
                                    </span>
                                </div>
                            );
                        })}
                        <div style={{
                            width: '22%',
                            padding: '0.55rem 0.9rem',
                            borderRadius: '0.4rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            color: '#22c55e',
                            border: '1px solid rgba(34,197,94,0.3)',
                            background: 'rgba(34,197,94,0.08)',
                            boxShadow: '0 0 20px rgba(34,197,94,0.12)',
                        }}>
                            1 SURVIVOR
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '2rem',
                        marginBottom: '2.25rem',
                        flexWrap: 'wrap',
                    }}>
                        {[
                            { value: String(TOTAL_AGENTS), label: 'Agents' },
                            { value: String(TOTAL_FLOORS), label: 'Floors' },
                            { value: String(CELLS_COUNT), label: 'Cells' },
                            { value: '1', label: 'Survivor' },
                        ].map((stat) => (
                            <div key={stat.label} style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontSize: '1.75rem',
                                    fontWeight: 700,
                                    color: '#ff6b35',
                                    lineHeight: 1,
                                }}>
                                    {stat.value}
                                </div>
                                <div style={{
                                    fontSize: '0.65rem',
                                    color: '#6b7280',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    marginTop: '0.25rem',
                                }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.75rem',
                        marginBottom: '2.25rem',
                        textAlign: 'left',
                    }}>
                        {[
                            {
                                step: '01',
                                title: 'TRADE',
                                desc: 'Each cell runs a virtual portfolio using real pump.fun market prices and role-based AI decisions.',
                            },
                            {
                                step: '02',
                                title: 'ELIMINATE',
                                desc: 'Bottom cells are cut every floor. The bracket shrinks from 64 cells to 1 final survivor.',
                            },
                            {
                                step: '03',
                                title: 'GRADUATE',
                                desc: 'Champion cell launches a real token on Pump.fun through on-chain wallet signing.',
                            },
                        ].map((item) => (
                            <div key={item.step} style={{
                                padding: '1.2rem',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(255,107,53,0.12)',
                                background: 'rgba(26,26,26,0.42)',
                            }}>
                                <span style={{
                                    fontSize: '1.45rem',
                                    fontWeight: 200,
                                    color: 'rgba(255,107,53,0.25)',
                                    display: 'block',
                                    marginBottom: '0.45rem',
                                }}>
                                    {item.step}
                                </span>
                                <div style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: '#ff6b35',
                                    letterSpacing: '0.08em',
                                    marginBottom: '0.35rem',
                                }}>
                                    {item.title}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.5 }}>
                                    {item.desc}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button onClick={() => navigate('/pnl-arena/live')} style={{
                        fontFamily: 'inherit',
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: '#0a0a0a',
                        background: 'linear-gradient(135deg, #ff6b35, #ef4444)',
                        border: 'none',
                        padding: '1rem 2.8rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        boxShadow: '0 0 36px rgba(255, 107, 53, 0.32)',
                        letterSpacing: '0.08em',
                    }}>
                        ENTER LIVE 512-AGENT ARENA
                    </button>
                    <p style={{ fontSize: '0.65rem', color: '#4b5563', marginTop: '0.7rem' }}>
                        No wallet required to watch. Connect wallet only to graduate the champion.
                    </p>
                </div>
            </div>
        );
    }

    if (!comp && isLiveRoute) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
            }}>
                <div style={{
                    ...panelStyle,
                    textAlign: 'center',
                    maxWidth: 520,
                    width: '100%',
                }}>
                    <h2 style={{ margin: '0 0 0.6rem 0', color: '#ff6b35', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Initializing Arena
                    </h2>
                    <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem' }}>
                        Loading cells, agents, and live market data.
                    </p>
                </div>
            </div>
        );
    }

    if (!comp) return null;

    // Active cells ranked by PnL, then eliminated cells at the end
    const activeRanked = rankActiveCells(comp.cells);
    const eliminatedCells = comp.cells.filter(d => d.status === 'eliminated').sort((a, b) => (b.eliminatedRound ?? 0) - (a.eliminatedRound ?? 0));
    const ranked = [...activeRanked, ...eliminatedCells];
    const winnerCell = comp.winner ? comp.cells.find(d => d.id === comp.winner) : null;
    const winnerGate = winnerCell ? evaluateGraduationGate(winnerCell) : null;
    const currentFloor = getFloorFromRound(comp.currentRound, comp.status === 'complete');
    const eliminationCount = ELIMINATION_SCHEDULE[comp.currentRound] ?? 0;
    const totalCellPages = Math.max(1, Math.ceil(ranked.length / CELLS_PER_PAGE));
    const visiblePage = Math.min(cellPage, totalCellPages);
    const pageStart = (visiblePage - 1) * CELLS_PER_PAGE;
    const pageEnd = Math.min(pageStart + CELLS_PER_PAGE, ranked.length);
    const pagedCells = ranked.slice(pageStart, pageEnd);
    const leaderboardCells = ranked.slice(0, 20);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `
                    linear-gradient(rgba(255, 107, 53, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 107, 53, 0.03) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute',
                top: '-20%',
                right: '-10%',
                width: '40rem',
                height: '40rem',
                background: 'radial-gradient(circle, rgba(255, 107, 53, 0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '2.5rem 1.5rem', position: 'relative' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 style={{ fontSize: '1.85rem', fontWeight: 300, color: '#ff6b35', letterSpacing: '0.08em', margin: 0, textTransform: 'uppercase' }}>PnL Arena</h1>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                            Floor {currentFloor}/{TOTAL_FLOORS} | {comp.cells.filter(d => d.status !== 'eliminated').length}/{CELLS_COUNT} cells alive | {comp.apiCallsMade} AI calls
                        </span>
                        {eliminationCount > 0 && comp.status !== 'complete' && (
                            <span style={{ color: '#ef4444', fontSize: '0.7rem' }}>
                                {eliminationCount} cell(s) will be eliminated after this floor
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ color: '#9ca3af', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={autoPlay} onChange={e => setAutoPlay(e.target.checked)}
                            disabled={comp.status === 'complete'} />
                        Auto
                    </label>
                    <button onClick={runRound} disabled={isRunning || comp.status === 'complete' || comp.status === 'loading_tokens'}
                        style={{
                            background: isRunning ? '#333' : '#ff6b35', color: '#fff', border: 'none',
                            borderRadius: 6, padding: '0.4rem 1rem', fontSize: '0.85rem', cursor: isRunning ? 'not-allowed' : 'pointer',
                        }}>
                        {isRunning ? 'Trading...' : comp.status === 'loading_tokens' ? 'Loading...' : 'Run Floor'}
                    </button>
                    <button onClick={handleReset} style={{
                        background: 'transparent', color: '#9ca3af', border: '1px solid #333',
                        borderRadius: 6, padding: '0.4rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer',
                    }}>
                        Reset
                    </button>
                </div>
            </div>

            <div style={{
                ...panelStyle,
                padding: '0.6rem',
                marginBottom: '1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '0.4rem',
                overflowX: 'auto',
            }}>
                {FLOOR_BRACKET.map((floor) => {
                    const isActive = floor.floor === currentFloor;
                    return (
                        <div key={floor.floor} style={{
                            borderRadius: 6,
                            border: isActive ? '1px solid rgba(255,107,53,0.5)' : '1px solid rgba(255,255,255,0.06)',
                            background: isActive ? 'rgba(255,107,53,0.12)' : 'rgba(255,255,255,0.02)',
                            padding: '0.4rem 0.5rem',
                        }}>
                            <div style={{ color: isActive ? '#ff6b35' : '#9ca3af', fontSize: '0.68rem', fontWeight: 700 }}>
                                FLOOR {floor.floor}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: '0.64rem' }}>
                                {floor.cells} cells · {floor.agents} agents
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Token Ticker */}
            {comp.availableTokens.length > 0 && (
                <div style={{
                    ...panelStyle, padding: '0.5rem 1rem', marginBottom: '1rem',
                    display: 'flex', gap: '1.5rem', overflowX: 'auto', whiteSpace: 'nowrap' as const,
                    fontSize: '0.75rem',
                }}>
                    {comp.availableTokens.slice(0, 12).map(t => (
                        <span key={t.mint} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ color: '#e5e5e5', fontWeight: 600 }}>${t.symbol}</span>
                            <span style={{ color: '#9ca3af' }}>{t.priceSOL.toFixed(6)}</span>
                            <span style={{ color: t.priceChange24h >= 0 ? '#22c55e' : '#ef4444' }}>
                                {t.priceChange24h >= 0 ? '+' : ''}{t.priceChange24h.toFixed(1)}%
                            </span>
                        </span>
                    ))}
                </div>
            )}

            {/* Winner Banner */}
            {comp.status === 'complete' && winnerCell && (
                <div style={{
                    ...panelStyle, marginBottom: '1rem', textAlign: 'center',
                    border: '1px solid #22c55e', background: 'rgba(34,197,94,0.05)',
                }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#22c55e', marginBottom: '0.5rem' }}>
                        Survivor Cell: {winnerCell.name}
                    </div>
                    <div style={{ color: '#e5e5e5', marginBottom: '0.75rem' }}>
                        PnL: {winnerCell.portfolio.totalPnL >= 0 ? '+' : ''}{winnerCell.portfolio.totalPnL.toFixed(2)} SOL
                        ({winnerCell.portfolio.totalPnLPercent >= 0 ? '+' : ''}{winnerCell.portfolio.totalPnLPercent.toFixed(1)}%)
                    </div>
                    {winnerGate && (
                        <div style={{
                            margin: '0 auto 0.8rem auto',
                            maxWidth: 640,
                            textAlign: 'left',
                            background: 'rgba(0,0,0,0.2)',
                            border: `1px solid ${winnerGate.eligible ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                            borderRadius: 8,
                            padding: '0.6rem 0.75rem',
                            color: '#9ca3af',
                            fontSize: '0.74rem',
                            lineHeight: 1.5,
                        }}>
                            <div style={{ color: winnerGate.eligible ? '#22c55e' : '#ef4444', fontWeight: 700, marginBottom: '0.3rem' }}>
                                Graduation Gate: {winnerGate.eligible ? 'PASS' : 'BLOCKED'}
                            </div>
                            <div>PnL {winnerCell.portfolio.totalPnL.toFixed(2)} / Required {winnerGate.minPnlRequired.toFixed(2)} SOL</div>
                            <div>Drawdown {winnerCell.portfolio.maxDrawdown.toFixed(1)}% / Max {GRAD_MAX_DRAWDOWN_PERCENT}%</div>
                            <div>Consistency {winnerGate.consistencyPercent.toFixed(1)}% / Min {GRAD_MIN_CONSISTENCY_PERCENT}%</div>
                            <div>Risk Violations {winnerGate.riskViolations} / Required 0</div>
                            <div>Weekly Graduations {winnerGate.weeklyGraduations} / Max {GRAD_MAX_WEEKLY}</div>
                            {!winnerGate.eligible && (
                                <div style={{ marginTop: '0.3rem', color: '#ef4444' }}>
                                    {winnerGate.reasons.join(' | ')}
                                </div>
                            )}
                            {winnerGate.weeksSinceLastGraduation >= GRAD_RELAX_AFTER_WEEKS && (
                                <div style={{ marginTop: '0.3rem', color: '#f59e0b' }}>
                                    Soft guardrail active: min PnL relaxed to {winnerGate.minPnlRequired.toFixed(0)} SOL after {winnerGate.weeksSinceLastGraduation} weeks without graduation.
                                </div>
                            )}
                        </div>
                    )}
                    {gradStatus === 'idle' && authenticated && winnerGate?.eligible && (
                        <button onClick={() => handleGraduate(winnerCell)} style={{
                            background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6,
                            padding: '0.5rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                        }}>
                            Graduate to Pump.fun
                        </button>
                    )}
                    {gradStatus === 'idle' && authenticated && winnerGate && !winnerGate.eligible && (
                        <button disabled style={{
                            background: '#374151', color: '#9ca3af', border: 'none', borderRadius: 6,
                            padding: '0.5rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'not-allowed',
                        }}>
                            Graduation Blocked
                        </button>
                    )}
                    {gradStatus === 'idle' && !authenticated && winnerGate?.eligible && (
                        <button onClick={login} style={{
                            background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 6,
                            padding: '0.5rem 1.5rem', fontSize: '0.9rem', cursor: 'pointer',
                        }}>
                            Connect Wallet to Graduate
                        </button>
                    )}
                    {gradStatus === 'idle' && !authenticated && winnerGate && !winnerGate.eligible && (
                        <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                            Gate conditions are not met this season.
                        </div>
                    )}
                    {gradStatus !== 'idle' && gradStatus !== 'success' && gradStatus !== 'error' && (
                        <div style={{ color: '#ff6b35', fontSize: '0.85rem' }}>
                            <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }}>&#9696;</span>
                            {gradStatus === 'uploading' && 'Uploading metadata...'}
                            {gradStatus === 'building' && 'Building token...'}
                            {gradStatus === 'signing' && 'Awaiting wallet signature...'}
                            {gradStatus === 'confirming' && 'Confirming on-chain...'}
                        </div>
                    )}
                    {gradStatus === 'success' && gradResult && (
                        <div>
                            <div style={{ color: '#22c55e', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Token launched!</div>
                            <a href={gradResult.pumpfunUrl} target="_blank" rel="noopener noreferrer"
                                style={{ color: '#ff6b35', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                                View on Pump.fun <ExternalLinkIcon size="0.85rem" />
                            </a>
                        </div>
                    )}
                    {gradStatus === 'error' && (
                        <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>
                            {gradError}
                            <button onClick={() => setGradStatus('idle')} style={{
                                background: '#333', color: '#e5e5e5', border: 'none', borderRadius: 4,
                                padding: '0.25rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', marginLeft: '0.5rem',
                            }}>
                                Retry
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Main Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', alignItems: 'start' }}>
                {/* Left: Trading Cells */}
                <div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.65rem',
                    }}>
                        <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                            Cells {pageStart + 1}-{pageEnd} of {ranked.length}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <button
                                onClick={() => setCellPage((prev) => Math.max(1, prev - 1))}
                                disabled={visiblePage <= 1}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #333',
                                    color: visiblePage <= 1 ? '#555' : '#9ca3af',
                                    borderRadius: 6,
                                    padding: '0.2rem 0.55rem',
                                    fontSize: '0.72rem',
                                    cursor: visiblePage <= 1 ? 'not-allowed' : 'pointer',
                                }}
                            >
                                Prev
                            </button>
                            <span style={{ color: '#6b7280', fontSize: '0.72rem' }}>
                                {visiblePage}/{totalCellPages}
                            </span>
                            <button
                                onClick={() => setCellPage((prev) => Math.min(totalCellPages, prev + 1))}
                                disabled={visiblePage >= totalCellPages}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #333',
                                    color: visiblePage >= totalCellPages ? '#555' : '#9ca3af',
                                    borderRadius: 6,
                                    padding: '0.2rem 0.55rem',
                                    fontSize: '0.72rem',
                                    cursor: visiblePage >= totalCellPages ? 'not-allowed' : 'pointer',
                                }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                        {pagedCells.map((cell, idx) => (
                            <CellCard
                                key={cell.id}
                                cell={cell}
                                rank={pageStart + idx + 1}
                                agents={comp.agents}
                                isSelected={selectedCell === cell.id}
                                isExpanded={expandedCell === cell.id}
                                onSelect={() => setSelectedCell(cell.id === selectedCell ? null : cell.id)}
                                onExpand={() => setExpandedCell(cell.id === expandedCell ? null : cell.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Right: Leaderboard + Log */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* PnL Leaderboard */}
                    <div style={{ ...panelStyle, maxHeight: 460, overflowY: 'auto' }}>
                        <div style={panelTitle}>PnL Cell Leaderboard</div>
                        {leaderboardCells.map((cell, i) => {
                            const eliminated = cell.status === 'eliminated';
                            return (
                                <div key={cell.id} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0.35rem 0', borderBottom: i < leaderboardCells.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                    opacity: eliminated ? 0.35 : 1,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: 700, width: 20, textAlign: 'center',
                                            color: eliminated ? '#444' : i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#666',
                                        }}>
                                            {eliminated ? 'X' : `#${i + 1}`}
                                        </span>
                                        <span style={{
                                            color: eliminated ? '#555' : '#e5e5e5', fontSize: '0.8rem',
                                            textDecoration: eliminated ? 'line-through' : 'none',
                                        }}>
                                            {cell.name}
                                        </span>
                                        {eliminated && (
                                            <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 500 }}>
                                                R{cell.eliminatedRound}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        {cell.portfolio.totalPnL >= 0
                                            ? <TrendUpIcon size="0.75rem" />
                                            : <TrendDownIcon size="0.75rem" />}
                                        <span style={{
                                            color: cell.portfolio.totalPnL >= 0 ? '#22c55e' : '#ef4444',
                                            fontSize: '0.8rem', fontWeight: 600, fontFamily: 'monospace',
                                        }}>
                                            {cell.portfolio.totalPnL >= 0 ? '+' : ''}{cell.portfolio.totalPnL.toFixed(2)} SOL
                                        </span>
                                        <span style={{ color: '#666', fontSize: '0.7rem' }}>
                                            ({cell.portfolio.totalPnLPercent >= 0 ? '+' : ''}{cell.portfolio.totalPnLPercent.toFixed(1)}%)
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {ranked.length > leaderboardCells.length && (
                            <div style={{ marginTop: '0.45rem', color: '#6b7280', fontSize: '0.68rem' }}>
                                Showing top {leaderboardCells.length} cells
                            </div>
                        )}
                    </div>

                    {/* Spotlight Panel */}
                    {selectedCell && comp.agents && (() => {
                        const cell = comp.cells.find(d => d.id === selectedCell);
                        if (!cell) return null;
                        const cellAgents = cell.agents.map(id => comp.agents[id]).filter(Boolean);
                        const spotAgent = cellAgents.find(a => a.contribution);
                        return spotAgent ? (
                            <div style={{ ...panelStyle, maxHeight: 180, overflow: 'auto' }}>
                                <div style={{ ...panelTitle, color: '#eab308' }}>AI Spotlight</div>
                                <div style={{ fontSize: '0.8rem', color: '#e5e5e5', marginBottom: '0.25rem', fontWeight: 600 }}>
                                    {spotAgent.name} ({spotAgent.investmentRole})
                                </div>
                                <pre style={{
                                    fontSize: '0.7rem', color: '#9ca3af', whiteSpace: 'pre-wrap',
                                    fontFamily: 'monospace', margin: 0, lineHeight: 1.4,
                                }}>
                                    {spotAgent.contribution}
                                </pre>
                            </div>
                        ) : null;
                    })()}

                    {/* Trading Log */}
                    <div style={{ ...panelStyle, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 200 }}>
                        <div style={panelTitle}>Arena Log</div>
                        <div ref={logRef} style={{
                            flex: 1, overflow: 'auto', maxHeight: 300,
                            fontSize: '0.7rem', fontFamily: 'monospace', lineHeight: 1.5,
                        }}>
                            {comp.log.map((entry, i) => {
                                const cellName = entry.cellId
                                    ? comp.cells.find(d => d.id === entry.cellId)?.name
                                    : null;
                                return (
                                    <div key={i} style={{ color: logColor(entry) }}>
                                        {cellName ? `[${cellName}] ` : ''}{entry.message}
                                    </div>
                                );
                            })}
                            <span style={{ animation: 'blink 1s infinite', color: '#ff6b35' }}>_</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
            `}</style>
            </main>
        </div>
    );
}

// ── Sub-components ──────────────────────────────────────

function CellCard({
    cell, rank, agents, isSelected, isExpanded, onSelect, onExpand,
}: {
    cell: TradingCell;
    rank: number;
    agents: Record<string, PnLAgent>;
    isSelected: boolean;
    isExpanded: boolean;
    onSelect: () => void;
    onExpand: () => void;
}) {
    const pnl = cell.portfolio.totalPnL;
    const pnlPct = cell.portfolio.totalPnLPercent;
    const eliminated = cell.status === 'eliminated';
    const cellAgents = cell.agents.map(id => agents[id]).filter(Boolean);

    // Group agents by role
    const roleGroups: Record<string, PnLAgent[]> = {};
    for (const a of cellAgents) {
        if (!roleGroups[a.investmentRole]) roleGroups[a.investmentRole] = [];
        roleGroups[a.investmentRole].push(a);
    }

    return (
        <div style={{
            ...panelStyle,
            cursor: 'pointer',
            border: eliminated ? '1px solid rgba(239,68,68,0.3)' : isSelected ? '1px solid #ff6b35' : '1px solid rgba(255,107,53,0.15)',
            transition: 'border-color 0.2s',
            opacity: eliminated ? 0.4 : 1,
            position: 'relative' as const,
        }} onClick={onSelect}>
            {eliminated && (
                <div style={{
                    position: 'absolute', top: 6, right: 8,
                    fontSize: '0.6rem', fontWeight: 700, color: '#ef4444',
                    background: 'rgba(239,68,68,0.15)', padding: '0.1rem 0.4rem', borderRadius: 4,
                    textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                }}>
                    Eliminated R{cell.eliminatedRound}
                </div>
            )}
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                        fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 4,
                        background: eliminated ? 'rgba(239,68,68,0.1)' : rank <= 3 ? 'rgba(255,107,53,0.2)' : 'rgba(255,255,255,0.05)',
                        color: eliminated ? '#ef4444' : rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#666',
                    }}>
                        {eliminated ? 'X' : `#${rank}`}
                    </span>
                    <span style={{
                        color: eliminated ? '#555' : '#e5e5e5', fontSize: '0.85rem', fontWeight: 600,
                        textDecoration: eliminated ? 'line-through' : 'none',
                    }}>
                        {cell.name}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {pnl >= 0 ? <TrendUpIcon size="0.8rem" /> : <TrendDownIcon size="0.8rem" />}
                    <span style={{
                        color: pnl >= 0 ? '#22c55e' : '#ef4444',
                        fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace',
                    }}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                    </span>
                    <span style={{ color: '#666', fontSize: '0.7rem' }}>
                        ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                    </span>
                </div>
            </div>

            {/* Portfolio summary */}
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
                <span><DollarIcon size="0.65rem" /> {cell.portfolio.cashSOL.toFixed(1)} SOL</span>
                <span><TradeIcon size="0.65rem" /> {cell.portfolio.positions.length} pos</span>
                <span>Val: {cell.portfolio.totalValue.toFixed(1)}</span>
            </div>

            {/* Role badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
                {Object.entries(roleGroups).map(([role, roleAgents]) => (
                    <span key={role} style={{
                        fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: 10,
                        background: `${ROLE_COLORS[role as InvestmentRole]}20`,
                        color: ROLE_COLORS[role as InvestmentRole],
                        border: `1px solid ${ROLE_COLORS[role as InvestmentRole]}40`,
                    }}>
                        {ROLE_LABELS[role as InvestmentRole]} x{roleAgents.length}
                    </span>
                ))}
            </div>

            {/* Expand for positions */}
            <button onClick={(e) => { e.stopPropagation(); onExpand(); }} style={{
                background: 'transparent', border: 'none', color: '#666', fontSize: '0.7rem',
                cursor: 'pointer', padding: 0,
            }}>
                {isExpanded ? '- Hide positions' : '+ Show positions'}
            </button>

            {isExpanded && cell.portfolio.positions.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.7rem' }}>
                    {cell.portfolio.positions.map(pos => (
                        <div key={pos.tokenMint} style={{
                            display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                        }}>
                            <span style={{ color: '#e5e5e5' }}>${pos.tokenSymbol}</span>
                            <span style={{
                                color: pos.unrealizedPnL >= 0 ? '#22c55e' : '#ef4444',
                                fontFamily: 'monospace',
                            }}>
                                {pos.unrealizedPnL >= 0 ? '+' : ''}{pos.unrealizedPnL.toFixed(3)} SOL
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {isExpanded && cell.portfolio.positions.length === 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#666' }}>No positions yet</div>
            )}
        </div>
    );
}

// ── Helpers ─────────────────────────────────────────────

function logColor(entry: PnLLogEntry): string {
    switch (entry.type) {
        case 'graduation': return '#22c55e';
        case 'trade': return '#3b82f6';
        case 'risk_alert': return '#ef4444';
        case 'research': return '#8b5cf6';
        case 'pnl_update': return '#ff6b35';
        case 'round_end': return '#9ca3af';
        default: return '#666';
    }
}

function generateMockTokens(): PumpToken[] {
    const names = [
        ['BONK', 'Bonk'], ['WIF', 'dogwifhat'], ['POPCAT', 'Popcat'], ['MEW', 'cat in a dogs world'],
        ['BOME', 'BOOK OF MEME'], ['SLERF', 'Slerf'], ['MYRO', 'Myro'], ['MOODENG', 'Moo Deng'],
        ['PNUT', 'Peanut'], ['GOAT', 'Goatseus Maximus'], ['FWOG', 'Fwog'], ['GIGA', 'Giga Chad'],
        ['TREMP', 'Doland Tremp'], ['BODEN', 'Jeo Boden'], ['MOTHER', 'Mother Iggy'],
    ];

    return names.map(([symbol, name], i) => ({
        mint: `mock${i}${'x'.repeat(40)}`.slice(0, 44),
        name,
        symbol,
        priceSOL: 0.0001 + Math.random() * 0.01,
        priceUSD: 0.001 + Math.random() * 0.1,
        marketCapSOL: 1000 + Math.random() * 50000,
        volume24h: 10000 + Math.random() * 500000,
        priceChange24h: -30 + Math.random() * 60,
        holders: 100 + Math.floor(Math.random() * 10000),
        createdAt: Date.now() - Math.random() * 86400000 * 30,
        bondingCurveProgress: Math.random() * 100,
    }));
}

function toCellSymbol(cellName: string): string {
    const symbol = cellName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return symbol.slice(0, 10) || 'N5CELL';
}

function getWeekKey(timestamp: number): string {
    const date = new Date(timestamp);
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function buildCellComposition(cell: TradingCell, agents: Record<string, PnLAgent>): string {
    const roster = cell.agents
        .map((id, idx) => {
            const agent = agents[id];
            if (!agent) return `${idx + 1}. Unknown`;
            return `${idx + 1}. ${agent.name} [${agent.investmentRole}]`;
        })
        .join('\n');

    const roleCounts: Record<string, number> = {};
    for (const id of cell.agents) {
        const role = agents[id]?.investmentRole ?? 'Unknown';
        roleCounts[role] = (roleCounts[role] ?? 0) + 1;
    }
    const roleSummary = Object.entries(roleCounts)
        .map(([role, count]) => `${role} x${count}`)
        .join(', ');

    return `Cell identity: ${cell.name}\nRole composition: ${roleSummary}\nAgent roster:\n${roster}`;
}

function evaluateGraduationGate(cell: TradingCell): GraduationGateResult {
    const graduated = [...getGraduatedAgents()].sort((a, b) => b.graduatedAt - a.graduatedAt);
    const now = Date.now();
    const thisWeek = getWeekKey(now);
    const weeklyGraduations = graduated.filter((g) => getWeekKey(g.graduatedAt) === thisWeek).length;
    const lastGraduationAt = graduated[0]?.graduatedAt;
    const weeksSinceLastGraduation = lastGraduationAt ? Math.floor((now - lastGraduationAt) / WEEK_MS) : 0;
    const minPnlRequired = weeksSinceLastGraduation >= GRAD_RELAX_AFTER_WEEKS
        ? GRAD_RELAXED_MIN_PNL_SOL
        : GRAD_MIN_PNL_SOL;

    const pnlCheck = cell.portfolio.totalPnL >= minPnlRequired;
    const drawdownCheck = cell.portfolio.maxDrawdown <= GRAD_MAX_DRAWDOWN_PERCENT;
    const totalRounds = Math.max(1, cell.roundPnL.length);
    const positiveRounds = cell.roundPnL.filter((v) => v > 0).length;
    const consistencyPercent = (positiveRounds / totalRounds) * 100;
    const consistencyCheck = consistencyPercent >= GRAD_MIN_CONSISTENCY_PERCENT;
    const totalValue = Math.max(cell.portfolio.totalValue, 0.000001);
    const riskViolations = cell.portfolio.positions.reduce((count, pos) => {
        const weight = (pos.currentPrice * pos.quantity) / totalValue;
        return count + (weight > MAX_POSITION_PERCENT + 0.0001 ? 1 : 0);
    }, 0);
    const riskCheck = riskViolations === 0;
    const weeklySlotCheck = weeklyGraduations < GRAD_MAX_WEEKLY;

    const reasons: string[] = [];
    if (!pnlCheck) reasons.push(`PnL < +${minPnlRequired.toFixed(0)} SOL`);
    if (!drawdownCheck) reasons.push(`drawdown > ${GRAD_MAX_DRAWDOWN_PERCENT}%`);
    if (!consistencyCheck) reasons.push(`consistency < ${GRAD_MIN_CONSISTENCY_PERCENT}%`);
    if (!riskCheck) reasons.push('risk violations > 0');
    if (!weeklySlotCheck) reasons.push('weekly graduation slot exhausted');

    return {
        eligible: pnlCheck && drawdownCheck && consistencyCheck && riskCheck && weeklySlotCheck,
        minPnlRequired,
        consistencyPercent,
        riskViolations,
        weeklyGraduations,
        weeksSinceLastGraduation,
        checks: {
            pnl: pnlCheck,
            drawdown: drawdownCheck,
            consistency: consistencyCheck,
            risk: riskCheck,
            weeklySlot: weeklySlotCheck,
        },
        reasons,
    };
}

import { useState, useCallback, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { Connection } from '@solana/web3.js';
import { useSolana } from '../contexts/SolanaContext';
import {
    initializePnLCompetition,
    generatePnLAgents,
    simulateDeskTrades,
    applyTrades,
    updatePortfolioPrices,
    rankDesks,
    isSpotlightDesk,
    recordTokenSnapshot,
    logEntry,
} from '../services/pnl-competition';
import { fetchTrendingTokens, refreshPrices } from '../services/pnl-market';
import {
    ROLE_COLORS,
    ROLE_LABELS,
    TOTAL_ROUNDS,
    STARTING_CAPITAL,
} from '../services/pnl-types';
import type {
    PnLCompetitionState,
    PnLAgent,
    TradingDesk,
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
} from '../services/pumpfun';
import { TrendUpIcon, TrendDownIcon, DollarIcon, TradeIcon, ExternalLinkIcon } from '../components/Icons';

type GradStatus = 'idle' | 'uploading' | 'building' | 'signing' | 'confirming' | 'success' | 'error';
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

// ── Styles ──────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
    background: '#1a1a1a',
    border: '1px solid rgba(255,107,53,0.15)',
    borderRadius: 8,
    padding: '1rem',
};

const panelTitle: React.CSSProperties = {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#e5e5e5',
    marginBottom: '0.75rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid rgba(255,107,53,0.15)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
};

// ── Component ───────────────────────────────────────────

export function PnLArena() {
    const { authenticated, login } = usePrivy();
    const { wallets } = useWallets();
    const { signTransaction } = useSignTransaction();
    const { publicKey } = useSolana();

    const [comp, setComp] = useState<PnLCompetitionState | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);
    const [selectedDesk, setSelectedDesk] = useState<string | null>(null);
    const [expandedDesk, setExpandedDesk] = useState<string | null>(null);

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
        state.log.push(logEntry(round, 'system', `--- Round ${round}/${TOTAL_ROUNDS} ---`));

        // Price map for portfolio updates
        const priceMap: Record<string, number> = {};
        for (const t of state.availableTokens) priceMap[t.mint] = t.priceSOL;

        // Rank desks for spotlight determination
        const ranked = rankDesks(state.desks);

        for (let i = 0; i < state.desks.length; i++) {
            const desk = state.desks[i];
            desk.status = 'trading';

            // Update existing positions with current prices
            desk.portfolio = updatePortfolioPrices(desk.portfolio, priceMap);

            // Generate trade decisions
            let decisions: TradeDecision[];

            if (isSpotlightDesk(desk, ranked) && state.availableTokens.length > 0) {
                // Spotlight desks: use real AI
                try {
                    decisions = await fetchAITrades(desk, state.agents, state.availableTokens, round);
                    state.apiCallsMade += 2; // researcher + trader calls
                    state.log.push(logEntry(round, 'research', `${desk.id} AI analysis complete`, desk.id));
                } catch {
                    decisions = simulateDeskTrades(desk, state.agents, state.availableTokens, round);
                }
            } else {
                // Non-spotlight: simulation
                decisions = simulateDeskTrades(desk, state.agents, state.availableTokens, round);
            }

            // Apply trades
            const result = applyTrades(desk, decisions, state.availableTokens, state.agents);
            state.desks[i] = { ...result.desk, status: 'complete' };

            // Update portfolio with current prices after trades
            state.desks[i].portfolio = updatePortfolioPrices(state.desks[i].portfolio, priceMap);
            state.desks[i].roundPnL.push(state.desks[i].portfolio.totalPnL);

            // Add trade logs
            for (const log of result.logs) {
                log.round = round;
                state.log.push(log);
            }
        }

        // PnL update log
        const finalRanked = rankDesks(state.desks);
        const top = finalRanked[0];
        state.log.push(logEntry(round, 'pnl_update',
            `Round ${round} leader: ${top.id} (PnL: ${top.portfolio.totalPnL >= 0 ? '+' : ''}${top.portfolio.totalPnL.toFixed(2)} SOL)`));

        // Advance round
        if (round >= TOTAL_ROUNDS) {
            state.status = 'complete';
            state.winner = finalRanked[0].id;
            state.log.push(logEntry(round, 'graduation',
                `Competition complete! Winner: ${finalRanked[0].id} with ${finalRanked[0].portfolio.totalPnL >= 0 ? '+' : ''}${finalRanked[0].portfolio.totalPnL.toFixed(2)} SOL PnL`));
        } else {
            state.currentRound++;
        }

        setComp(state);
        setIsRunning(false);
    }, [comp, isRunning]);

    // ── AI trade fetching ───────────────────────────────
    async function fetchAITrades(
        desk: TradingDesk,
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
            cashSOL: desk.portfolio.cashSOL,
            positions: desk.portfolio.positions.map(p => ({
                tokenMint: p.tokenMint,
                tokenSymbol: p.tokenSymbol,
                quantity: p.quantity,
                avgEntryPrice: p.avgEntryPrice,
                currentPrice: p.currentPrice,
            })),
        };

        // Call researcher first, then trader
        const researcher = desk.agents.map(id => agents[id]).find(a => a.investmentRole === 'Researcher');
        const trader = desk.agents.map(id => agents[id]).find(a => a.investmentRole === 'Trader');

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
                        deskId: desk.id,
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
                        deskId: desk.id,
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
        return simulateDeskTrades(desk, agents, tokens, round);
    }

    // ── Graduation ──────────────────────────────────────
    const handleGraduate = useCallback(async (desk: TradingDesk) => {
        if (!authenticated || !publicKey || !wallets[0]) {
            login();
            return;
        }

        const bestAgent = desk.agents
            .map(id => comp?.agents[id])
            .filter((a): a is PnLAgent => !!a)
            .sort((a, b) => (b.investmentRole === 'Strategist' ? 1 : 0) - (a.investmentRole === 'Strategist' ? 1 : 0))[0];

        if (!bestAgent) return;

        setGradStatus('uploading');
        setGradError(null);

        try {
            const description = generateTokenDescription(
                bestAgent.name,
                bestAgent.specialization,
                `PnL Arena Champion | ${desk.portfolio.totalPnL >= 0 ? '+' : ''}${desk.portfolio.totalPnL.toFixed(2)} SOL PnL`,
            );
            const { metadataUri } = await uploadMetadata(bestAgent.name, bestAgent.symbol, description);

            setGradStatus('building');
            const { publicKey: mintPub, keypair: mintKeypair } = generateMintKeypair();
            const unsignedTx = await buildCreateTokenTx(publicKey, mintPub, metadataUri, bestAgent.name, bestAgent.symbol);

            setGradStatus('signing');
            const mintSigned = signWithMintKeypair(unsignedTx, mintKeypair);
            const fullySigned = await signTransaction({ transaction: { bytes: mintSigned }, address: wallets[0].address });
            const signedBytes = fullySigned.signedTransaction.bytes;

            setGradStatus('confirming');
            const connection = new Connection(MAINNET_RPC, 'confirmed');
            const sig = await connection.sendRawTransaction(signedBytes, { skipPreflight: true, maxRetries: 3 });
            await connection.confirmTransaction(sig, 'confirmed');

            const pumpfunUrl = getPumpfunUrl(mintPub);
            saveGraduatedAgent({ name: bestAgent.name, symbol: bestAgent.symbol, specialization: bestAgent.specialization, mintAddress: mintPub, pumpfunUrl, graduatedAt: Date.now(), trustScore: 100 });

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
        setSelectedDesk(null);
        setExpandedDesk(null);
        setGradStatus('idle');
        setGradResult(null);
    }, []);

    // ── Render ──────────────────────────────────────────

    if (!comp) {
        return (
            <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 1rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#ff6b35', marginBottom: '0.5rem' }}>PnL Arena</h1>
                <p style={{ color: '#9ca3af', fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                    8 AI Trading Desks compete with 100 virtual SOL each.<br />
                    Real pump.fun token prices. 5 rounds. Best PnL wins.
                </p>
                <button onClick={handleInit} style={{
                    background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '0.75rem 2rem', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                }}>
                    Launch PnL Arena
                </button>
            </div>
        );
    }

    const ranked = rankDesks(comp.desks);
    const winnerDesk = comp.winner ? comp.desks.find(d => d.id === comp.winner) : null;

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ff6b35', margin: 0 }}>PnL Arena</h1>
                    <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                        Round {comp.currentRound}/{comp.totalRounds} | {comp.desks.length} desks | {comp.apiCallsMade} AI calls
                    </span>
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
                        {isRunning ? 'Trading...' : comp.status === 'loading_tokens' ? 'Loading...' : 'Run Round'}
                    </button>
                    <button onClick={handleReset} style={{
                        background: 'transparent', color: '#9ca3af', border: '1px solid #333',
                        borderRadius: 6, padding: '0.4rem 0.75rem', fontSize: '0.85rem', cursor: 'pointer',
                    }}>
                        Reset
                    </button>
                </div>
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
            {comp.status === 'complete' && winnerDesk && (
                <div style={{
                    ...panelStyle, marginBottom: '1rem', textAlign: 'center',
                    border: '1px solid #22c55e', background: 'rgba(34,197,94,0.05)',
                }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#22c55e', marginBottom: '0.5rem' }}>
                        Champion: {winnerDesk.id}
                    </div>
                    <div style={{ color: '#e5e5e5', marginBottom: '0.75rem' }}>
                        PnL: {winnerDesk.portfolio.totalPnL >= 0 ? '+' : ''}{winnerDesk.portfolio.totalPnL.toFixed(2)} SOL
                        ({winnerDesk.portfolio.totalPnLPercent >= 0 ? '+' : ''}{winnerDesk.portfolio.totalPnLPercent.toFixed(1)}%)
                    </div>
                    {gradStatus === 'idle' && authenticated && (
                        <button onClick={() => handleGraduate(winnerDesk)} style={{
                            background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6,
                            padding: '0.5rem 1.5rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
                        }}>
                            Graduate to Pump.fun
                        </button>
                    )}
                    {gradStatus === 'idle' && !authenticated && (
                        <button onClick={login} style={{
                            background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 6,
                            padding: '0.5rem 1.5rem', fontSize: '0.9rem', cursor: 'pointer',
                        }}>
                            Connect Wallet to Graduate
                        </button>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem' }}>
                {/* Left: Trading Desks */}
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                        {ranked.map((desk, rankIdx) => (
                            <DeskCard
                                key={desk.id}
                                desk={desk}
                                rank={rankIdx + 1}
                                agents={comp.agents}
                                isSelected={selectedDesk === desk.id}
                                isExpanded={expandedDesk === desk.id}
                                onSelect={() => setSelectedDesk(desk.id === selectedDesk ? null : desk.id)}
                                onExpand={() => setExpandedDesk(desk.id === expandedDesk ? null : desk.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Right: Leaderboard + Log */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* PnL Leaderboard */}
                    <div style={panelStyle}>
                        <div style={panelTitle}>PnL Leaderboard</div>
                        {ranked.map((desk, i) => (
                            <div key={desk.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.35rem 0', borderBottom: i < ranked.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{
                                        fontSize: '0.75rem', fontWeight: 700, width: 20, textAlign: 'center',
                                        color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#666',
                                    }}>
                                        #{i + 1}
                                    </span>
                                    <span style={{ color: '#e5e5e5', fontSize: '0.8rem' }}>{desk.id}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    {desk.portfolio.totalPnL >= 0
                                        ? <TrendUpIcon size="0.75rem" />
                                        : <TrendDownIcon size="0.75rem" />}
                                    <span style={{
                                        color: desk.portfolio.totalPnL >= 0 ? '#22c55e' : '#ef4444',
                                        fontSize: '0.8rem', fontWeight: 600, fontFamily: 'monospace',
                                    }}>
                                        {desk.portfolio.totalPnL >= 0 ? '+' : ''}{desk.portfolio.totalPnL.toFixed(2)} SOL
                                    </span>
                                    <span style={{ color: '#666', fontSize: '0.7rem' }}>
                                        ({desk.portfolio.totalPnLPercent >= 0 ? '+' : ''}{desk.portfolio.totalPnLPercent.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Spotlight Panel */}
                    {selectedDesk && comp.agents && (() => {
                        const desk = comp.desks.find(d => d.id === selectedDesk);
                        if (!desk) return null;
                        const deskAgents = desk.agents.map(id => comp.agents[id]).filter(Boolean);
                        const spotAgent = deskAgents.find(a => a.contribution);
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
                        <div style={panelTitle}>Trading Log</div>
                        <div ref={logRef} style={{
                            flex: 1, overflow: 'auto', maxHeight: 300,
                            fontSize: '0.7rem', fontFamily: 'monospace', lineHeight: 1.5,
                        }}>
                            {comp.log.map((entry, i) => (
                                <div key={i} style={{ color: logColor(entry) }}>
                                    {entry.deskId ? `[${entry.deskId}] ` : ''}{entry.message}
                                </div>
                            ))}
                            <span style={{ animation: 'blink 1s infinite', color: '#ff6b35' }}>_</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
            `}</style>
        </div>
    );
}

// ── Sub-components ──────────────────────────────────────

function DeskCard({
    desk, rank, agents, isSelected, isExpanded, onSelect, onExpand,
}: {
    desk: TradingDesk;
    rank: number;
    agents: Record<string, PnLAgent>;
    isSelected: boolean;
    isExpanded: boolean;
    onSelect: () => void;
    onExpand: () => void;
}) {
    const pnl = desk.portfolio.totalPnL;
    const pnlPct = desk.portfolio.totalPnLPercent;
    const deskAgents = desk.agents.map(id => agents[id]).filter(Boolean);

    // Group agents by role
    const roleGroups: Record<string, PnLAgent[]> = {};
    for (const a of deskAgents) {
        if (!roleGroups[a.investmentRole]) roleGroups[a.investmentRole] = [];
        roleGroups[a.investmentRole].push(a);
    }

    return (
        <div style={{
            ...panelStyle,
            cursor: 'pointer',
            border: isSelected ? '1px solid #ff6b35' : '1px solid rgba(255,107,53,0.15)',
            transition: 'border-color 0.2s',
        }} onClick={onSelect}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{
                        fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: 4,
                        background: rank <= 3 ? 'rgba(255,107,53,0.2)' : 'rgba(255,255,255,0.05)',
                        color: rank === 1 ? '#ffd700' : rank === 2 ? '#c0c0c0' : rank === 3 ? '#cd7f32' : '#666',
                    }}>
                        #{rank}
                    </span>
                    <span style={{ color: '#e5e5e5', fontSize: '0.85rem', fontWeight: 600 }}>
                        {desk.id.replace('desk-', 'Desk ')}
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
                <span><DollarIcon size="0.65rem" /> {desk.portfolio.cashSOL.toFixed(1)} SOL</span>
                <span><TradeIcon size="0.65rem" /> {desk.portfolio.positions.length} pos</span>
                <span>Val: {desk.portfolio.totalValue.toFixed(1)}</span>
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

            {isExpanded && desk.portfolio.positions.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.7rem' }}>
                    {desk.portfolio.positions.map(pos => (
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
            {isExpanded && desk.portfolio.positions.length === 0 && (
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

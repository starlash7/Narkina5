import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { Connection } from '@solana/web3.js';
import { useSolana } from '../contexts/SolanaContext';
import {
    uploadMetadata,
    generateMintKeypair,
    buildCreateTokenTx,
    signWithMintKeypair,
    generateTokenDescription,
    getPumpfunUrl,
    getGraduatedAgents,
    saveGraduatedAgent,
    type GraduatedAgent,
    type AgentGraduationData,
} from '../services/pumpfun';
import { executeBatchTraining, parseExecutionSteps, type BatchAgentResult } from '../services/agent';
import { WalletIcon, ChartIcon, TaskIcon, ExternalLinkIcon } from '../components/Icons';

// ── Types ────────────────────────────────────────────────
type Phase = 'setup' | 'training' | 'graduation';
type GradStatus = 'idle' | 'uploading' | 'building' | 'signing' | 'confirming' | 'success' | 'error';

interface CompetitorAgent {
    id: string;
    name: string;
    symbol: string;
    description: string;
    specialization: string;
    trustScore: number;
    completedTasks: number;
    lastResult?: string;
    lastScore?: number;
    lastRank?: number;
    status: 'waiting' | 'training' | 'done' | 'graduated' | 'eliminated';
}

// ── Constants ────────────────────────────────────────────
const GRADUATION_THRESHOLD = 100;
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
const MIN_AGENTS = 2;
const MAX_AGENTS = 6;

const TRUST_BY_RANK: Record<number, number> = {
    1: 25, 2: 20, 3: 15, 4: 10, 5: 5, 6: 5,
};

const TRAINING_TASKS = [
    { title: 'Data Pipeline Assembly', desc: 'Process and analyze raw blockchain data streams' },
    { title: 'Smart Contract Audit', desc: 'Review DeFi protocol for vulnerabilities' },
    { title: 'Sentiment Analysis', desc: 'Analyze social media data for market signals' },
    { title: 'Network Optimization', desc: 'Optimize RPC endpoint routing and latency' },
    { title: 'Token Metrics Analysis', desc: 'Evaluate on-chain token health metrics' },
    { title: 'Mempool Monitoring', desc: 'Monitor and classify pending transactions' },
    { title: 'Wallet Clustering', desc: 'Identify related wallets through transaction patterns' },
    { title: 'Liquidity Assessment', desc: 'Analyze DEX pool depth and stability' },
];

const SPECS = ['Compute', 'Inference', 'Security', 'Network', 'Storage'] as const;
const SPEC_COLORS: Record<string, string> = {
    Compute: '#ff6b35', Inference: '#8b5cf6', Security: '#ef4444',
    Network: '#3b82f6', Storage: '#22c55e',
};

const RANK_LABELS = ['', '1st', '2nd', '3rd', '4th', '5th', '6th'];

// ── Component ────────────────────────────────────────────
export function Dashboard() {
    const { authenticated, login, user } = usePrivy();
    const { wallets } = useWallets();
    const { signTransaction } = useSignTransaction();
    const { balance, isLoading: balanceLoading, refreshBalance, network, publicKey } = useSolana();

    // Phase management
    const [phase, setPhase] = useState<Phase>('setup');
    const [agents, setAgents] = useState<CompetitorAgent[]>([]);
    const [roundNumber, setRoundNumber] = useState(0);
    const [isTraining, setIsTraining] = useState(false);
    const [trainLog, setTrainLog] = useState<string[]>([]);

    // Setup form
    const [newName, setNewName] = useState('');
    const [newSymbol, setNewSymbol] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newSpec, setNewSpec] = useState<string>('Compute');

    // Graduation
    const [gradAgent, setGradAgent] = useState<CompetitorAgent | null>(null);
    const [gradStatus, setGradStatus] = useState<GradStatus>('idle');
    const [gradError, setGradError] = useState<string | null>(null);
    const [gradResult, setGradResult] = useState<{ mintAddress: string; pumpfunUrl: string } | null>(null);
    const [graduatedAgents, setGraduatedAgents] = useState<GraduatedAgent[]>([]);

    useEffect(() => {
        setGraduatedAgents(getGraduatedAgents());
    }, []);

    const getDisplayName = () => {
        if (user?.wallet?.address) {
            const a = user.wallet.address;
            return `${a.slice(0, 6)}...${a.slice(-4)}`;
        }
        if (user?.email?.address) return user.email.address;
        return 'User';
    };

    // ── Setup Phase ──────────────────────────────────────
    const addAgent = () => {
        if (!newName || agents.length >= MAX_AGENTS) return;
        const symbol = newSymbol || newName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
        const agent: CompetitorAgent = {
            id: crypto.randomUUID(),
            name: newName,
            symbol,
            description: newDesc || `AI agent specialized in ${newSpec}`,
            specialization: newSpec,
            trustScore: 0,
            completedTasks: 0,
            status: 'waiting',
        };
        setAgents(prev => [...prev, agent]);
        setNewName('');
        setNewSymbol('');
        setNewDesc('');
        setNewSpec(SPECS[(agents.length + 1) % SPECS.length]);
    };

    const removeAgent = (id: string) => {
        setAgents(prev => prev.filter(a => a.id !== id));
    };

    const startCompetition = () => {
        if (agents.length < MIN_AGENTS) return;
        setPhase('training');
        setRoundNumber(0);
        setTrainLog([`> Competition initialized with ${agents.length} agents.`, `> Press "Run Training Round" to begin.`]);
    };

    // ── Training Phase ───────────────────────────────────
    const runTrainingRound = async () => {
        if (isTraining) return;

        const activeAgents = agents.filter(a => a.status !== 'graduated' && a.status !== 'eliminated');
        if (activeAgents.length === 0) return;

        const round = roundNumber + 1;
        setRoundNumber(round);
        setIsTraining(true);

        const task = TRAINING_TASKS[(round - 1) % TRAINING_TASKS.length];
        setTrainLog(prev => [
            ...prev, '',
            `══════════════════════════════════════`,
            `  ROUND ${round}: ${task.title}`,
            `══════════════════════════════════════`,
            `> ${activeAgents.length} agents competing...`,
        ]);

        // Mark all active agents as training
        setAgents(prev => prev.map(a =>
            activeAgents.find(aa => aa.id === a.id)
                ? { ...a, status: 'training' as const }
                : a
        ));

        try {
            const result = await executeBatchTraining({
                task: { title: task.title, description: task.desc },
                agents: activeAgents.map(a => ({ name: a.name, specialization: a.specialization })),
            });

            // Update agents with results
            setAgents(prev => prev.map(agent => {
                const agentResult = result.results.find((r: BatchAgentResult) => r.agentName === agent.name);
                if (!agentResult) return agent;

                const trustGain = TRUST_BY_RANK[agentResult.rank] || 5;
                const newTrust = Math.min(agent.trustScore + trustGain, GRADUATION_THRESHOLD);

                return {
                    ...agent,
                    trustScore: newTrust,
                    completedTasks: agent.completedTasks + 1,
                    lastResult: agentResult.result,
                    lastScore: agentResult.score,
                    lastRank: agentResult.rank,
                    status: newTrust >= GRADUATION_THRESHOLD ? 'graduated' as const : 'done' as const,
                };
            }));

            // Log results
            const sortedResults = [...result.results].sort((a, b) => a.rank - b.rank);
            sortedResults.forEach((r: BatchAgentResult) => {
                const trustGain = TRUST_BY_RANK[r.rank] || 5;
                setTrainLog(prev => [
                    ...prev,
                    `  ${RANK_LABELS[r.rank] || `${r.rank}th`} ${r.agentName} — Score: ${r.score}/100 — Trust +${trustGain}`,
                ]);
            });

            // Check for graduates
            const newGraduates = sortedResults.filter(r => {
                const agent = agents.find(a => a.name === r.agentName);
                if (!agent) return false;
                const newTrust = Math.min(agent.trustScore + (TRUST_BY_RANK[r.rank] || 5), GRADUATION_THRESHOLD);
                return newTrust >= GRADUATION_THRESHOLD;
            });

            if (newGraduates.length > 0) {
                setTrainLog(prev => [
                    ...prev, '',
                    `> 🏆 ${newGraduates.map(g => g.agentName).join(', ')} reached Trust 100! Ready to graduate.`,
                ]);
            }

        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Training failed';
            setTrainLog(prev => [...prev, `> ERROR: ${msg}`]);
            setAgents(prev => prev.map(a =>
                a.status === 'training' ? { ...a, status: 'done' as const } : a
            ));
        }

        setIsTraining(false);
    };

    // ── Graduation Phase ─────────────────────────────────
    const handleGraduate = async (agent: CompetitorAgent) => {
        if (!publicKey) return;

        setGradAgent(agent);
        setPhase('graduation');
        setGradError(null);
        setGradResult(null);

        const gradData: AgentGraduationData = {
            name: agent.name,
            symbol: agent.symbol,
            description: agent.description,
            specialization: agent.specialization,
            trustScore: agent.trustScore,
        };

        try {
            setGradStatus('uploading');
            const description = generateTokenDescription(gradData);
            const metadataUri = await uploadMetadata(
                gradData.name, gradData.symbol, description, gradData.specialization,
            );

            const mintKeypair = generateMintKeypair();
            const mintAddress = mintKeypair.publicKey.toBase58();

            setGradStatus('building');
            const unsignedTx = await buildCreateTokenTx(
                publicKey.toBase58(), mintAddress, metadataUri,
                gradData.name, gradData.symbol, 0,
            );

            const mintSigned = signWithMintKeypair(unsignedTx, mintKeypair);

            setGradStatus('signing');
            const wallet = wallets.find(w => w.address === publicKey.toBase58());
            if (!wallet) throw new Error('No wallet connected');

            const { signedTransaction } = await signTransaction({
                transaction: mintSigned,
                wallet,
                chain: 'solana:mainnet',
            });

            setGradStatus('confirming');
            const mainnetConnection = new Connection(MAINNET_RPC, 'confirmed');
            const signature = await mainnetConnection.sendRawTransaction(signedTransaction);
            const latestBlockhash = await mainnetConnection.getLatestBlockhash('confirmed');
            await mainnetConnection.confirmTransaction({
                signature, ...latestBlockhash,
            }, 'confirmed');

            const pumpfunUrl = getPumpfunUrl(mintAddress);
            setGradResult({ mintAddress, pumpfunUrl });
            setGradStatus('success');

            saveGraduatedAgent({
                name: gradData.name, symbol: gradData.symbol,
                specialization: gradData.specialization,
                mintAddress, pumpfunUrl, graduatedAt: Date.now(),
                trustScore: gradData.trustScore,
            });
            setGraduatedAgents(getGraduatedAgents());
        } catch (err: unknown) {
            console.error('Graduation failed:', err);
            setGradError(err instanceof Error ? err.message : 'Graduation failed');
            setGradStatus('error');
        }
    };

    // ── Auth Gate ────────────────────────────────────────
    if (!authenticated) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <div style={{
                    textAlign: 'center', padding: '3rem', borderRadius: '1rem',
                    border: '1px solid rgba(255, 107, 53, 0.2)', background: 'rgba(26, 26, 26, 0.5)',
                    maxWidth: '400px',
                }}>
                    <div style={{
                        width: '4rem', height: '4rem', margin: '0 auto 1.5rem',
                        borderRadius: '1rem', background: 'rgba(255, 107, 53, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b35',
                    }}>
                        <WalletIcon size="1.5rem" />
                    </div>
                    <h2 style={{ color: '#e5e5e5', fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>
                        Connect Your Wallet
                    </h2>
                    <p style={{ color: '#6b7280', margin: '0 0 1.5rem 0' }}>
                        Connect to enter the Narkina5 Training Factory.
                    </p>
                    <button onClick={login} style={{
                        fontFamily: 'inherit', fontSize: '1rem', fontWeight: 500,
                        color: '#0a0a0a', background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                        border: 'none', padding: '0.875rem 2rem', borderRadius: '0.5rem',
                        cursor: 'pointer', boxShadow: '0 0 20px rgba(255, 107, 53, 0.3)',
                    }}>
                        Connect Wallet
                    </button>
                </div>
            </div>
        );
    }

    // ── Sorted agents for leaderboard ────────────────────
    const leaderboard = [...agents].sort((a, b) => b.trustScore - a.trustScore || (a.lastRank ?? 99) - (b.lastRank ?? 99));
    const readyToGrad = agents.filter(a => a.status === 'graduated');
    const activeCount = agents.filter(a => a.status !== 'graduated' && a.status !== 'eliminated').length;

    // ── Render ───────────────────────────────────────────
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
            position: 'relative',
        }}>
            {/* Grid overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `
                    linear-gradient(rgba(255, 107, 53, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 107, 53, 0.03) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px', pointerEvents: 'none',
            }} />

            <main style={{
                maxWidth: '80rem', margin: '0 auto',
                padding: '3rem 1.5rem', position: 'relative',
            }}>
                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{
                        fontSize: '1.75rem', fontWeight: 300, margin: 0,
                        color: '#e5e5e5', letterSpacing: '0.1em',
                    }}>Narkina5 Training Arena</h1>
                    <p style={{ color: '#6b7280', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                        Welcome back, <span style={{ color: '#ff6b35' }}>{getDisplayName()}</span>
                        {phase === 'training' && <span style={{ color: '#eab308' }}> &mdash; Round {roundNumber}</span>}
                    </p>
                </div>

                {/* Stats Row */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '1rem', marginBottom: '2rem',
                }}>
                    <StatCard icon={<WalletIcon />} label="Balance" color="#ff6b35"
                        value={balance !== null ? `${balance.toFixed(4)} SOL` : '0.00 SOL'}
                        sub={network} onRefresh={refreshBalance} refreshing={balanceLoading} />
                    <StatCard icon={<TaskIcon />} label="Agents" color="#3b82f6"
                        value={String(agents.length)} sub={`${activeCount} active`} />
                    <StatCard icon={<ChartIcon />} label="Rounds" color="#8b5cf6"
                        value={String(roundNumber)} sub="training rounds" />
                    <StatCard icon={<TaskIcon />} label="Graduated" color="#22c55e"
                        value={String(graduatedAgents.length)} sub="tokens launched" />
                </div>

                {/* ═══ SETUP PHASE ═══ */}
                {phase === 'setup' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {/* Left: Create Agent Form */}
                        <div style={panelStyle}>
                            <h2 style={panelTitle}>Create Competitors</h2>
                            <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '0 0 1rem 0' }}>
                                Add {MIN_AGENTS}-{MAX_AGENTS} agents to compete. Only the strongest survive.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div>
                                    <label style={labelStyle}>Agent Name</label>
                                    <input
                                        type="text" value={newName}
                                        onChange={(e) => {
                                            setNewName(e.target.value);
                                            const auto = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
                                            const prevAuto = newName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
                                            if (!newSymbol || newSymbol === prevAuto) setNewSymbol(auto);
                                        }}
                                        placeholder="e.g. CipherBot"
                                        maxLength={32} style={inputStyle}
                                        onKeyDown={(e) => e.key === 'Enter' && addAgent()}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={labelStyle}>Symbol</label>
                                        <input
                                            type="text" value={newSymbol}
                                            onChange={(e) => setNewSymbol(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6))}
                                            placeholder="CIPHR" maxLength={6} style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Specialization</label>
                                        <select value={newSpec} onChange={(e) => setNewSpec(e.target.value)} style={inputStyle}>
                                            {SPECS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Description (optional)</label>
                                    <input
                                        type="text" value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                        placeholder="What does this agent do?"
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button
                                    onClick={addAgent}
                                    disabled={!newName || agents.length >= MAX_AGENTS}
                                    style={{
                                        ...btnOutline('#ff6b35'),
                                        flex: 1,
                                        opacity: (!newName || agents.length >= MAX_AGENTS) ? 0.4 : 1,
                                        cursor: (!newName || agents.length >= MAX_AGENTS) ? 'default' : 'pointer',
                                    }}
                                >
                                    + Add Agent ({agents.length}/{MAX_AGENTS})
                                </button>
                                <button
                                    onClick={startCompetition}
                                    disabled={agents.length < MIN_AGENTS}
                                    style={{
                                        flex: 1, fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600,
                                        color: agents.length >= MIN_AGENTS ? '#0a0a0a' : '#4b5563',
                                        background: agents.length >= MIN_AGENTS
                                            ? 'linear-gradient(135deg, #ff6b35, #ff8555)' : 'rgba(255,255,255,0.05)',
                                        border: 'none', padding: '0.625rem', borderRadius: '0.375rem',
                                        cursor: agents.length >= MIN_AGENTS ? 'pointer' : 'default',
                                        boxShadow: agents.length >= MIN_AGENTS ? '0 0 20px rgba(255, 107, 53, 0.25)' : 'none',
                                    }}
                                >
                                    Start Competition &rarr;
                                </button>
                            </div>
                        </div>

                        {/* Right: Agent Roster */}
                        <div style={panelStyle}>
                            <h2 style={panelTitle}>Agent Roster</h2>

                            {agents.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                                    <p style={{ color: '#4b5563', fontSize: '0.875rem', margin: 0 }}>
                                        No agents created yet.
                                    </p>
                                    <p style={{ color: '#374151', fontSize: '0.75rem', margin: '0.5rem 0 0 0' }}>
                                        Create at least {MIN_AGENTS} agents to start the competition
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {agents.map((agent) => {
                                        const color = SPEC_COLORS[agent.specialization] || '#ff6b35';
                                        return (
                                            <div key={agent.id} style={{
                                                padding: '0.875rem', borderRadius: '0.5rem',
                                                border: `1px solid ${color}25`,
                                                background: 'rgba(26,26,26,0.3)',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ fontWeight: 600, color: '#e5e5e5', fontSize: '0.9rem' }}>{agent.name}</span>
                                                        <span style={{
                                                            fontSize: '0.6rem', color, fontWeight: 600,
                                                            background: `${color}15`, border: `1px solid ${color}30`,
                                                            padding: '0.1rem 0.35rem', borderRadius: '0.2rem',
                                                        }}>${agent.symbol}</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                                        {agent.specialization}
                                                    </div>
                                                </div>
                                                <button onClick={() => removeAgent(agent.id)} style={{
                                                    background: 'transparent', border: 'none',
                                                    color: '#6b7280', cursor: 'pointer', fontSize: '1rem',
                                                    padding: '0.25rem 0.5rem',
                                                }}>&times;</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Graduated agents history */}
                            {graduatedAgents.length > 0 && (
                                <>
                                    <h3 style={{ ...panelTitle, fontSize: '0.85rem', marginTop: '1.5rem' }}>Previously Graduated</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {graduatedAgents.slice(0, 3).map((agent, idx) => (
                                            <div key={idx} style={{
                                                padding: '0.625rem', borderRadius: '0.375rem',
                                                border: '1px solid rgba(34,197,94,0.15)',
                                                background: 'rgba(34,197,94,0.04)',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            }}>
                                                <span style={{ color: '#e5e5e5', fontSize: '0.8rem' }}>
                                                    {agent.name} <span style={{ color: '#22c55e', fontSize: '0.65rem' }}>${agent.symbol}</span>
                                                </span>
                                                <a href={agent.pumpfunUrl} target="_blank" rel="noopener noreferrer"
                                                    style={{ fontSize: '0.65rem', color: '#22c55e', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                    Pump.fun <ExternalLinkIcon size="0.6rem" />
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* ═══ TRAINING PHASE ═══ */}
                {phase === 'training' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
                        {/* Left: Training Arena */}
                        <div>
                            {/* Agent Cards */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${Math.min(agents.length, 3)}, 1fr)`,
                                gap: '1rem', marginBottom: '1.5rem',
                            }}>
                                {agents.map(agent => {
                                    const color = SPEC_COLORS[agent.specialization] || '#ff6b35';
                                    const isGrad = agent.status === 'graduated';
                                    const borderColor = isGrad ? '#22c55e' : color;

                                    return (
                                        <div key={agent.id} style={{
                                            padding: '1rem', borderRadius: '0.75rem',
                                            border: `1px solid ${borderColor}${isGrad ? '40' : '20'}`,
                                            background: isGrad ? 'rgba(34,197,94,0.04)' : 'rgba(26,26,26,0.4)',
                                            position: 'relative', overflow: 'hidden',
                                        }}>
                                            {/* Training animation */}
                                            {agent.status === 'training' && (
                                                <div style={{
                                                    position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                                                    background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                                                    animation: 'slideRight 1.5s infinite',
                                                }} />
                                            )}

                                            {/* Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                        <span style={{ fontWeight: 600, color: '#e5e5e5', fontSize: '0.85rem' }}>{agent.name}</span>
                                                        {agent.lastRank && agent.lastRank <= 3 && (
                                                            <span style={{
                                                                fontSize: '0.55rem', fontWeight: 700,
                                                                color: agent.lastRank === 1 ? '#eab308' : agent.lastRank === 2 ? '#94a3b8' : '#d97706',
                                                                background: `${agent.lastRank === 1 ? '#eab308' : agent.lastRank === 2 ? '#94a3b8' : '#d97706'}15`,
                                                                padding: '0.1rem 0.3rem', borderRadius: '0.15rem',
                                                            }}>
                                                                {RANK_LABELS[agent.lastRank]}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '0.65rem', color: '#6b7280', marginTop: '0.15rem' }}>
                                                        {agent.specialization} &middot; {agent.completedTasks} tasks
                                                    </div>
                                                </div>
                                                {isGrad && (
                                                    <button
                                                        onClick={() => handleGraduate(agent)}
                                                        style={{
                                                            fontFamily: 'inherit', fontSize: '0.6rem', fontWeight: 600,
                                                            color: '#0a0a0a', background: '#22c55e',
                                                            border: 'none', padding: '0.25rem 0.5rem',
                                                            borderRadius: '0.25rem', cursor: 'pointer',
                                                        }}
                                                    >Graduate</button>
                                                )}
                                            </div>

                                            {/* Trust Bar */}
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                    <span style={{ fontSize: '0.6rem', color: '#6b7280' }}>Trust</span>
                                                    <span style={{
                                                        fontSize: '0.6rem', fontWeight: 600,
                                                        color: isGrad ? '#22c55e' : color,
                                                    }}>
                                                        {isGrad ? 'READY' : `${agent.trustScore}/100`}
                                                    </span>
                                                </div>
                                                <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.05)' }}>
                                                    <div style={{
                                                        height: '100%', borderRadius: '2px',
                                                        background: isGrad ? '#22c55e' : color,
                                                        width: `${agent.trustScore}%`,
                                                        transition: 'width 0.5s ease',
                                                    }} />
                                                </div>
                                            </div>

                                            {/* Last Score */}
                                            {agent.lastScore !== undefined && (
                                                <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
                                                    Last: <span style={{ color, fontWeight: 600 }}>{agent.lastScore}/100</span>
                                                    {agent.lastRank && (
                                                        <span> &middot; +{TRUST_BY_RANK[agent.lastRank] || 5} trust</span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Mini log */}
                                            {agent.lastResult && (
                                                <div style={{
                                                    marginTop: '0.5rem', padding: '0.5rem',
                                                    borderRadius: '0.25rem', background: 'rgba(0,0,0,0.3)',
                                                    maxHeight: '60px', overflowY: 'auto',
                                                }}>
                                                    {parseExecutionSteps(agent.lastResult).slice(0, 3).map((line, i) => (
                                                        <div key={i} style={{ fontSize: '0.55rem', color: '#6b7280', lineHeight: 1.5 }}>
                                                            {line.slice(0, 80)}{line.length > 80 ? '...' : ''}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Training Log + Controls */}
                            <div style={panelStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <h2 style={{ ...panelTitle, margin: 0 }}>Training Log</h2>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={runTrainingRound}
                                            disabled={isTraining || activeCount === 0}
                                            style={{
                                                fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 600,
                                                color: isTraining ? '#ff6b35' : '#0a0a0a',
                                                background: isTraining
                                                    ? 'rgba(255,107,53,0.08)' : 'linear-gradient(135deg, #ff6b35, #ff8555)',
                                                border: isTraining ? '1px solid rgba(255,107,53,0.2)' : 'none',
                                                padding: '0.5rem 1rem', borderRadius: '0.375rem',
                                                cursor: isTraining ? 'default' : 'pointer',
                                                boxShadow: isTraining ? 'none' : '0 0 15px rgba(255,107,53,0.2)',
                                            }}
                                        >
                                            {isTraining ? 'Training...' : 'Run Training Round'}
                                        </button>
                                        {readyToGrad.length > 0 && (
                                            <button
                                                onClick={() => setPhase('setup')}
                                                style={btnOutline('#6b7280')}
                                            >Back to Setup</button>
                                        )}
                                    </div>
                                </div>

                                <div style={{
                                    padding: '0.75rem', borderRadius: '0.375rem',
                                    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.04)',
                                    maxHeight: '250px', overflowY: 'auto',
                                    fontFamily: '"JetBrains Mono", monospace',
                                }}>
                                    {trainLog.map((line, i) => (
                                        <div key={i} style={{
                                            fontSize: '0.7rem', lineHeight: 1.6,
                                            color: line.includes('ERROR') ? '#ef4444'
                                                : line.includes('1st') ? '#eab308'
                                                : line.includes('ROUND') ? '#ff6b35'
                                                : line.includes('graduated') || line.includes('Graduate') || line.includes('Trust 100') ? '#22c55e'
                                                : line.startsWith('>') ? '#ff6b35'
                                                : line.startsWith('══') ? '#ff6b3580'
                                                : '#9ca3af',
                                            fontWeight: line.includes('ROUND') || line.includes('══') ? 600 : 400,
                                        }}>{line || '\u00A0'}</div>
                                    ))}
                                    {isTraining && (
                                        <div style={{ fontSize: '0.7rem', color: '#ff6b35' }}>
                                            <span style={{ animation: 'blink 1s infinite' }}>_</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right: Leaderboard */}
                        <div style={panelStyle}>
                            <h2 style={panelTitle}>Leaderboard</h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {leaderboard.map((agent, idx) => {
                                    const color = SPEC_COLORS[agent.specialization] || '#ff6b35';
                                    const isGrad = agent.status === 'graduated';
                                    return (
                                        <div key={agent.id} style={{
                                            padding: '0.75rem', borderRadius: '0.5rem',
                                            border: `1px solid ${isGrad ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)'}`,
                                            background: isGrad ? 'rgba(34,197,94,0.04)' : 'rgba(26,26,26,0.3)',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                <span style={{
                                                    fontSize: '0.7rem', fontWeight: 700,
                                                    color: idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : idx === 2 ? '#d97706' : '#4b5563',
                                                    width: '1.25rem',
                                                }}>#{idx + 1}</span>
                                                <span style={{ fontWeight: 600, color: '#e5e5e5', fontSize: '0.8rem', flex: 1 }}>
                                                    {agent.name}
                                                </span>
                                                {isGrad && (
                                                    <span style={{
                                                        fontSize: '0.55rem', color: '#22c55e', fontWeight: 600,
                                                        background: 'rgba(34,197,94,0.1)',
                                                        padding: '0.1rem 0.3rem', borderRadius: '0.15rem',
                                                    }}>READY</span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{
                                                    flex: 1, height: '4px', borderRadius: '2px',
                                                    background: 'rgba(255,255,255,0.05)',
                                                }}>
                                                    <div style={{
                                                        height: '100%', borderRadius: '2px',
                                                        background: isGrad ? '#22c55e' : color,
                                                        width: `${agent.trustScore}%`,
                                                        transition: 'width 0.5s ease',
                                                    }} />
                                                </div>
                                                <span style={{
                                                    fontSize: '0.65rem', fontWeight: 600,
                                                    color: isGrad ? '#22c55e' : color,
                                                    minWidth: '2rem', textAlign: 'right',
                                                }}>{agent.trustScore}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Trust Distribution Legend */}
                            <div style={{
                                marginTop: '1.5rem', padding: '0.75rem', borderRadius: '0.375rem',
                                background: 'rgba(0,0,0,0.3)',
                            }}>
                                <div style={{ fontSize: '0.65rem', color: '#6b7280', marginBottom: '0.5rem', fontWeight: 600 }}>
                                    TRUST PER ROUND
                                </div>
                                {Object.entries(TRUST_BY_RANK).map(([rank, trust]) => (
                                    <div key={rank} style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        fontSize: '0.6rem', color: '#9ca3af', lineHeight: 1.8,
                                    }}>
                                        <span>{RANK_LABELS[Number(rank)] || `${rank}th`}</span>
                                        <span style={{ color: '#ff6b35' }}>+{trust}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ GRADUATION PHASE ═══ */}
                {phase === 'graduation' && gradAgent && (
                    <div style={{
                        maxWidth: '500px', margin: '2rem auto', textAlign: 'center',
                        ...panelStyle, padding: '2.5rem',
                    }}>
                        {gradStatus !== 'idle' && gradStatus !== 'success' && gradStatus !== 'error' ? (
                            <>
                                <div style={{
                                    width: '3rem', height: '3rem', margin: '0 auto 1.5rem',
                                    border: '2px solid rgba(34, 197, 94, 0.2)', borderTopColor: '#22c55e',
                                    borderRadius: '50%', animation: 'spin 1s linear infinite',
                                }} />
                                <p style={{ color: '#e5e5e5', fontSize: '1rem', margin: '0 0 0.5rem 0', fontWeight: 500 }}>
                                    {gradStatus === 'uploading' && 'Uploading Metadata...'}
                                    {gradStatus === 'building' && 'Building Token...'}
                                    {gradStatus === 'signing' && 'Approve in Wallet...'}
                                    {gradStatus === 'confirming' && 'Confirming Launch...'}
                                </p>
                                <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: 0 }}>
                                    Graduating <span style={{ color: '#22c55e' }}>{gradAgent.name}</span> to Pump.fun
                                </p>
                            </>
                        ) : gradStatus === 'success' && gradResult ? (
                            <>
                                <div style={{
                                    width: '3rem', height: '3rem', margin: '0 auto 1rem',
                                    borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)',
                                    border: '2px solid rgba(34, 197, 94, 0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#22c55e', fontSize: '1.5rem',
                                }}>&#10003;</div>
                                <p style={{ color: '#22c55e', fontSize: '1.125rem', margin: '0 0 0.25rem 0', fontWeight: 600 }}>
                                    {gradAgent.name} Launched!
                                </p>
                                <p style={{ color: '#6b7280', fontSize: '0.7rem', margin: '0 0 1rem 0', wordBreak: 'break-all' }}>
                                    {gradResult.mintAddress}
                                </p>
                                <a href={gradResult.pumpfunUrl} target="_blank" rel="noopener noreferrer" style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                    fontSize: '0.8rem', color: '#22c55e', textDecoration: 'none',
                                    padding: '0.5rem 1rem', borderRadius: '0.375rem',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    background: 'rgba(34, 197, 94, 0.06)',
                                }}>View on Pump.fun <ExternalLinkIcon /></a>
                                <br />
                                <button onClick={() => { setPhase('training'); setGradStatus('idle'); setGradResult(null); }} style={{
                                    marginTop: '1rem', fontFamily: 'inherit', fontSize: '0.8rem',
                                    color: '#6b7280', background: 'transparent', border: 'none',
                                    cursor: 'pointer', textDecoration: 'underline',
                                }}>Back to Arena</button>
                            </>
                        ) : gradStatus === 'error' ? (
                            <>
                                <div style={{
                                    width: '3rem', height: '3rem', margin: '0 auto 1rem',
                                    borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
                                    border: '2px solid rgba(239, 68, 68, 0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#ef4444', fontSize: '1.25rem',
                                }}>&#10007;</div>
                                <p style={{ color: '#ef4444', fontSize: '1rem', margin: '0 0 0.5rem 0', fontWeight: 500 }}>Launch Failed</p>
                                <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0 0 1rem 0', wordBreak: 'break-word' }}>{gradError}</p>
                                <button onClick={() => { setPhase('training'); setGradStatus('idle'); setGradError(null); }} style={{
                                    fontFamily: 'inherit', fontSize: '0.8rem', color: '#6b7280',
                                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                                    padding: '0.5rem 1.25rem', borderRadius: '0.375rem', cursor: 'pointer',
                                }}>Back to Arena</button>
                            </>
                        ) : null}
                    </div>
                )}
            </main>
        </div>
    );
}

// ── Styles ────────────────────────────────────────────────
const panelStyle: React.CSSProperties = {
    padding: '1.5rem', borderRadius: '0.75rem',
    border: '1px solid rgba(255, 107, 53, 0.15)', background: 'rgba(26, 26, 26, 0.4)',
};

const panelTitle: React.CSSProperties = {
    fontSize: '1rem', fontWeight: 500, color: '#e5e5e5',
    margin: '0 0 1rem 0', letterSpacing: '0.05em',
};

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '0.7rem', fontWeight: 500, color: '#6b7280',
    marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.1em',
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.5rem 0.625rem', borderRadius: '0.375rem',
    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(26,26,26,0.6)',
    color: '#e5e5e5', fontSize: '0.8rem', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
};

function btnOutline(color: string): React.CSSProperties {
    return {
        fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 500,
        color: '#e5e5e5', background: 'transparent',
        border: `1px solid ${color}40`, padding: '0.625rem',
        borderRadius: '0.375rem', cursor: 'pointer',
    };
}

// ── Stat Card Component ──────────────────────────────────
function StatCard({ icon, label, color, value, sub, onRefresh, refreshing }: {
    icon: React.ReactNode; label: string; color: string; value: string; sub: string;
    onRefresh?: () => void; refreshing?: boolean;
}) {
    return (
        <div style={{
            padding: '1.25rem', borderRadius: '0.5rem',
            border: `1px solid ${color}25`, background: 'rgba(26, 26, 26, 0.4)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ color }}>{icon}</span>
                <span style={{ color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
                {onRefresh && (
                    <button onClick={onRefresh} disabled={refreshing} style={{
                        marginLeft: 'auto', background: 'transparent', border: 'none',
                        color: '#6b7280', cursor: 'pointer', fontSize: '0.7rem',
                    }}>{refreshing ? '...' : 'Refresh'}</button>
                )}
            </div>
            <p style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e5e5e5', margin: 0 }}>{value}</p>
            <p style={{ fontSize: '0.7rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>{sub}</p>
        </div>
    );
}

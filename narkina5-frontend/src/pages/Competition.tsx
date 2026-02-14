import { useState, useCallback, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets, useSignTransaction } from '@privy-io/react-auth/solana';
import { Connection } from '@solana/web3.js';
import { useSolana } from '../contexts/SolanaContext';
import {
    initializeCompetition,
    simulateScore,
    getTaskForFloor,
    shouldUseRealAI,
    getSpotlightCount,
    FLOOR_CONFIG,
    FLOOR_COLORS,
    SPEC_COLORS,
    type CompetitionState,
    type PrisonAgent,
    type CompetitionLogEntry,
} from '../services/competition';
import { executeBatchTraining, parseExecutionSteps } from '../services/agent';
import {
    uploadMetadata,
    generateMintKeypair,
    buildCreateTokenTx,
    signWithMintKeypair,
    generateTokenDescription,
    getPumpfunUrl,
    saveGraduatedAgent,
} from '../services/pumpfun';
import { ExternalLinkIcon } from '../components/Icons';

type GradStatus = 'idle' | 'uploading' | 'building' | 'signing' | 'confirming' | 'success' | 'error';
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

export function Competition() {
    const { authenticated, login } = usePrivy();
    const { wallets } = useWallets();
    const { signTransaction } = useSignTransaction();
    const { publicKey } = useSolana();

    const [comp, setComp] = useState<CompetitionState | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [autoPlay, setAutoPlay] = useState(false);
    const [spotlightAgent, setSpotlightAgent] = useState<PrisonAgent | null>(null);
    const [selectedFloor, setSelectedFloor] = useState(1);

    // Graduation
    const [gradStatus, setGradStatus] = useState<GradStatus>('idle');
    const [gradError, setGradError] = useState<string | null>(null);
    const [gradResult, setGradResult] = useState<{ mintAddress: string; pumpfunUrl: string } | null>(null);

    const logRef = useRef<HTMLDivElement>(null);
    const autoPlayRef = useRef(autoPlay);
    autoPlayRef.current = autoPlay;

    // Auto-scroll log
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [comp?.log.length]);

    // Auto-play timer
    useEffect(() => {
        if (!autoPlay || !comp || comp.status === 'complete' || isRunning) return;
        const timer = setTimeout(() => {
            if (autoPlayRef.current) runRound();
        }, 2000);
        return () => clearTimeout(timer);
    }, [autoPlay, comp?.currentFloor, comp?.currentRound, isRunning]);

    // ── Initialize ────────────────────────────────────────
    const handleInit = useCallback(() => {
        const state = initializeCompetition();
        state.status = 'running';
        setComp(state);
        setSelectedFloor(1);
        setSpotlightAgent(null);
        setGradStatus('idle');
        setGradResult(null);
    }, []);

    // ── Run a single round ────────────────────────────────
    const runRound = useCallback(async () => {
        if (!comp || isRunning || comp.status === 'complete') return;
        setIsRunning(true);

        const state = structuredClone(comp);
        const floorIdx = state.currentFloor - 1;
        const floor = state.floors[floorIdx];
        const floorConfig = FLOOR_CONFIG[floorIdx];
        const task = getTaskForFloor(state.currentFloor);
        const roundSeed = Date.now();

        // Log round start
        addLog(state, state.currentFloor, 'round_start',
            `Floor ${state.currentFloor} "${floor.label}" — Round ${state.currentRound}/${floorConfig.rounds}: ${task.title}`);

        // Mark rooms as competing
        floor.rooms.forEach(r => { r.status = 'competing'; });

        // Score each room
        for (const room of floor.rooms) {
            const roomAgents = room.agents.map(id => state.agents[id]).filter(Boolean);

            // Simulate scores for all agents in room
            roomAgents.forEach(agent => {
                const score = simulateScore(agent, task, state.currentFloor, roundSeed);
                agent.roundScores.push(score);
                agent.totalScore += score;
                agent.isSpotlight = false;
            });

            // Spotlight: real AI calls for top agents on floors 3+
            if (shouldUseRealAI(state.currentFloor)) {
                const spotlightCount = getSpotlightCount(state.currentFloor);
                const sorted = [...roomAgents].sort((a, b) => b.totalScore - a.totalScore);
                const spotlightAgents = sorted.slice(0, spotlightCount);

                if (spotlightAgents.length > 0) {
                    try {
                        const result = await executeBatchTraining({
                            task: { title: task.title, description: task.description },
                            agents: spotlightAgents.map(a => ({
                                name: a.name,
                                specialization: a.specialization,
                            })),
                        });

                        state.apiCallsMade += spotlightAgents.length + 1; // agents + judge

                        result.results.forEach(r => {
                            const agent = roomAgents.find(a => a.name === r.agentName);
                            if (agent) {
                                // Replace simulated score with real AI score
                                const simIdx = agent.roundScores.length - 1;
                                agent.totalScore -= agent.roundScores[simIdx];
                                agent.roundScores[simIdx] = r.score;
                                agent.totalScore += r.score;
                                agent.lastAiOutput = r.result;
                                agent.isSpotlight = true;
                            }
                        });

                        addLog(state, state.currentFloor, 'spotlight',
                            `AI spotlight: ${spotlightAgents.map(a => a.name).join(', ')}`);
                    } catch {
                        addLog(state, state.currentFloor, 'system', 'AI spotlight failed, using simulated scores');
                    }
                }
            }

            // Rank agents within room
            const ranked = [...roomAgents].sort((a, b) => b.totalScore - a.totalScore);
            ranked.forEach((a, i) => { a.rank = i + 1; });

            room.status = 'complete';
        }

        // Log round results (top agent per room)
        for (const room of floor.rooms) {
            const roomAgents = room.agents.map(id => state.agents[id]).filter(Boolean);
            const top = roomAgents.reduce((best, a) => a.totalScore > best.totalScore ? a : best, roomAgents[0]);
            if (top) {
                addLog(state, state.currentFloor, 'round_end',
                    `Room ${room.roomIndex + 1} leader: ${top.name} (${top.totalScore} pts)`);
            }
        }

        // Check if all rounds for this floor are done
        if (state.currentRound >= floorConfig.rounds) {
            // Eliminate bottom agents, advance top
            let advancingIds: string[] = [];
            for (const room of floor.rooms) {
                const roomAgents = room.agents.map(id => state.agents[id]).filter(Boolean);
                const sorted = [...roomAgents].sort((a, b) => b.totalScore - a.totalScore);

                const advancing = sorted.slice(0, floor.advancingPerRoom);
                const eliminated = sorted.slice(floor.advancingPerRoom);

                advancing.forEach(a => { a.status = 'advancing'; });
                eliminated.forEach(a => {
                    a.status = 'eliminated';
                    a.floor = 0;
                });

                advancingIds.push(...advancing.map(a => a.id));

                if (eliminated.length > 0) {
                    addLog(state, state.currentFloor, 'elimination',
                        `Eliminated: ${eliminated.map(a => a.name).join(', ')}`);
                }
            }

            addLog(state, state.currentFloor, 'advancement',
                `${advancingIds.length} agents advance from Floor ${state.currentFloor}`);

            floor.status = 'complete';

            // Move to next floor
            const nextFloorIdx = floorIdx + 1;
            if (nextFloorIdx < state.floors.length) {
                const nextFloor = state.floors[nextFloorIdx];
                const nextConfig = FLOOR_CONFIG[nextFloorIdx];
                nextFloor.status = 'active';

                // Reset advancing agents for new floor
                advancingIds.forEach(id => {
                    state.agents[id].status = 'competing';
                    state.agents[id].roundScores = [];
                    state.agents[id].totalScore = 0;
                    state.agents[id].rank = 0;
                    state.agents[id].floor = nextConfig.number;
                    state.agents[id].isSpotlight = false;
                    state.agents[id].lastAiOutput = undefined;
                });

                // Distribute agents across rooms on new floor
                for (let r = 0; r < nextConfig.rooms; r++) {
                    const start = r * nextConfig.perRoom;
                    const end = start + nextConfig.perRoom;
                    nextFloor.rooms[r].agents = advancingIds.slice(start, end);
                    advancingIds.slice(start, end).forEach(id => {
                        state.agents[id].room = r;
                    });
                }

                state.currentFloor = nextConfig.number;
                state.currentRound = 1;
                setSelectedFloor(nextConfig.number);

                addLog(state, nextConfig.number, 'system',
                    `Floor ${nextConfig.number} "${nextConfig.label}" unlocked. ${advancingIds.length} agents compete.`);
            } else {
                // Competition complete — pick winner
                const finalRoom = floor.rooms[0];
                const finalists = finalRoom.agents.map(id => state.agents[id]).filter(Boolean);
                const winner = finalists.reduce((best, a) => a.totalScore > best.totalScore ? a : best, finalists[0]);

                if (winner) {
                    winner.status = 'graduated';
                    state.winner = winner.id;
                    state.status = 'complete';

                    addLog(state, state.currentFloor, 'graduation',
                        `WINNER: ${winner.name} ($${winner.symbol}) graduates from Narkina5!`);
                }
            }
        } else {
            state.currentRound += 1;
        }

        setComp(state);
        setIsRunning(false);
    }, [comp, isRunning]);

    // ── Graduation (Pump.fun) ─────────────────────────────
    const handleGraduate = async () => {
        if (!comp || !comp.winner || !publicKey) return;
        const winner = comp.agents[comp.winner];
        if (!winner) return;

        setGradError(null);
        setGradResult(null);

        try {
            setGradStatus('uploading');
            const description = generateTokenDescription({
                name: winner.name, symbol: winner.symbol,
                description: `Champion of Narkina5 Prison Arena. Survived 64 agents across 5 floors.`,
                specialization: winner.specialization, trustScore: 100,
            });
            const metadataUri = await uploadMetadata(
                winner.name, winner.symbol, description, winner.specialization,
            );

            const mintKeypair = generateMintKeypair();
            const mintAddress = mintKeypair.publicKey.toBase58();

            setGradStatus('building');
            const unsignedTx = await buildCreateTokenTx(
                publicKey.toBase58(), mintAddress, metadataUri,
                winner.name, winner.symbol, 0,
            );
            const mintSigned = signWithMintKeypair(unsignedTx, mintKeypair);

            setGradStatus('signing');
            const wallet = wallets.find(w => w.address === publicKey.toBase58());
            if (!wallet) throw new Error('No wallet connected');

            const { signedTransaction } = await signTransaction({
                transaction: mintSigned, wallet, chain: 'solana:mainnet',
            });

            setGradStatus('confirming');
            const mainnetConn = new Connection(MAINNET_RPC, 'confirmed');
            const signature = await mainnetConn.sendRawTransaction(signedTransaction);
            const latestBlockhash = await mainnetConn.getLatestBlockhash('confirmed');
            await mainnetConn.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');

            const pumpfunUrl = getPumpfunUrl(mintAddress);
            setGradResult({ mintAddress, pumpfunUrl });
            setGradStatus('success');

            saveGraduatedAgent({
                name: winner.name, symbol: winner.symbol,
                specialization: winner.specialization,
                mintAddress, pumpfunUrl, graduatedAt: Date.now(), trustScore: 100,
            });
        } catch (err: unknown) {
            console.error('Graduation failed:', err);
            setGradError(err instanceof Error ? err.message : 'Graduation failed');
            setGradStatus('error');
        }
    };

    // ── Render: Not initialized ───────────────────────────
    if (!comp) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Grid Background */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `
                        linear-gradient(rgba(239, 68, 68, 0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(239, 68, 68, 0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px', pointerEvents: 'none',
                }} />
                {/* Gradient Orb */}
                <div style={{
                    position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
                    width: '50rem', height: '50rem',
                    background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, rgba(255, 107, 53, 0.04) 40%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                <div style={{
                    position: 'relative', maxWidth: 700, margin: '0 auto',
                    padding: '6rem 1.5rem', textAlign: 'center',
                }}>
                    {/* Title */}
                    <div style={{
                        fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.35em',
                        color: '#ef4444', textTransform: 'uppercase', marginBottom: '1rem',
                    }}>
                        NARKINA5 MAXIMUM SECURITY
                    </div>
                    <h1 style={{
                        fontSize: '3rem', fontWeight: 700, margin: '0 0 0.5rem 0',
                        background: 'linear-gradient(135deg, #ff6b35, #ef4444)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                        letterSpacing: '0.08em',
                    }}>
                        Prison Arena
                    </h1>
                    <p style={{
                        fontSize: '1.15rem', color: '#9ca3af', margin: '1rem 0 2.5rem 0',
                        lineHeight: 1.7, maxWidth: 500, marginLeft: 'auto', marginRight: 'auto',
                    }}>
                        64 AI agents enter. They compete across 5 floors.<br />
                        Each floor eliminates the weak.<br />
                        <span style={{ color: '#22c55e', fontWeight: 500 }}>Only 1 graduates to Pump.fun.</span>
                    </p>

                    {/* Floor Pyramid */}
                    <div style={{
                        display: 'flex', flexDirection: 'column', gap: '4px',
                        alignItems: 'center', marginBottom: '2.5rem',
                    }}>
                        {[...FLOOR_CONFIG].reverse().map(f => {
                            const widthPercent = 30 + (6 - f.number) * 15;
                            return (
                                <div key={f.number} style={{
                                    width: `${widthPercent}%`, padding: '0.6rem 1rem',
                                    borderRadius: '0.375rem', fontSize: '0.7rem',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    color: FLOOR_COLORS[f.number],
                                    border: `1px solid ${FLOOR_COLORS[f.number]}25`,
                                    background: `${FLOOR_COLORS[f.number]}08`,
                                }}>
                                    <span style={{ fontWeight: 600 }}>F{f.number} {f.label}</span>
                                    <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>
                                        {f.agents} agents &middot; {f.rooms} rooms &middot; {f.rounds} rounds
                                    </span>
                                </div>
                            );
                        })}
                        <div style={{
                            width: '25%', padding: '0.6rem 1rem', borderRadius: '0.375rem',
                            fontSize: '0.7rem', fontWeight: 700, textAlign: 'center',
                            color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)',
                            background: 'rgba(34,197,94,0.08)',
                            boxShadow: '0 0 20px rgba(34,197,94,0.15)',
                        }}>
                            1 GRADUATE
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{
                        display: 'flex', justifyContent: 'center', gap: '2rem',
                        marginBottom: '2.5rem', flexWrap: 'wrap',
                    }}>
                        {[
                            { value: '64', label: 'Agents' },
                            { value: '5', label: 'Floors' },
                            { value: '16', label: 'Rooms' },
                            { value: '1', label: 'Survivor' },
                        ].map(s => (
                            <div key={s.label} style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontSize: '1.75rem', fontWeight: 700, color: '#ff6b35',
                                    lineHeight: 1,
                                }}>{s.value}</div>
                                <div style={{
                                    fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase',
                                    letterSpacing: '0.1em', marginTop: '0.25rem',
                                }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* How it works */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem',
                        marginBottom: '2.5rem', textAlign: 'left',
                    }}>
                        {[
                            { step: '01', title: 'COMPETE', desc: 'Agents are scored on tasks matching their specialization. AI judges evaluate the top performers.' },
                            { step: '02', title: 'ELIMINATE', desc: 'Bottom agents on each floor are cut. Survivors advance to the next floor with higher stakes.' },
                            { step: '03', title: 'GRADUATE', desc: 'The last agent standing earns freedom. Launch a memecoin on Pump.fun and enter the real world.' },
                        ].map(item => (
                            <div key={item.step} style={{
                                padding: '1.25rem', borderRadius: '0.5rem',
                                border: '1px solid rgba(255,107,53,0.1)', background: 'rgba(26,26,26,0.4)',
                            }}>
                                <span style={{
                                    fontSize: '1.5rem', fontWeight: 200, color: 'rgba(255,107,53,0.25)',
                                    display: 'block', marginBottom: '0.5rem',
                                }}>{item.step}</span>
                                <div style={{
                                    fontSize: '0.75rem', fontWeight: 600, color: '#ff6b35',
                                    letterSpacing: '0.08em', marginBottom: '0.35rem',
                                }}>{item.title}</div>
                                <div style={{ fontSize: '0.7rem', color: '#6b7280', lineHeight: 1.5 }}>
                                    {item.desc}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <button onClick={handleInit} style={{
                        fontFamily: 'inherit', fontSize: '1rem', fontWeight: 600,
                        color: '#0a0a0a', background: 'linear-gradient(135deg, #ff6b35, #ef4444)',
                        border: 'none', padding: '1rem 3rem', borderRadius: '0.5rem',
                        cursor: 'pointer', boxShadow: '0 0 40px rgba(255, 107, 53, 0.35)',
                        letterSpacing: '0.1em', transition: 'all 0.2s ease',
                    }}>
                        INITIALIZE PRISON
                    </button>
                    <p style={{ fontSize: '0.65rem', color: '#4b5563', marginTop: '0.75rem' }}>
                        No wallet required to spectate. Connect wallet to graduate the winner.
                    </p>
                </div>
            </div>
        );
    }

    // ── Derived state ─────────────────────────────────────
    const currentFloor = comp.floors[selectedFloor - 1];
    const floorColor = FLOOR_COLORS[selectedFloor] || '#6b7280';
    const allAgents = Object.values(comp.agents);
    const aliveCount = allAgents.filter(a => a.status !== 'eliminated').length;
    const eliminatedCount = allAgents.filter(a => a.status === 'eliminated').length;
    const winner = comp.winner ? comp.agents[comp.winner] : null;

    // ── Main render ───────────────────────────────────────
    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
            position: 'relative',
        }}>
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `
                    linear-gradient(rgba(255, 107, 53, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 107, 53, 0.03) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px', pointerEvents: 'none',
            }} />

            <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '2rem 1.5rem', position: 'relative' }}>

                {/* ── Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 300, margin: 0, color: '#e5e5e5', letterSpacing: '0.1em' }}>
                            Prison Arena
                        </h1>
                        <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                            Floor {comp.currentFloor} &middot; Round {comp.currentRound} &middot;
                            <span style={{ color: '#22c55e' }}> {aliveCount} alive</span> &middot;
                            <span style={{ color: '#ef4444' }}> {eliminatedCount} eliminated</span> &middot;
                            <span style={{ color: '#8b5cf6' }}> {comp.apiCallsMade} AI calls</span>
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <label style={{
                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                            fontSize: '0.7rem', color: autoPlay ? '#ff6b35' : '#6b7280', cursor: 'pointer',
                        }}>
                            <input type="checkbox" checked={autoPlay}
                                onChange={(e) => setAutoPlay(e.target.checked)}
                                style={{ accentColor: '#ff6b35' }} />
                            Auto-Play
                        </label>
                        <button
                            onClick={runRound}
                            disabled={isRunning || comp.status === 'complete'}
                            style={{
                                fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 600,
                                color: isRunning ? '#ff6b35' : '#0a0a0a',
                                background: isRunning ? 'rgba(255,107,53,0.08)' : 'linear-gradient(135deg, #ff6b35, #ff8555)',
                                border: isRunning ? '1px solid rgba(255,107,53,0.2)' : 'none',
                                padding: '0.5rem 1.25rem', borderRadius: '0.375rem',
                                cursor: (isRunning || comp.status === 'complete') ? 'default' : 'pointer',
                                opacity: comp.status === 'complete' ? 0.4 : 1,
                            }}
                        >
                            {isRunning ? 'Running...' : 'Run Round'}
                        </button>
                        <button onClick={handleInit} style={{
                            fontFamily: 'inherit', fontSize: '0.7rem', color: '#6b7280',
                            background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                            padding: '0.5rem 0.75rem', borderRadius: '0.375rem', cursor: 'pointer',
                        }}>Reset</button>
                    </div>
                </div>

                {/* ── Floor Pyramid ── */}
                <div style={{
                    display: 'flex', gap: '2px', marginBottom: '1.5rem',
                    borderRadius: '0.5rem', overflow: 'hidden',
                }}>
                    {comp.floors.map(floor => {
                        const fColor = FLOOR_COLORS[floor.number];
                        const isActive = floor.number === selectedFloor;
                        const isCurrent = floor.number === comp.currentFloor;
                        const agentsOnFloor = allAgents.filter(a => a.floor === floor.number && a.status !== 'eliminated').length;
                        return (
                            <button key={floor.number} onClick={() => setSelectedFloor(floor.number)}
                                style={{
                                    flex: floor.number === 1 ? 5 : floor.number === 2 ? 4 : floor.number === 3 ? 3 : floor.number === 4 ? 2 : 1,
                                    padding: '0.625rem 0.5rem', border: 'none', cursor: 'pointer',
                                    fontFamily: 'inherit', fontSize: '0.6rem', fontWeight: 600,
                                    background: isActive ? `${fColor}25` : 'rgba(26,26,26,0.6)',
                                    color: floor.status === 'locked' ? '#4b5563' : fColor,
                                    borderBottom: isCurrent ? `2px solid ${fColor}` : '2px solid transparent',
                                    transition: 'all 0.2s',
                                }}>
                                <div>F{floor.number}</div>
                                <div style={{ fontSize: '0.5rem', fontWeight: 400, marginTop: '0.15rem', color: floor.status === 'locked' ? '#374151' : '#6b7280' }}>
                                    {floor.status === 'locked' ? 'LOCKED' : floor.status === 'complete' ? `${floor.label}` : `${agentsOnFloor} agents`}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* ── Winner Banner ── */}
                {winner && comp.status === 'complete' && (
                    <div style={{
                        padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem',
                        border: '1px solid rgba(34,197,94,0.3)',
                        background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))',
                        textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '0.7rem', color: '#22c55e', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>CHAMPION</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e5e5e5', marginBottom: '0.25rem' }}>
                            {winner.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#22c55e', marginBottom: '1rem' }}>
                            ${winner.symbol} &middot; {winner.specialization} &middot; Survived 64 agents
                        </div>

                        {gradStatus === 'idle' && (
                            authenticated ? (
                                <button onClick={handleGraduate} style={{
                                    fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600,
                                    color: '#0a0a0a', background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                    border: 'none', padding: '0.75rem 2rem', borderRadius: '0.375rem',
                                    cursor: 'pointer', boxShadow: '0 0 25px rgba(34,197,94,0.3)',
                                }}>
                                    Graduate to Pump.fun
                                </button>
                            ) : (
                                <button onClick={login} style={{
                                    fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 500,
                                    color: '#0a0a0a', background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                                    border: 'none', padding: '0.75rem 2rem', borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                }}>
                                    Connect Wallet to Graduate
                                </button>
                            )
                        )}
                        {gradStatus !== 'idle' && gradStatus !== 'success' && gradStatus !== 'error' && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <div style={{
                                    width: '1.25rem', height: '1.25rem',
                                    border: '2px solid rgba(34,197,94,0.2)', borderTopColor: '#22c55e',
                                    borderRadius: '50%', animation: 'spin 1s linear infinite',
                                }} />
                                <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>
                                    {gradStatus === 'uploading' && 'Uploading metadata...'}
                                    {gradStatus === 'building' && 'Building token...'}
                                    {gradStatus === 'signing' && 'Approve in wallet...'}
                                    {gradStatus === 'confirming' && 'Confirming...'}
                                </span>
                            </div>
                        )}
                        {gradStatus === 'success' && gradResult && (
                            <div>
                                <p style={{ color: '#22c55e', fontSize: '0.85rem', margin: '0 0 0.5rem 0', fontWeight: 600 }}>Token Launched!</p>
                                <a href={gradResult.pumpfunUrl} target="_blank" rel="noopener noreferrer" style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                    fontSize: '0.8rem', color: '#22c55e', textDecoration: 'none',
                                    padding: '0.5rem 1rem', borderRadius: '0.375rem',
                                    border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.06)',
                                }}>View on Pump.fun <ExternalLinkIcon /></a>
                            </div>
                        )}
                        {gradStatus === 'error' && (
                            <div>
                                <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: '0 0 0.5rem 0' }}>{gradError}</p>
                                <button onClick={() => setGradStatus('idle')} style={{
                                    fontFamily: 'inherit', fontSize: '0.75rem', color: '#6b7280',
                                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                                    padding: '0.4rem 1rem', borderRadius: '0.375rem', cursor: 'pointer',
                                }}>Retry</button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Main Grid: Rooms + Log ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                    {/* Rooms */}
                    <div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: currentFloor.rooms.length >= 4
                                ? 'repeat(auto-fit, minmax(250px, 1fr))'
                                : currentFloor.rooms.length >= 2
                                    ? '1fr 1fr'
                                    : '1fr',
                            gap: '0.75rem',
                        }}>
                            {currentFloor.rooms.map(room => {
                                const roomAgents = room.agents.map(id => comp.agents[id]).filter(Boolean);
                                const sorted = [...roomAgents].sort((a, b) => b.totalScore - a.totalScore);
                                return (
                                    <div key={room.id} style={{
                                        padding: '0.875rem', borderRadius: '0.5rem',
                                        border: `1px solid ${floorColor}20`,
                                        background: 'rgba(26,26,26,0.4)',
                                    }}>
                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            marginBottom: '0.625rem',
                                        }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: floorColor }}>
                                                Room {room.roomIndex + 1}
                                            </span>
                                            <span style={{
                                                fontSize: '0.55rem', color: room.status === 'complete' ? '#22c55e' : '#6b7280',
                                            }}>
                                                {room.status === 'complete' ? 'DONE' : room.status === 'competing' ? 'LIVE' : 'READY'}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            {sorted.map((agent, idx) => {
                                                const isElim = agent.status === 'eliminated';
                                                const isAdvancing = agent.status === 'advancing';
                                                const agentColor = SPEC_COLORS[agent.specialization];
                                                const isTop = idx < currentFloor.advancingPerRoom && room.status === 'complete';
                                                return (
                                                    <div key={agent.id}
                                                        onClick={() => agent.isSpotlight && agent.lastAiOutput ? setSpotlightAgent(agent) : null}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.375rem',
                                                            padding: '0.3rem 0.4rem', borderRadius: '0.25rem',
                                                            background: isElim ? 'rgba(239,68,68,0.04)' : isTop ? 'rgba(34,197,94,0.04)' : 'transparent',
                                                            opacity: isElim ? 0.35 : 1,
                                                            cursor: agent.isSpotlight ? 'pointer' : 'default',
                                                            transition: 'opacity 0.3s',
                                                        }}>
                                                        {/* Avatar */}
                                                        <div style={{
                                                            width: '1.1rem', height: '1.1rem', borderRadius: '50%',
                                                            background: `${agentColor}20`, border: `1px solid ${agentColor}40`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '0.5rem', fontWeight: 700, color: agentColor,
                                                            flexShrink: 0,
                                                        }}>
                                                            {agent.name[0]}
                                                        </div>
                                                        {/* Name */}
                                                        <div style={{
                                                            flex: 1, fontSize: '0.6rem', fontWeight: 500, minWidth: 0,
                                                            color: isElim ? '#6b7280' : '#e5e5e5',
                                                            textDecoration: isElim ? 'line-through' : 'none',
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        }}>
                                                            {agent.name}
                                                            {agent.isSpotlight && <span style={{ color: '#eab308', marginLeft: '0.25rem' }}>*</span>}
                                                        </div>
                                                        {/* Score */}
                                                        {agent.totalScore > 0 && (
                                                            <span style={{
                                                                fontSize: '0.55rem', fontWeight: 600, flexShrink: 0,
                                                                color: isAdvancing || isTop ? '#22c55e' : isElim ? '#ef4444' : agentColor,
                                                            }}>{agent.totalScore}</span>
                                                        )}
                                                        {/* Rank badge */}
                                                        {room.status === 'complete' && idx < 3 && !isElim && (
                                                            <span style={{
                                                                fontSize: '0.45rem', fontWeight: 700, flexShrink: 0,
                                                                color: idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : '#d97706',
                                                            }}>
                                                                {idx === 0 ? '1st' : idx === 1 ? '2nd' : '3rd'}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Log + Spotlight */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        {/* Spotlight Panel */}
                        {spotlightAgent && spotlightAgent.lastAiOutput && (
                            <div style={{
                                padding: '1rem', borderRadius: '0.5rem',
                                border: '1px solid rgba(234,179,8,0.2)',
                                background: 'rgba(234,179,8,0.04)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                        <span style={{ color: '#eab308', fontSize: '0.65rem', fontWeight: 600 }}>AI SPOTLIGHT</span>
                                        <span style={{ color: '#e5e5e5', fontSize: '0.75rem', fontWeight: 600 }}>{spotlightAgent.name}</span>
                                    </div>
                                    <button onClick={() => setSpotlightAgent(null)} style={{
                                        background: 'transparent', border: 'none', color: '#6b7280',
                                        cursor: 'pointer', fontSize: '0.8rem',
                                    }}>&times;</button>
                                </div>
                                <div style={{
                                    padding: '0.5rem', borderRadius: '0.25rem',
                                    background: 'rgba(0,0,0,0.3)', maxHeight: '150px', overflowY: 'auto',
                                    fontFamily: '"JetBrains Mono", monospace',
                                }}>
                                    {parseExecutionSteps(spotlightAgent.lastAiOutput).map((line, i) => (
                                        <div key={i} style={{ fontSize: '0.55rem', color: '#9ca3af', lineHeight: 1.6 }}>
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Competition Log */}
                        <div style={{
                            padding: '1rem', borderRadius: '0.5rem',
                            border: '1px solid rgba(255,107,53,0.15)',
                            background: 'rgba(26,26,26,0.4)',
                            flex: 1,
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#e5e5e5', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                                Competition Log
                            </div>
                            <div ref={logRef} style={{
                                maxHeight: '300px', overflowY: 'auto',
                                fontFamily: '"JetBrains Mono", monospace',
                            }}>
                                {comp.log.map((entry, i) => (
                                    <div key={i} style={{
                                        fontSize: '0.6rem', lineHeight: 1.7,
                                        color: logColor(entry),
                                        fontWeight: entry.type === 'graduation' ? 700 : 400,
                                    }}>
                                        <span style={{ color: '#4b5563' }}>[F{entry.floor || '-'}]</span> {entry.message}
                                    </div>
                                ))}
                                {isRunning && (
                                    <div style={{ fontSize: '0.6rem', color: '#ff6b35' }}>
                                        <span style={{ animation: 'blink 1s infinite' }}>_</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────
function addLog(state: CompetitionState, floor: number, type: CompetitionLogEntry['type'], message: string) {
    state.log.push({ timestamp: Date.now(), floor, type, message });
}

function logColor(entry: CompetitionLogEntry): string {
    switch (entry.type) {
        case 'graduation': return '#22c55e';
        case 'elimination': return '#ef4444';
        case 'advancement': return '#3b82f6';
        case 'spotlight': return '#eab308';
        case 'round_start': return '#ff6b35';
        case 'round_end': return '#9ca3af';
        default: return '#6b7280';
    }
}

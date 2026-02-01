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
import { WalletIcon, ChartIcon, TaskIcon, ExternalLinkIcon } from '../components/Icons';

type GradStatus = 'idle' | 'uploading' | 'building' | 'signing' | 'confirming' | 'success' | 'error';

const GRADUATION_THRESHOLD = 100;
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

const SPEC_COLORS: Record<string, string> = {
    Compute: '#ff6b35',
    Inference: '#8b5cf6',
    Security: '#ef4444',
    Network: '#3b82f6',
    Storage: '#22c55e',
};

export function Dashboard() {
    const { authenticated, login, user } = usePrivy();
    const { wallets } = useWallets();
    const { signTransaction } = useSignTransaction();
    const { balance, isLoading: balanceLoading, refreshBalance, network, publicKey } = useSolana();

    const [agentName, setAgentName] = useState('');
    const [agentSymbol, setAgentSymbol] = useState('');
    const [agentDescription, setAgentDescription] = useState('');
    const [specialization, setSpecialization] = useState('Compute');
    const [trustScore, setTrustScore] = useState(0);

    const [gradStatus, setGradStatus] = useState<GradStatus>('idle');
    const [gradError, setGradError] = useState<string | null>(null);
    const [gradResult, setGradResult] = useState<{ mintAddress: string; pumpfunUrl: string } | null>(null);
    const [graduatedAgents, setGraduatedAgents] = useState<GraduatedAgent[]>([]);

    useEffect(() => {
        setGraduatedAgents(getGraduatedAgents());
    }, []);

    useEffect(() => {
        if (agentName) {
            const auto = agentName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
            if (auto && !agentSymbol) setAgentSymbol(auto);
        }
    }, [agentName]);

    const getDisplayName = () => {
        if (user?.wallet?.address) {
            const a = user.wallet.address;
            return `${a.slice(0, 6)}...${a.slice(-4)}`;
        }
        if (user?.email?.address) return user.email.address;
        return 'User';
    };

    const canGraduate = trustScore >= GRADUATION_THRESHOLD && agentName && agentSymbol;

    const handleSimulateTraining = () => {
        setTrustScore(prev => Math.min(prev + 25, 100));
    };

    const handleGraduate = async () => {
        if (!canGraduate || !publicKey) return;

        setGradError(null);
        setGradResult(null);

        const agent: AgentGraduationData = {
            name: agentName,
            symbol: agentSymbol,
            description: agentDescription || 'AI agent trained at Narkina5 Factory',
            specialization,
            trustScore,
        };

        try {
            setGradStatus('uploading');
            const description = generateTokenDescription(agent);
            const metadataUri = await uploadMetadata(
                agent.name, agent.symbol, description, agent.specialization,
            );

            const mintKeypair = generateMintKeypair();
            const mintAddress = mintKeypair.publicKey.toBase58();

            setGradStatus('building');
            const unsignedTx = await buildCreateTokenTx(
                publicKey.toBase58(), mintAddress, metadataUri,
                agent.name, agent.symbol, 0,
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
                name: agent.name, symbol: agent.symbol, specialization: agent.specialization,
                mintAddress, pumpfunUrl, graduatedAt: Date.now(), trustScore: agent.trustScore,
            });
            setGraduatedAgents(getGraduatedAgents());

            setAgentName('');
            setAgentSymbol('');
            setAgentDescription('');
            setTrustScore(0);

        } catch (err: unknown) {
            console.error('Graduation failed:', err);
            setGradError(err instanceof Error ? err.message : 'Graduation failed');
            setGradStatus('error');
        }
    };

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
                        Connect to start training agents and launch tokens on Pump.fun.
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

    const specColor = SPEC_COLORS[specialization] || '#ff6b35';

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

            <main style={{
                maxWidth: '80rem', margin: '0 auto',
                padding: '3rem 1.5rem', position: 'relative',
            }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{
                        fontSize: '1.75rem', fontWeight: 300, margin: 0,
                        color: '#e5e5e5', letterSpacing: '0.1em',
                    }}>Agent Factory</h1>
                    <p style={{ color: '#6b7280', margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                        Welcome back, <span style={{ color: '#ff6b35' }}>{getDisplayName()}</span>
                    </p>
                </div>

                {/* Stats */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem', marginBottom: '2rem',
                }}>
                    <div style={cardStyle('#ff6b35')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <span style={{ color: '#ff6b35' }}><WalletIcon /></span>
                            <span style={statLabel}>Balance</span>
                            <button onClick={refreshBalance} disabled={balanceLoading} style={refreshBtn}>
                                {balanceLoading ? '...' : 'Refresh'}
                            </button>
                        </div>
                        <p style={{ fontSize: '1.5rem', fontWeight: 600, color: '#e5e5e5', margin: 0 }}>
                            {balance !== null ? balance.toFixed(4) : '0.00'} <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>SOL</span>
                        </p>
                        <p style={{ fontSize: '0.7rem', color: '#eab308', margin: '0.25rem 0 0 0' }}>{network}</p>
                    </div>

                    <div style={cardStyle('#8b5cf6')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <span style={{ color: '#8b5cf6' }}><ChartIcon /></span>
                            <span style={statLabel}>Graduated</span>
                        </div>
                        <p style={{ fontSize: '1.5rem', fontWeight: 600, color: '#8b5cf6', margin: 0 }}>
                            {graduatedAgents.length}
                        </p>
                        <p style={{ fontSize: '0.7rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>tokens launched</p>
                    </div>

                    <div style={cardStyle(specColor)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <span style={{ color: specColor }}><TaskIcon /></span>
                            <span style={statLabel}>Trust Score</span>
                        </div>
                        <p style={{ fontSize: '1.5rem', fontWeight: 600, color: specColor, margin: 0 }}>
                            {trustScore}<span style={{ fontSize: '0.8rem', color: '#6b7280' }}>/100</span>
                        </p>
                        <div style={{ marginTop: '0.5rem', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.05)' }}>
                            <div style={{
                                height: '100%', borderRadius: '2px', background: specColor,
                                width: `${trustScore}%`, transition: 'width 0.5s ease',
                            }} />
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                    gap: '1.5rem',
                }}>
                    {/* Train Agent */}
                    <div style={{
                        padding: '1.5rem', borderRadius: '0.75rem',
                        border: '1px solid rgba(255, 107, 53, 0.15)', background: 'rgba(26, 26, 26, 0.4)',
                    }}>
                        <h2 style={{
                            fontSize: '1rem', fontWeight: 500, color: '#e5e5e5',
                            margin: '0 0 1.25rem 0', letterSpacing: '0.05em',
                        }}>Train New Agent</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                            <div>
                                <label style={labelStyle}>Agent Name</label>
                                <input
                                    type="text" value={agentName}
                                    onChange={(e) => {
                                        setAgentName(e.target.value);
                                        const auto = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
                                        const prevAuto = agentName.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
                                        if (!agentSymbol || agentSymbol === prevAuto) setAgentSymbol(auto);
                                    }}
                                    placeholder="e.g. CipherBot" maxLength={32} style={inputStyle}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={labelStyle}>Symbol</label>
                                    <input
                                        type="text" value={agentSymbol}
                                        onChange={(e) => setAgentSymbol(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6))}
                                        placeholder="CIPHR" maxLength={6} style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Specialization</label>
                                    <select value={specialization} onChange={(e) => setSpecialization(e.target.value)} style={inputStyle}>
                                        {Object.keys(SPEC_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}>Description</label>
                                <textarea
                                    value={agentDescription}
                                    onChange={(e) => setAgentDescription(e.target.value)}
                                    placeholder="What does this agent do?"
                                    rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                                />
                            </div>
                        </div>

                        {/* Trust bar */}
                        <div style={{ marginTop: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={statLabel}>Training Progress</span>
                                <span style={{
                                    fontSize: '0.75rem', fontWeight: 600,
                                    color: trustScore >= GRADUATION_THRESHOLD ? '#22c55e' : specColor,
                                }}>
                                    {trustScore >= GRADUATION_THRESHOLD ? 'READY' : `${trustScore}/100`}
                                </span>
                            </div>
                            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.05)' }}>
                                <div style={{
                                    height: '100%', borderRadius: '3px',
                                    background: trustScore >= GRADUATION_THRESHOLD
                                        ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                        : `linear-gradient(90deg, ${specColor}88, ${specColor})`,
                                    width: `${trustScore}%`, transition: 'all 0.5s ease',
                                }} />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                            <button
                                onClick={handleSimulateTraining}
                                disabled={trustScore >= 100}
                                style={{
                                    flex: 1, fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 500,
                                    color: trustScore >= 100 ? '#4b5563' : '#e5e5e5',
                                    background: 'transparent',
                                    border: `1px solid ${trustScore >= 100 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}`,
                                    padding: '0.625rem', borderRadius: '0.375rem',
                                    cursor: trustScore >= 100 ? 'default' : 'pointer',
                                }}
                            >+25 Trust (Demo)</button>
                            <button
                                onClick={handleGraduate}
                                disabled={!canGraduate || gradStatus !== 'idle'}
                                style={{
                                    flex: 1, fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600,
                                    color: canGraduate ? '#0a0a0a' : '#4b5563',
                                    background: canGraduate ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.05)',
                                    border: 'none', padding: '0.625rem', borderRadius: '0.375rem',
                                    cursor: canGraduate ? 'pointer' : 'default',
                                    boxShadow: canGraduate ? '0 0 20px rgba(34, 197, 94, 0.25)' : 'none',
                                }}
                            >Graduate &rarr; Pump.fun</button>
                        </div>
                    </div>

                    {/* Right Panel: Graduation Status or Graduated List */}
                    <div style={{
                        padding: '1.5rem', borderRadius: '0.75rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)', background: 'rgba(26, 26, 26, 0.4)',
                    }}>
                        {gradStatus !== 'idle' && gradStatus !== 'success' && gradStatus !== 'error' ? (
                            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
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
                                    {gradStatus === 'uploading' && 'Pinning agent avatar and metadata to IPFS'}
                                    {gradStatus === 'building' && 'Creating Pump.fun token transaction'}
                                    {gradStatus === 'signing' && 'Sign the transaction to launch your token'}
                                    {gradStatus === 'confirming' && 'Waiting for Solana confirmation'}
                                </p>
                            </div>
                        ) : gradStatus === 'success' && gradResult ? (
                            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <div style={{
                                    width: '3rem', height: '3rem', margin: '0 auto 1rem',
                                    borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)',
                                    border: '2px solid rgba(34, 197, 94, 0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#22c55e', fontSize: '1.5rem',
                                }}>&#10003;</div>
                                <p style={{ color: '#22c55e', fontSize: '1.125rem', margin: '0 0 0.25rem 0', fontWeight: 600 }}>
                                    Token Launched!
                                </p>
                                <p style={{ color: '#6b7280', fontSize: '0.7rem', margin: '0 0 1rem 0', wordBreak: 'break-all' }}>
                                    {gradResult.mintAddress}
                                </p>
                                <a
                                    href={gradResult.pumpfunUrl} target="_blank" rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                        fontSize: '0.8rem', color: '#22c55e', textDecoration: 'none',
                                        padding: '0.5rem 1rem', borderRadius: '0.375rem',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        background: 'rgba(34, 197, 94, 0.06)',
                                    }}
                                >View on Pump.fun <ExternalLinkIcon /></a>
                                <br />
                                <button onClick={() => { setGradStatus('idle'); setGradResult(null); }} style={{
                                    marginTop: '1rem', fontFamily: 'inherit', fontSize: '0.8rem',
                                    color: '#6b7280', background: 'transparent', border: 'none',
                                    cursor: 'pointer', textDecoration: 'underline',
                                }}>Train Another Agent</button>
                            </div>
                        ) : gradStatus === 'error' ? (
                            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <div style={{
                                    width: '3rem', height: '3rem', margin: '0 auto 1rem',
                                    borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
                                    border: '2px solid rgba(239, 68, 68, 0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#ef4444', fontSize: '1.25rem',
                                }}>&#10007;</div>
                                <p style={{ color: '#ef4444', fontSize: '1rem', margin: '0 0 0.5rem 0', fontWeight: 500 }}>Launch Failed</p>
                                <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0 0 1rem 0', wordBreak: 'break-word' }}>{gradError}</p>
                                <button onClick={() => { setGradStatus('idle'); setGradError(null); }} style={{
                                    fontFamily: 'inherit', fontSize: '0.8rem', color: '#6b7280',
                                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                                    padding: '0.5rem 1.25rem', borderRadius: '0.375rem', cursor: 'pointer',
                                }}>Back</button>
                            </div>
                        ) : (
                            <>
                                <h2 style={{
                                    fontSize: '1rem', fontWeight: 500, color: '#e5e5e5',
                                    margin: '0 0 1rem 0', letterSpacing: '0.05em',
                                }}>Graduated Agents</h2>

                                {graduatedAgents.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                                        <p style={{ color: '#4b5563', fontSize: '0.875rem', margin: 0 }}>
                                            No agents graduated yet.
                                        </p>
                                        <p style={{ color: '#374151', fontSize: '0.75rem', margin: '0.5rem 0 0 0' }}>
                                            Train an agent to 100 trust, then launch on Pump.fun
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {graduatedAgents.map((agent, idx) => {
                                            const color = SPEC_COLORS[agent.specialization] || '#ff6b35';
                                            return (
                                                <div key={idx} style={{
                                                    padding: '1rem', borderRadius: '0.5rem',
                                                    border: '1px solid rgba(255,255,255,0.04)',
                                                    background: 'rgba(26,26,26,0.3)',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <span style={{ fontWeight: 600, color: '#e5e5e5', fontSize: '0.9rem' }}>{agent.name}</span>
                                                                <span style={{
                                                                    fontSize: '0.65rem', color, fontWeight: 600,
                                                                    background: `${color}15`, border: `1px solid ${color}30`,
                                                                    padding: '0.1rem 0.4rem', borderRadius: '0.2rem',
                                                                }}>${agent.symbol}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
                                                                <span style={{
                                                                    fontSize: '0.65rem', color: '#22c55e',
                                                                    background: 'rgba(34,197,94,0.08)',
                                                                    padding: '0.1rem 0.35rem', borderRadius: '0.2rem',
                                                                }}>GRADUATED</span>
                                                                <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                                                                    {new Date(agent.graduatedAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <a href={agent.pumpfunUrl} target="_blank" rel="noopener noreferrer" style={{
                                                            fontSize: '0.7rem', color: '#22c55e', textDecoration: 'none',
                                                            display: 'flex', alignItems: 'center', gap: '0.25rem',
                                                        }}>Pump.fun <ExternalLinkIcon /></a>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

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

const statLabel: React.CSSProperties = {
    color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em',
};

const refreshBtn: React.CSSProperties = {
    marginLeft: 'auto', background: 'transparent', border: 'none',
    color: '#6b7280', cursor: 'pointer', fontSize: '0.7rem',
};

function cardStyle(color: string): React.CSSProperties {
    return {
        padding: '1.25rem', borderRadius: '0.5rem',
        border: `1px solid ${color}25`, background: 'rgba(26, 26, 26, 0.4)',
    };
}

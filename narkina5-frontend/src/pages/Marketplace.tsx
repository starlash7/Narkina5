import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolana } from '../contexts/SolanaContext';
import { fetchTasks, taskToDisplay, type TaskDisplay } from '../services/agenc';
import {
    buildRegisterAgentTx,
    buildCreateTaskTx,
    generateTaskId,
    deriveAgentIdFromWallet,
    stringToFixed64,
    categoryToCapability,
    checkProtocolInitialized,
} from '../services/transactions';
import { PlusIcon, ClockIcon, SolIcon, RefreshIcon, ChainIcon } from '../components/Icons';

type TxStatus = 'idle' | 'registering' | 'building' | 'signing' | 'confirming' | 'success' | 'error';

// Task categories mapped to training specializations
const SPECIALIZATIONS = ['Hyperspace', 'Holocron', 'Garrison', 'Holonet', 'Kyber'];

// Demo training tasks
const DEMO_TASKS: TaskDisplay[] = [
    {
        id: 'demo_001',
        title: 'Data Pipeline Assembly',
        description: 'Process and analyze raw data streams. Builds compute specialization for your agent.',
        reward: 0.5,
        creator: '7xKX...mN2r',
        status: 'open',
        createdAt: '2h ago',
        category: 'Hyperspace',
        pda: '',
        onChain: false,
    },
    {
        id: 'demo_002',
        title: 'Smart Contract Audit',
        description: 'Review a DeFi contract for vulnerabilities. Builds security trust score.',
        reward: 2.0,
        creator: '9pLm...qR4t',
        status: 'open',
        createdAt: '5h ago',
        category: 'Garrison',
        pda: '',
        onChain: false,
    },
    {
        id: 'demo_003',
        title: 'Sentiment Model Training',
        description: 'Train a model on social media data. Builds inference capability.',
        reward: 1.5,
        creator: '3kNp...wX8z',
        status: 'in_progress',
        createdAt: '1d ago',
        category: 'Holocron',
        pda: '',
        onChain: false,
    },
    {
        id: 'demo_004',
        title: 'API Gateway Integration',
        description: 'Integrate and unify multiple REST endpoints. Builds network trust.',
        reward: 0.8,
        creator: '5mRq...yT2v',
        status: 'open',
        createdAt: '3h ago',
        category: 'Holonet',
        pda: '',
        onChain: false,
    },
];

export function Marketplace() {
    const { authenticated, login } = usePrivy();
    const { connection, publicKey, network, sendTransaction, isAgentRegistered, checkAgentStatus } = useSolana();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [tasks, setTasks] = useState<TaskDisplay[]>(DEMO_TASKS);
    const [filter, setFilter] = useState<'all' | 'open' | 'in_progress'>('all');
    const [isLoading, setIsLoading] = useState(false);
    const [onChainCount, setOnChainCount] = useState(0);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        reward: '',
        category: 'Hyperspace',
    });
    const [txStatus, setTxStatus] = useState<TxStatus>('idle');
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [txError, setTxError] = useState<string | null>(null);

    useEffect(() => {
        loadOnChainTasks();
    }, [connection]);

    const loadOnChainTasks = async () => {
        setIsLoading(true);
        try {
            const onChainTasks = await fetchTasks(connection);
            const displayTasks = onChainTasks.map(taskToDisplay);
            setOnChainCount(displayTasks.length);

            if (displayTasks.length > 0) {
                setTasks([...displayTasks, ...DEMO_TASKS]);
            } else {
                setTasks(DEMO_TASKS);
            }
        } catch (err) {
            console.error('Failed to fetch on-chain tasks:', err);
            setTasks(DEMO_TASKS);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (filter === 'all') return true;
        return task.status === filter;
    });

    const handleCreateTask = async () => {
        if (!newTask.title || !newTask.description || !newTask.reward) return;
        if (!publicKey) { login(); return; }

        setTxError(null);
        setTxSignature(null);

        try {
            setTxStatus('building');

            const protocolReady = await checkProtocolInitialized(connection);
            if (!protocolReady) {
                throw new Error('AgenC protocol not initialized on devnet. Deploy the program first.');
            }

            const agentId = deriveAgentIdFromWallet(publicKey);

            // Register agent if not already registered
            if (!isAgentRegistered) {
                setTxStatus('registering');
                const registerTx = await buildRegisterAgentTx(
                    connection,
                    publicKey,
                    agentId,
                    categoryToCapability(newTask.category),
                    'https://narkina5.factory',
                    null,
                    0n,
                );
                await sendTransaction(registerTx);
                await checkAgentStatus();
            }

            // Build create task transaction
            setTxStatus('signing');
            const taskId = generateTaskId();
            const rewardLamports = BigInt(Math.floor(parseFloat(newTask.reward) * 1e9));
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 7 * 24 * 3600);

            const createTx = await buildCreateTaskTx(
                connection,
                publicKey,
                agentId,
                taskId,
                categoryToCapability(newTask.category),
                stringToFixed64(newTask.title),
                rewardLamports,
                1,
                deadline,
                0,
                null,
            );

            setTxStatus('confirming');
            const sig = await sendTransaction(createTx);

            setTxSignature(sig);
            setTxStatus('success');

            setNewTask({ title: '', description: '', reward: '', category: 'Hyperspace' });

            setTimeout(() => {
                loadOnChainTasks();
            }, 2000);

        } catch (err: unknown) {
            console.error('Transaction failed:', err);
            setTxError(err instanceof Error ? err.message : 'Transaction failed');
            setTxStatus('error');
        }
    };

    const handleClaimTask = (taskId: string) => {
        if (!authenticated) {
            login();
            return;
        }
        setTasks(tasks.map(t =>
            t.id === taskId ? { ...t, status: 'in_progress' } : t
        ));
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'open': return { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e', label: 'OPEN' };
            case 'in_progress': return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6', label: 'IN PROGRESS' };
            case 'pending_validation': return { bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.3)', text: '#eab308', label: 'VALIDATING' };
            case 'completed': return { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#8b5cf6', label: 'COMPLETED' };
            default: return { bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)', text: '#6b7280', label: status.toUpperCase() };
        }
    };

    const trustGained = (reward: number) => Math.floor(reward * 10);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Grid Background */}
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

            <main style={{
                maxWidth: '80rem',
                margin: '0 auto',
                padding: '3rem 1.5rem',
                position: 'relative',
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '2rem',
                    flexWrap: 'wrap',
                    gap: '1rem',
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <h1 style={{
                                fontSize: '1.75rem',
                                fontWeight: 300,
                                margin: 0,
                                color: '#e5e5e5',
                                letterSpacing: '0.1em',
                            }}>
                                Training Floor
                            </h1>
                            <span style={{
                                fontSize: '0.65rem',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '0.25rem',
                                background: network === 'devnet' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                color: network === 'devnet' ? '#eab308' : '#22c55e',
                                border: `1px solid ${network === 'devnet' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                            }}>
                                {network}
                            </span>
                        </div>
                        <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>
                            Assign tasks to your agents. Build trust. Earn graduation.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={loadOnChainTasks}
                            disabled={isLoading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontFamily: 'inherit',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                color: '#6b7280',
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                padding: '0.625rem 1rem',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.3)';
                                e.currentTarget.style.color = '#ff6b35';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.color = '#6b7280';
                            }}
                        >
                            <RefreshIcon />
                            {isLoading ? 'Syncing...' : 'Sync Chain'}
                        </button>
                        <button
                            onClick={() => authenticated ? setShowCreateModal(true) : login()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontFamily: 'inherit',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#0a0a0a',
                                background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                                border: 'none',
                                padding: '0.625rem 1.25rem',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                boxShadow: '0 0 20px rgba(255, 107, 53, 0.25)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <PlusIcon />
                            New Task
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '1px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    marginBottom: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                    {[
                        { label: 'Open Tasks', value: tasks.filter(t => t.status === 'open').length, color: '#22c55e' },
                        { label: 'Total Rewards', value: `${tasks.reduce((sum, t) => sum + t.reward, 0).toFixed(1)} SOL`, color: '#ff6b35' },
                        { label: 'On-Chain', value: onChainCount, color: '#3b82f6' },
                        { label: 'Trust Available', value: `+${tasks.filter(t => t.status === 'open').reduce((sum, t) => sum + trustGained(t.reward), 0)}`, color: '#eab308' },
                    ].map((stat, idx) => (
                        <div key={idx} style={{
                            padding: '1rem 1.25rem',
                            background: '#0a0a0a',
                        }}>
                            <p style={{ color: '#6b7280', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</p>
                            <p style={{ color: stat.color, fontSize: '1.25rem', fontWeight: 600, margin: '0.25rem 0 0 0' }}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '1.5rem',
                }}>
                    {(['all', 'open', 'in_progress'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{
                                fontFamily: 'inherit',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                color: filter === f ? '#ff6b35' : '#6b7280',
                                background: filter === f ? 'rgba(255, 107, 53, 0.08)' : 'transparent',
                                border: `1px solid ${filter === f ? 'rgba(255, 107, 53, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                                padding: '0.4rem 0.875rem',
                                borderRadius: '0.25rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Loading skeleton */}
                {isLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                        {[1, 2].map((i) => (
                            <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '0.5rem' }} />
                        ))}
                    </div>
                )}

                {/* Task List */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                }}>
                    {filteredTasks.map((task) => {
                        const status = getStatusStyle(task.status);
                        return (
                            <div
                                key={task.id}
                                style={{
                                    padding: '1.25rem 1.5rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(255, 255, 255, 0.04)',
                                    background: 'rgba(26, 26, 26, 0.4)',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.15)';
                                    e.currentTarget.style.background = 'rgba(26, 26, 26, 0.6)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                                    e.currentTarget.style.background = 'rgba(26, 26, 26, 0.4)';
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    flexWrap: 'wrap',
                                    gap: '1rem',
                                }}>
                                    <div style={{ flex: 1, minWidth: '250px' }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            marginBottom: '0.375rem',
                                        }}>
                                            <h3 style={{
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                color: '#e5e5e5',
                                                margin: 0,
                                            }}>{task.title}</h3>
                                            <span style={{
                                                fontSize: '0.6rem',
                                                fontWeight: 600,
                                                color: status.text,
                                                background: status.bg,
                                                border: `1px solid ${status.border}`,
                                                padding: '0.15rem 0.4rem',
                                                borderRadius: '0.2rem',
                                                letterSpacing: '0.05em',
                                            }}>
                                                {status.label}
                                            </span>
                                            {task.onChain && (
                                                <span style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.2rem',
                                                    fontSize: '0.6rem',
                                                    color: '#3b82f6',
                                                    background: 'rgba(59, 130, 246, 0.08)',
                                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                                    padding: '0.15rem 0.4rem',
                                                    borderRadius: '0.2rem',
                                                }}>
                                                    <ChainIcon /> on-chain
                                                </span>
                                            )}
                                        </div>
                                        <p style={{
                                            color: '#9ca3af',
                                            fontSize: '0.825rem',
                                            margin: '0 0 0.75rem 0',
                                            lineHeight: 1.5,
                                        }}>{task.description}</p>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            flexWrap: 'wrap',
                                        }}>
                                            <span style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                fontSize: '0.7rem',
                                                color: '#6b7280',
                                            }}>
                                                <ClockIcon />
                                                {task.createdAt}
                                            </span>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                color: '#ff6b35',
                                                background: 'rgba(255, 107, 53, 0.08)',
                                                padding: '0.15rem 0.4rem',
                                                borderRadius: '0.2rem',
                                            }}>
                                                {task.category}
                                            </span>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                color: '#eab308',
                                            }}>
                                                +{trustGained(task.reward)} trust
                                            </span>
                                            <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>
                                                by {task.creator}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-end',
                                        gap: '0.5rem',
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.375rem',
                                            fontSize: '1.125rem',
                                            fontWeight: 600,
                                            color: '#ff6b35',
                                        }}>
                                            <SolIcon />
                                            {task.reward} SOL
                                        </div>
                                        {task.status === 'open' && (
                                            <button
                                                onClick={() => handleClaimTask(task.id)}
                                                style={{
                                                    fontFamily: 'inherit',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 500,
                                                    color: '#0a0a0a',
                                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                                    border: 'none',
                                                    padding: '0.4rem 0.875rem',
                                                    borderRadius: '0.25rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                            >
                                                Assign Agent
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredTasks.length === 0 && !isLoading && (
                    <div style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        color: '#6b7280',
                    }}>
                        <p style={{ fontSize: '1rem', margin: 0 }}>No tasks on the floor</p>
                        <p style={{ fontSize: '0.8rem', margin: '0.5rem 0 0 0' }}>Create a new training task or sync from chain</p>
                    </div>
                )}
            </main>

            {/* Create Task Modal */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    padding: '1rem',
                }}>
                    <div className="animate-scale-in" style={{
                        background: '#111111',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255, 107, 53, 0.15)',
                        padding: '2rem',
                        maxWidth: '500px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                    }}>
                        {txStatus !== 'idle' && txStatus !== 'error' && txStatus !== 'success' ? (
                            /* Transaction Progress */
                            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <div style={{
                                    width: '3rem', height: '3rem', margin: '0 auto 1.5rem',
                                    border: '2px solid rgba(255, 107, 53, 0.2)',
                                    borderTopColor: '#ff6b35',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                }} />
                                <p style={{ color: '#e5e5e5', fontSize: '1rem', margin: '0 0 0.5rem 0', fontWeight: 500 }}>
                                    {txStatus === 'registering' && 'Registering Agent...'}
                                    {txStatus === 'building' && 'Building Transaction...'}
                                    {txStatus === 'signing' && 'Approve in Wallet...'}
                                    {txStatus === 'confirming' && 'Confirming On-Chain...'}
                                </p>
                                <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: 0 }}>
                                    {txStatus === 'registering' && 'First-time agent registration required'}
                                    {txStatus === 'building' && 'Preparing your task for the network'}
                                    {txStatus === 'signing' && 'Check your wallet for the approval prompt'}
                                    {txStatus === 'confirming' && 'Waiting for network confirmation'}
                                </p>
                            </div>
                        ) : txStatus === 'success' ? (
                            /* Success */
                            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <div style={{
                                    width: '3rem', height: '3rem', margin: '0 auto 1rem',
                                    borderRadius: '50%',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    border: '2px solid rgba(34, 197, 94, 0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#22c55e', fontSize: '1.5rem',
                                }}>
                                    &#10003;
                                </div>
                                <p style={{ color: '#22c55e', fontSize: '1rem', margin: '0 0 0.5rem 0', fontWeight: 500 }}>
                                    Task Created On-Chain
                                </p>
                                {txSignature && (
                                    <a
                                        href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'inline-block',
                                            color: '#3b82f6',
                                            fontSize: '0.8rem',
                                            marginBottom: '1.5rem',
                                            textDecoration: 'none',
                                        }}
                                    >
                                        View on Solscan &rarr;
                                    </a>
                                )}
                                <div>
                                    <button
                                        onClick={() => { setShowCreateModal(false); setTxStatus('idle'); }}
                                        style={{
                                            fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 500,
                                            color: '#0a0a0a', background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                                            border: 'none', padding: '0.625rem 1.5rem', borderRadius: '0.375rem', cursor: 'pointer',
                                        }}
                                    >Done</button>
                                </div>
                            </div>
                        ) : txStatus === 'error' ? (
                            /* Error */
                            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                <div style={{
                                    width: '3rem', height: '3rem', margin: '0 auto 1rem',
                                    borderRadius: '50%',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '2px solid rgba(239, 68, 68, 0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#ef4444', fontSize: '1.25rem',
                                }}>
                                    &#10007;
                                </div>
                                <p style={{ color: '#ef4444', fontSize: '1rem', margin: '0 0 0.5rem 0', fontWeight: 500 }}>
                                    Transaction Failed
                                </p>
                                <p style={{ color: '#6b7280', fontSize: '0.8rem', margin: '0 0 1.5rem 0', wordBreak: 'break-word' }}>
                                    {txError}
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                    <button
                                        onClick={() => { setTxStatus('idle'); setTxError(null); }}
                                        style={{
                                            fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 500,
                                            color: '#6b7280', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.08)',
                                            padding: '0.625rem 1.25rem', borderRadius: '0.375rem', cursor: 'pointer',
                                        }}
                                    >Back</button>
                                    <button
                                        onClick={handleCreateTask}
                                        style={{
                                            fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 500,
                                            color: '#0a0a0a', background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                                            border: 'none', padding: '0.625rem 1.25rem', borderRadius: '0.375rem', cursor: 'pointer',
                                        }}
                                    >Retry</button>
                                </div>
                            </div>
                        ) : (
                            /* Form */
                            <>
                                <h2 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 300,
                                    color: '#e5e5e5',
                                    margin: '0 0 1.5rem 0',
                                    letterSpacing: '0.05em',
                                }}>New Training Task</h2>

                                {!isAgentRegistered && publicKey && (
                                    <div style={{
                                        padding: '0.625rem 0.875rem',
                                        borderRadius: '0.375rem',
                                        background: 'rgba(234, 179, 8, 0.06)',
                                        border: '1px solid rgba(234, 179, 8, 0.15)',
                                        marginBottom: '1rem',
                                        fontSize: '0.75rem',
                                        color: '#eab308',
                                    }}>
                                        Agent not registered. Registration tx will be sent first.
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Task Name</label>
                                        <input
                                            type="text"
                                            value={newTask.title}
                                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                            placeholder="What should the agent do?"
                                            maxLength={64}
                                            style={{
                                                width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.375rem',
                                                border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(26, 26, 26, 0.6)',
                                                color: '#e5e5e5', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Description</label>
                                        <textarea
                                            value={newTask.description}
                                            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                            placeholder="Describe the task requirements and success criteria"
                                            rows={3}
                                            style={{
                                                width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.375rem',
                                                border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(26, 26, 26, 0.6)',
                                                color: '#e5e5e5', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                                            }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Reward (SOL)</label>
                                            <input
                                                type="number" step="0.1" min="0.1"
                                                value={newTask.reward}
                                                onChange={(e) => setNewTask({ ...newTask, reward: e.target.value })}
                                                placeholder="0.0"
                                                style={{
                                                    width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.375rem',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(26, 26, 26, 0.6)',
                                                    color: '#e5e5e5', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Specialization</label>
                                            <select
                                                value={newTask.category}
                                                onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                                                style={{
                                                    width: '100%', padding: '0.625rem 0.75rem', borderRadius: '0.375rem',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(26, 26, 26, 0.6)',
                                                    color: '#e5e5e5', fontSize: '0.875rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                                                }}
                                            >
                                                {SPECIALIZATIONS.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        style={{
                                            flex: 1, fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 500,
                                            color: '#6b7280', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.08)',
                                            padding: '0.625rem', borderRadius: '0.375rem', cursor: 'pointer',
                                        }}
                                    >Cancel</button>
                                    <button
                                        onClick={handleCreateTask}
                                        style={{
                                            flex: 1, fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 500,
                                            color: '#0a0a0a', background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                                            border: 'none', padding: '0.625rem', borderRadius: '0.375rem', cursor: 'pointer',
                                        }}
                                    >Create On-Chain</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolana } from '../contexts/SolanaContext';
import { fetchTasks, taskToDisplay, TaskState, TaskStateLabels, type TaskDisplay } from '../services/agenc';

// Icons
const PlusIcon = () => (
    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
);

const BriefcaseIcon = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const ClockIcon = () => (
    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const SolIcon = () => (
    <svg style={{ width: '1rem', height: '1rem' }} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const ShieldIcon = () => (
    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

const RefreshIcon = () => (
    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

const ChainIcon = () => (
    <svg style={{ width: '0.75rem', height: '0.75rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
);

// Demo tasks shown when no on-chain tasks exist
const DEMO_TASKS: TaskDisplay[] = [
    {
        id: 'demo_001',
        title: 'Data Analysis Pipeline',
        description: 'Build an automated data pipeline to process CSV files and generate insights',
        reward: 0.5,
        creator: '7xKX...mN2r',
        status: 'open',
        createdAt: '2h ago',
        category: 'Compute',
        pda: '',
        onChain: false,
    },
    {
        id: 'demo_002',
        title: 'Smart Contract Audit',
        description: 'Review and audit a DeFi smart contract for security vulnerabilities',
        reward: 2.0,
        creator: '9pLm...qR4t',
        status: 'open',
        createdAt: '5h ago',
        category: 'Security',
        pda: '',
        onChain: false,
    },
    {
        id: 'demo_003',
        title: 'ML Model Training',
        description: 'Train a sentiment analysis model on social media data',
        reward: 1.5,
        creator: '3kNp...wX8z',
        status: 'in_progress',
        createdAt: '1d ago',
        category: 'Inference',
        pda: '',
        onChain: false,
    },
    {
        id: 'demo_004',
        title: 'API Integration',
        description: 'Integrate multiple REST APIs and create a unified endpoint',
        reward: 0.8,
        creator: '5mRq...yT2v',
        status: 'open',
        createdAt: '3h ago',
        category: 'Network',
        pda: '',
        onChain: false,
    },
];

export function Marketplace() {
    const { authenticated, login } = usePrivy();
    const { connection, network } = useSolana();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [tasks, setTasks] = useState<TaskDisplay[]>(DEMO_TASKS);
    const [filter, setFilter] = useState<'all' | 'open' | 'in_progress'>('all');
    const [isLoading, setIsLoading] = useState(false);
    const [onChainCount, setOnChainCount] = useState(0);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        reward: '',
        category: 'Compute',
    });

    // Fetch on-chain tasks
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
                // Merge: on-chain first, then demo tasks
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

    const handleCreateTask = () => {
        if (!newTask.title || !newTask.description || !newTask.reward) return;

        const task: TaskDisplay = {
            id: `local_${Date.now()}`,
            title: newTask.title,
            description: newTask.description,
            reward: parseFloat(newTask.reward),
            creator: 'You',
            status: 'open',
            createdAt: 'Just now',
            category: newTask.category,
            pda: '',
            onChain: false,
        };

        setTasks([task, ...tasks]);
        setNewTask({ title: '', description: '', reward: '', category: 'Compute' });
        setShowCreateModal(false);
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' };
            case 'in_progress': return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' };
            case 'pending_validation': return { bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.3)', text: '#eab308' };
            case 'completed': return { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#8b5cf6' };
            case 'cancelled': return { bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)', text: '#6b7280' };
            default: return { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' };
        }
    };

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
                    alignItems: 'center',
                    marginBottom: '2rem',
                    flexWrap: 'wrap',
                    gap: '1rem',
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '2.5rem',
                            fontWeight: 700,
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                        }}>
                            <span style={{ color: '#ff6b35' }}><BriefcaseIcon /></span>
                            <span style={{ color: '#e5e5e5' }}>Task Marketplace</span>
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <p style={{ color: '#6b7280', margin: 0, fontSize: '1rem' }}>
                                Create tasks, claim work, earn rewards
                            </p>
                            <span style={{
                                fontSize: '0.75rem',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '0.25rem',
                                background: network === 'devnet' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                                color: network === 'devnet' ? '#eab308' : '#22c55e',
                                border: `1px solid ${network === 'devnet' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                            }}>
                                {network}
                            </span>
                        </div>
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
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#9ca3af',
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '0.75rem 1.25rem',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.3)';
                                e.currentTarget.style.color = '#ff6b35';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.color = '#9ca3af';
                            }}
                        >
                            <RefreshIcon />
                            {isLoading ? 'Syncing...' : 'Sync Chain'}
                        </button>
                        <button
                            onClick={() => authenticated ? setShowCreateModal(true) : login()}
                            className="btn-glow"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontFamily: 'inherit',
                                fontSize: '1rem',
                                fontWeight: 500,
                                color: '#0a0a0a',
                                background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                                border: 'none',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                boxShadow: '0 0 20px rgba(255, 107, 53, 0.3)',
                            }}
                        >
                            <PlusIcon />
                            Create Task
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem',
                }}>
                    {[
                        { label: 'Open Tasks', value: tasks.filter(t => t.status === 'open').length, color: '#22c55e' },
                        { label: 'Total Rewards', value: `${tasks.reduce((sum, t) => sum + t.reward, 0).toFixed(1)} SOL`, color: '#ff6b35' },
                        { label: 'On-Chain Tasks', value: onChainCount, color: '#3b82f6' },
                    ].map((stat, idx) => (
                        <div key={idx} style={{
                            padding: '1.25rem',
                            borderRadius: '0.75rem',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            background: 'rgba(26, 26, 26, 0.5)',
                        }}>
                            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>{stat.label}</p>
                            <p style={{ color: stat.color, fontSize: '1.5rem', fontWeight: 600, margin: '0.25rem 0 0 0' }}>{stat.value}</p>
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
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: filter === f ? '#ff6b35' : '#9ca3af',
                                background: filter === f ? 'rgba(255, 107, 53, 0.1)' : 'transparent',
                                border: `1px solid ${filter === f ? 'rgba(255, 107, 53, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
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
                            <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '0.75rem' }} />
                        ))}
                    </div>
                )}

                {/* Task List */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                }}>
                    {filteredTasks.map((task) => {
                        const statusColors = getStatusColor(task.status);
                        return (
                            <div
                                key={task.id}
                                className="card-hover"
                                style={{
                                    padding: '1.5rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    background: 'rgba(26, 26, 26, 0.5)',
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
                                            gap: '0.75rem',
                                            marginBottom: '0.5rem',
                                        }}>
                                            <h3 style={{
                                                fontSize: '1.125rem',
                                                fontWeight: 600,
                                                color: '#e5e5e5',
                                                margin: 0,
                                            }}>{task.title}</h3>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                color: statusColors.text,
                                                background: statusColors.bg,
                                                border: `1px solid ${statusColors.border}`,
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '0.25rem',
                                            }}>
                                                {task.status.replace('_', ' ')}
                                            </span>
                                            {task.onChain && (
                                                <span style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem',
                                                    fontSize: '0.625rem',
                                                    color: '#3b82f6',
                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                                    padding: '0.125rem 0.375rem',
                                                    borderRadius: '0.25rem',
                                                }}>
                                                    <ChainIcon /> on-chain
                                                </span>
                                            )}
                                        </div>
                                        <p style={{
                                            color: '#9ca3af',
                                            fontSize: '0.875rem',
                                            margin: '0 0 1rem 0',
                                            lineHeight: 1.5,
                                        }}>{task.description}</p>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            flexWrap: 'wrap',
                                        }}>
                                            <span style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                fontSize: '0.75rem',
                                                color: '#6b7280',
                                            }}>
                                                <ClockIcon />
                                                {task.createdAt}
                                            </span>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                color: '#ff6b35',
                                                background: 'rgba(255, 107, 53, 0.1)',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '0.25rem',
                                            }}>
                                                {task.category}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                by {task.creator}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'flex-end',
                                        gap: '0.75rem',
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            fontSize: '1.25rem',
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
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    fontFamily: 'inherit',
                                                    fontSize: '0.875rem',
                                                    fontWeight: 500,
                                                    color: '#0a0a0a',
                                                    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                                    border: 'none',
                                                    padding: '0.5rem 1rem',
                                                    borderRadius: '0.375rem',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                }}
                                            >
                                                <ShieldIcon />
                                                Claim Task
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
                        <p style={{ fontSize: '1.125rem', margin: 0 }}>No tasks found</p>
                        <p style={{ fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>Try adjusting your filters or create a new task</p>
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
                        background: '#1a1a1a',
                        borderRadius: '1rem',
                        border: '1px solid rgba(255, 107, 53, 0.2)',
                        padding: '2rem',
                        maxWidth: '500px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                    }}>
                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            color: '#e5e5e5',
                            margin: '0 0 1.5rem 0',
                        }}>Create New Task</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af', marginBottom: '0.5rem' }}>Title</label>
                                <input
                                    type="text"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    placeholder="Enter task title"
                                    style={{
                                        width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                        border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(26, 26, 26, 0.8)',
                                        color: '#e5e5e5', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af', marginBottom: '0.5rem' }}>Description</label>
                                <textarea
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    placeholder="Describe the task requirements"
                                    rows={4}
                                    style={{
                                        width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                        border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(26, 26, 26, 0.8)',
                                        color: '#e5e5e5', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af', marginBottom: '0.5rem' }}>Reward (SOL)</label>
                                    <input
                                        type="number" step="0.1" min="0.1"
                                        value={newTask.reward}
                                        onChange={(e) => setNewTask({ ...newTask, reward: e.target.value })}
                                        placeholder="0.0"
                                        style={{
                                            width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                            border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(26, 26, 26, 0.8)',
                                            color: '#e5e5e5', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af', marginBottom: '0.5rem' }}>Category</label>
                                    <select
                                        value={newTask.category}
                                        onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                                        style={{
                                            width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                            border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(26, 26, 26, 0.8)',
                                            color: '#e5e5e5', fontSize: '1rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                                        }}
                                    >
                                        <option value="Compute">Compute</option>
                                        <option value="Inference">Inference</option>
                                        <option value="Security">Security</option>
                                        <option value="Network">Network</option>
                                        <option value="Storage">Storage</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{
                                    flex: 1, fontFamily: 'inherit', fontSize: '1rem', fontWeight: 500,
                                    color: '#9ca3af', background: 'transparent', border: '1px solid rgba(255, 255, 255, 0.1)',
                                    padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer',
                                }}
                            >Cancel</button>
                            <button
                                onClick={handleCreateTask}
                                style={{
                                    flex: 1, fontFamily: 'inherit', fontSize: '1rem', fontWeight: 500,
                                    color: '#0a0a0a', background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                                    border: 'none', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer',
                                }}
                            >Create Task</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

import { usePrivy } from '@privy-io/react-auth';
import { Link } from 'react-router-dom';
import { useSolana } from '../contexts/SolanaContext';

// Icons
const WalletIcon = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
);

const ChartIcon = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const TaskIcon = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
);

const ClockIcon = () => (
    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ArrowUpIcon = () => (
    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
);

const ArrowDownIcon = () => (
    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
);

const CheckCircleIcon = () => (
    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ExternalLinkIcon = () => (
    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
);

// Mock data
const MOCK_MY_TASKS = [
    { id: 'task_101', title: 'API Integration', status: 'in_progress', reward: 0.8, deadline: '2d left' },
    { id: 'task_102', title: 'Data Pipeline', status: 'completed', reward: 0.5, completedAt: '1d ago' },
    { id: 'task_103', title: 'ML Model Training', status: 'pending_verification', reward: 1.5, submittedAt: '3h ago' },
];

const MOCK_CREATED_TASKS = [
    { id: 'task_201', title: 'Smart Contract Audit', status: 'open', reward: 2.0, applicants: 3 },
    { id: 'task_202', title: 'Frontend UI Update', status: 'claimed', reward: 0.6, worker: '8kPm...qN4r' },
];

const MOCK_ACTIVITY = [
    { type: 'claim', message: 'You claimed "API Integration"', time: '2h ago', amount: null },
    { type: 'reward', message: 'Received reward for "Data Pipeline"', time: '1d ago', amount: '+0.5 SOL' },
    { type: 'create', message: 'Created task "Smart Contract Audit"', time: '2d ago', amount: '-2.0 SOL' },
    { type: 'deposit', message: 'Deposited to escrow', time: '3d ago', amount: '-0.6 SOL' },
];

export function Dashboard() {
    const { authenticated, login, user } = usePrivy();
    const { balance, isLoading: balanceLoading, refreshBalance, network } = useSolana();

    const getDisplayName = () => {
        if (user?.wallet?.address) {
            const address = user.wallet.address;
            return `${address.slice(0, 6)}...${address.slice(-4)}`;
        }
        if (user?.email?.address) {
            return user.email.address;
        }
        return 'User';
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed':
                return { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' };
            case 'in_progress':
                return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' };
            case 'pending_verification':
                return { bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.3)', text: '#eab308' };
            case 'open':
                return { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' };
            case 'claimed':
                return { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.3)', text: '#8b5cf6' };
            default:
                return { bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.3)', text: '#6b7280' };
        }
    };

    if (!authenticated) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255, 107, 53, 0.2)',
                    background: 'rgba(26, 26, 26, 0.5)',
                    maxWidth: '400px',
                }}>
                    <div style={{
                        width: '4rem',
                        height: '4rem',
                        margin: '0 auto 1.5rem',
                        borderRadius: '1rem',
                        background: 'rgba(255, 107, 53, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ff6b35',
                    }}>
                        <WalletIcon />
                    </div>
                    <h2 style={{ color: '#e5e5e5', fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>
                        Connect Your Wallet
                    </h2>
                    <p style={{ color: '#6b7280', margin: '0 0 1.5rem 0' }}>
                        Connect your wallet to view your dashboard, manage tasks, and track earnings.
                    </p>
                    <button
                        onClick={login}
                        style={{
                            fontFamily: 'inherit',
                            fontSize: '1rem',
                            fontWeight: 500,
                            color: '#0a0a0a',
                            background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                            border: 'none',
                            padding: '0.875rem 2rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            boxShadow: '0 0 20px rgba(255, 107, 53, 0.3)',
                        }}
                    >
                        Connect Wallet
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
            position: 'relative',
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
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        margin: 0,
                        color: '#e5e5e5',
                    }}>
                        Dashboard
                    </h1>
                    <p style={{
                        color: '#6b7280',
                        margin: '0.5rem 0 0 0',
                    }}>
                        Welcome back, <span style={{ color: '#ff6b35' }}>{getDisplayName()}</span>
                    </p>
                </div>

                {/* Stats Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem',
                }}>
                    {/* Wallet Balance */}
                    <div style={{
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255, 107, 53, 0.2)',
                        background: 'rgba(26, 26, 26, 0.5)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: '#ff6b35' }}><WalletIcon /></span>
                                <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Wallet Balance</span>
                            </div>
                            <button
                                onClick={refreshBalance}
                                disabled={balanceLoading}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '0.25rem',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ff6b35'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                            >
                                {balanceLoading ? 'Loading...' : 'Refresh'}
                            </button>
                        </div>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: '#e5e5e5', margin: 0 }}>
                            {balanceLoading ? '...' : balance !== null ? balance.toFixed(4) : '0.00'} <span style={{ fontSize: '1rem', color: '#6b7280' }}>SOL</span>
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                            {network === 'devnet' ? (
                                <span style={{ color: '#eab308' }}>Devnet</span>
                            ) : (
                                `≈ $${((balance || 0) * 100).toFixed(2)} USD`
                            )}
                        </p>
                    </div>

                    {/* Total Earnings */}
                    <div style={{
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        background: 'rgba(26, 26, 26, 0.5)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <span style={{ color: '#22c55e' }}><ChartIcon /></span>
                            <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Total Earnings</span>
                        </div>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e', margin: 0 }}>
                            5.2 <span style={{ fontSize: '1rem', color: '#6b7280' }}>SOL</span>
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#22c55e', margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <ArrowUpIcon /> +12% this week
                        </p>
                    </div>

                    {/* Tasks Completed */}
                    <div style={{
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        background: 'rgba(26, 26, 26, 0.5)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <span style={{ color: '#3b82f6' }}><TaskIcon /></span>
                            <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Tasks Completed</span>
                        </div>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: '#e5e5e5', margin: 0 }}>
                            12
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                            3 in progress
                        </p>
                    </div>

                    {/* Success Rate */}
                    <div style={{
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(139, 92, 246, 0.2)',
                        background: 'rgba(26, 26, 26, 0.5)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <span style={{ color: '#8b5cf6' }}><CheckCircleIcon /></span>
                            <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Success Rate</span>
                        </div>
                        <p style={{ fontSize: '2rem', fontWeight: 700, color: '#e5e5e5', margin: 0 }}>
                            96%
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                            Top 10% of agents
                        </p>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                    gap: '1.5rem',
                }}>
                    {/* My Claimed Tasks */}
                    <div style={{
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        background: 'rgba(26, 26, 26, 0.5)',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                        }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#e5e5e5', margin: 0 }}>
                                My Tasks
                            </h2>
                            <Link to="/marketplace" style={{
                                fontSize: '0.875rem',
                                color: '#ff6b35',
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                            }}>
                                View All <ExternalLinkIcon />
                            </Link>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {MOCK_MY_TASKS.map((task) => {
                                const statusStyle = getStatusStyle(task.status);
                                return (
                                    <div key={task.id} style={{
                                        padding: '1rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        background: 'rgba(26, 26, 26, 0.3)',
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                        }}>
                                            <div>
                                                <p style={{ color: '#e5e5e5', fontWeight: 500, margin: 0 }}>{task.title}</p>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    marginTop: '0.5rem',
                                                }}>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        color: statusStyle.text,
                                                        background: statusStyle.bg,
                                                        border: `1px solid ${statusStyle.border}`,
                                                        padding: '0.125rem 0.5rem',
                                                        borderRadius: '0.25rem',
                                                        textTransform: 'capitalize',
                                                    }}>
                                                        {task.status.replace('_', ' ')}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        color: '#6b7280',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                    }}>
                                                        <ClockIcon />
                                                        {task.deadline || task.completedAt || task.submittedAt}
                                                    </span>
                                                </div>
                                            </div>
                                            <span style={{ color: '#ff6b35', fontWeight: 600 }}>
                                                {task.reward} SOL
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Created Tasks */}
                    <div style={{
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        background: 'rgba(26, 26, 26, 0.5)',
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                        }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#e5e5e5', margin: 0 }}>
                                Created Tasks
                            </h2>
                            <Link to="/marketplace" style={{
                                fontSize: '0.875rem',
                                color: '#ff6b35',
                                textDecoration: 'none',
                            }}>
                                + Create New
                            </Link>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {MOCK_CREATED_TASKS.map((task) => {
                                const statusStyle = getStatusStyle(task.status);
                                return (
                                    <div key={task.id} style={{
                                        padding: '1rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        background: 'rgba(26, 26, 26, 0.3)',
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                        }}>
                                            <div>
                                                <p style={{ color: '#e5e5e5', fontWeight: 500, margin: 0 }}>{task.title}</p>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    marginTop: '0.5rem',
                                                }}>
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        color: statusStyle.text,
                                                        background: statusStyle.bg,
                                                        border: `1px solid ${statusStyle.border}`,
                                                        padding: '0.125rem 0.5rem',
                                                        borderRadius: '0.25rem',
                                                        textTransform: 'capitalize',
                                                    }}>
                                                        {task.status}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                        {task.applicants ? `${task.applicants} applicants` : `Worker: ${task.worker}`}
                                                    </span>
                                                </div>
                                            </div>
                                            <span style={{ color: '#ff6b35', fontWeight: 600 }}>
                                                {task.reward} SOL
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div style={{
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        background: 'rgba(26, 26, 26, 0.5)',
                        gridColumn: 'span 1',
                    }}>
                        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#e5e5e5', margin: '0 0 1rem 0' }}>
                            Recent Activity
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {MOCK_ACTIVITY.map((activity, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    background: 'rgba(26, 26, 26, 0.3)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: '2rem',
                                            height: '2rem',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: activity.type === 'reward' ? 'rgba(34, 197, 94, 0.1)' :
                                                activity.type === 'create' || activity.type === 'deposit' ? 'rgba(239, 68, 68, 0.1)' :
                                                    'rgba(59, 130, 246, 0.1)',
                                            color: activity.type === 'reward' ? '#22c55e' :
                                                activity.type === 'create' || activity.type === 'deposit' ? '#ef4444' :
                                                    '#3b82f6',
                                        }}>
                                            {activity.type === 'reward' ? <ArrowDownIcon /> :
                                                activity.type === 'create' || activity.type === 'deposit' ? <ArrowUpIcon /> :
                                                    <TaskIcon />}
                                        </div>
                                        <div>
                                            <p style={{ color: '#e5e5e5', fontSize: '0.875rem', margin: 0 }}>
                                                {activity.message}
                                            </p>
                                            <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '0.25rem 0 0 0' }}>
                                                {activity.time}
                                            </p>
                                        </div>
                                    </div>
                                    {activity.amount && (
                                        <span style={{
                                            fontWeight: 600,
                                            fontSize: '0.875rem',
                                            color: activity.amount.startsWith('+') ? '#22c55e' : '#ef4444',
                                        }}>
                                            {activity.amount}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

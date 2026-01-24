import { Link, useLocation } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';

const WalletIcon = () => (
    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
);

const LogoutIcon = () => (
    <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

export function Header() {
    const location = useLocation();
    const { login, logout, authenticated, user } = usePrivy();

    const isActive = (path: string) => location.pathname === path;

    const navLinkStyle = (path: string) => ({
        fontFamily: 'inherit',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: isActive(path) ? '#ff6b35' : '#9ca3af',
        textDecoration: 'none',
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        transition: 'all 0.2s ease',
        position: 'relative' as const,
        background: isActive(path) ? 'rgba(255, 107, 53, 0.1)' : 'transparent',
    });

    // Get display name
    const getDisplayName = () => {
        if (user?.wallet?.address) {
            const address = user.wallet.address;
            return `${address.slice(0, 4)}...${address.slice(-4)}`;
        }
        if (user?.email?.address) {
            return user.email.address.split('@')[0];
        }
        if (user?.google?.email) {
            return user.google.email.split('@')[0];
        }
        if (user?.twitter?.username) {
            return `@${user.twitter.username}`;
        }
        return 'Connected';
    };

    return (
        <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            borderBottom: '1px solid rgba(255, 107, 53, 0.2)',
            background: 'rgba(10, 10, 10, 0.9)',
            backdropFilter: 'blur(12px)',
        }}>
            <div style={{
                maxWidth: '80rem',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.5rem',
            }}>
                {/* Logo */}
                <Link to="/" style={{
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                }}>
                    <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '2.5rem',
                        height: '2.5rem',
                        background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        color: '#0a0a0a',
                    }}>
                        {">_"}
                    </span>
                    <span style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        NARKINA5
                    </span>
                </Link>

                {/* Navigation */}
                <nav style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(26, 26, 26, 0.5)',
                    padding: '0.25rem',
                    borderRadius: '0.5rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                }}>
                    <Link to="/" style={navLinkStyle('/')}>Home</Link>
                    <Link to="/personality" style={navLinkStyle('/personality')}>Personality</Link>
                    <Link to="/about" style={navLinkStyle('/about')}>About</Link>
                    <Link to="/contact" style={navLinkStyle('/contact')}>Contact</Link>
                </nav>

                {/* Wallet Connection */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {authenticated ? (
                        <>
                            {/* Connected State */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                background: 'rgba(34, 197, 94, 0.1)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                            }}>
                                <div style={{
                                    width: '0.5rem',
                                    height: '0.5rem',
                                    borderRadius: '50%',
                                    background: '#22c55e',
                                }} />
                                <span style={{
                                    fontFamily: 'inherit',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: '#22c55e',
                                }}>
                                    {getDisplayName()}
                                </span>
                            </div>
                            <button
                                onClick={logout}
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
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                                    e.currentTarget.style.color = '#ef4444';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    e.currentTarget.style.color = '#9ca3af';
                                }}
                            >
                                <LogoutIcon />
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Not Connected State */}
                            <button
                                onClick={login}
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
                                    padding: '0.5rem 1.25rem',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 0 20px rgba(255, 107, 53, 0.3)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 107, 53, 0.5)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 107, 53, 0.3)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <WalletIcon />
                                Connect Wallet
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

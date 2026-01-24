import { Link, useLocation } from 'react-router-dom';

export function Header() {
    const location = useLocation();

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

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button style={{
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
                        e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.5)';
                        e.currentTarget.style.color = '#e5e5e5';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.color = '#9ca3af';
                    }}
                    >
                        Sign in
                    </button>
                    <button style={{
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
                        Sign up
                    </button>
                </div>
            </div>
        </header>
    );
}

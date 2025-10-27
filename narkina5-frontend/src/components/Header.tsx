import { Link } from 'react-router-dom';

export function Header() {
    return (
        <header style={{ borderBottom: '1px solid #e5e5e5', backgroundColor: 'white' }}>
            <div style={{
                maxWidth: '80rem',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.5rem'
            }}>
                <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem', color: '#6b7280' }}>{">_"}</span>
                    <span style={{
                        fontFamily: 'Courier New, monospace',
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: '#ff6b35'
                    }}>NARKINA5</span>
                </Link>

                <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <Link to="/" style={{
                        fontFamily: 'Courier New, monospace',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#ff6b35',
                        textDecoration: 'none'
                    }}>
                        Home
                    </Link>
                    <Link to="/personality" style={{
                        fontFamily: 'Courier New, monospace',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#ff6b35',
                        textDecoration: 'none'
                    }}>
                        Personality
                    </Link>
                    <Link to="/about" style={{
                        fontFamily: 'Courier New, monospace',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#ff6b35',
                        textDecoration: 'none'
                    }}>
                        About
                    </Link>
                    <Link to="/contact" style={{
                        fontFamily: 'Courier New, monospace',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#ff6b35',
                        textDecoration: 'none'
                    }}>
                        Contact
                    </Link>
                </nav>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button style={{
                        fontFamily: 'Courier New, monospace',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer'
                    }}>
                        Sign in
                    </button>
                    <button style={{
                        backgroundColor: '#ff6b35',
                        fontFamily: 'Courier New, monospace',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer'
                    }}>
                        Sign up
                    </button>
                </div>
            </div>
        </header>
    );
}

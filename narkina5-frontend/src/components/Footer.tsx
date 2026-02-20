import { Link } from 'react-router-dom';
import { TwitterIcon, GithubIcon } from './Icons';

export function Footer() {
    const currentYear = new Date().getFullYear();
    const githubRepo = 'https://github.com/starlash7/Narkina5';

    const footerLinks = [
        {
            title: 'Arena',
            links: [
                { label: 'PnL Arena', to: '/pnl-arena' },
                { label: 'Arena Live', to: '/pnl-arena/live' },
                { label: 'About', to: '/about' },
            ],
        },
    ];

    const socialLinks = [
        { icon: <TwitterIcon />, href: 'https://x.com/Narkina5Agent', label: 'Twitter' },
        { icon: <GithubIcon />, href: githubRepo, label: 'GitHub' },
    ];

    return (
        <footer style={{
            borderTop: '1px solid rgba(255, 107, 53, 0.1)',
            background: 'rgba(10, 10, 10, 0.8)',
            marginTop: 'auto',
        }}>
            <div style={{
                maxWidth: '80rem',
                margin: '0 auto',
                padding: '3rem 1.5rem 2rem',
            }}>
                {/* Top Section */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '2rem',
                    marginBottom: '3rem',
                }}>
                    {/* Brand */}
                    <div style={{ gridColumn: 'span 1' }}>
                        <Link to="/" style={{
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '1rem',
                        }}>
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '2rem',
                                height: '2rem',
                                background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                                borderRadius: '0.375rem',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                color: '#0a0a0a',
                            }}>
                                {">_"}
                            </span>
                            <span style={{
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}>
                                NARKINA5
                            </span>
                        </Link>
                        <p style={{
                            color: '#6b7280',
                            fontSize: '0.875rem',
                            lineHeight: 1.6,
                            margin: 0,
                        }}>
                            Cell-based PnL elimination arena on Solana.
                        </p>
                    </div>

                    {/* Links */}
                    {footerLinks.map((section) => (
                        <div key={section.title}>
                            <h4 style={{
                                color: '#e5e5e5',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                marginBottom: '1rem',
                                margin: '0 0 1rem 0',
                            }}>
                                {section.title}
                            </h4>
                            <ul style={{
                                listStyle: 'none',
                                padding: 0,
                                margin: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem',
                            }}>
                                {section.links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            to={link.to}
                                            style={{
                                                color: '#6b7280',
                                                textDecoration: 'none',
                                                fontSize: '0.875rem',
                                                transition: 'color 0.2s',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = '#ff6b35'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom Section */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    flexWrap: 'wrap',
                    gap: '1rem',
                }}>
                    <p style={{
                        color: '#6b7280',
                        fontSize: '0.75rem',
                        margin: 0,
                    }}>
                        © {currentYear} Narkina5. Powered by <span style={{ color: '#ff6b35', fontWeight: 600 }}>Pixy7</span>
                    </p>

                    {/* Social Links */}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {socialLinks.map((social) => (
                            <a
                                key={social.label}
                                href={social.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={social.label}
                                style={{
                                    color: '#6b7280',
                                    transition: 'color 0.2s',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ff6b35'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                            >
                                {social.icon}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}

import { Link } from 'react-router-dom';

const TwitterIcon = () => (
    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const GithubIcon = () => (
    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
);

const DiscordIcon = () => (
    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
);

export function Footer() {
    const currentYear = new Date().getFullYear();

    const footerLinks = [
        {
            title: 'Product',
            links: [
                { label: 'Training Floor', to: '/marketplace' },
                { label: 'My Agents', to: '/dashboard' },
                { label: 'Documentation', to: '#' },
            ],
        },
        {
            title: 'Company',
            links: [
                { label: 'About', to: '/about' },
                { label: 'Blog', to: '#' },
                { label: 'Careers', to: '#' },
            ],
        },
        {
            title: 'Legal',
            links: [
                { label: 'Privacy', to: '#' },
                { label: 'Terms', to: '#' },
            ],
        },
    ];

    const socialLinks = [
        { icon: <TwitterIcon />, href: 'https://twitter.com', label: 'Twitter' },
        { icon: <GithubIcon />, href: 'https://github.com', label: 'GitHub' },
        { icon: <DiscordIcon />, href: 'https://discord.com', label: 'Discord' },
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
                            AI Agent Training Factory on Solana.
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
                        © {currentYear} Narkina5. Building the future of decentralized AI.
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

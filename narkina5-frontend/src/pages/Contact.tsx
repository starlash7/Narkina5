const Mail = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

const GitHub = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
);

const Twitter = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const Discord = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
);

export function Contact() {
    const socials = [
        { icon: <Mail />, name: 'Email', handle: 'contact@narkina5.xyz', link: 'mailto:contact@narkina5.xyz' },
        { icon: <GitHub />, name: 'GitHub', handle: 'github.com/narkina5', link: 'https://github.com/narkina5' },
        { icon: <Twitter />, name: 'X (Twitter)', handle: '@narkina5', link: 'https://x.com/narkina5' },
        { icon: <Discord />, name: 'Discord', handle: 'Join our server', link: '#' },
    ];

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
                padding: '4rem 1.5rem',
                position: 'relative',
            }}>
                {/* Header */}
                <div style={{ marginBottom: '3rem' }}>
                    <span style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: '#ff6b35',
                    }}>Get in Touch</span>
                    <h1 style={{
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        margin: '0.5rem 0 0 0',
                        background: 'linear-gradient(135deg, #ffffff, #9ca3af)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        Contact{">_"}
                    </h1>
                </div>

                {/* Intro */}
                <div style={{
                    marginBottom: '3rem',
                    padding: '2.5rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255, 107, 53, 0.2)',
                    background: 'rgba(26, 26, 26, 0.5)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 0 40px rgba(255, 107, 53, 0.1)',
                }}>
                    <p style={{
                        fontSize: '1.25rem',
                        lineHeight: 1.8,
                        color: '#9ca3af',
                        margin: 0,
                    }}>
                        Interested in collaborating or learning more about Narkina5?
                        We'd love to hear from you. Reach out through any of our channels below.
                    </p>
                </div>

                {/* Social Links */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '3rem',
                }}>
                    {socials.map((social, idx) => (
                        <a
                            key={idx}
                            href={social.link}
                            target={social.link.startsWith('http') ? '_blank' : undefined}
                            rel={social.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1.5rem',
                                borderRadius: '0.75rem',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                background: 'rgba(26, 26, 26, 0.3)',
                                textDecoration: 'none',
                                transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.3)';
                                e.currentTarget.style.background = 'rgba(26, 26, 26, 0.6)';
                                e.currentTarget.style.transform = 'translateY(-4px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.background = 'rgba(26, 26, 26, 0.3)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{
                                width: '3rem',
                                height: '3rem',
                                borderRadius: '0.5rem',
                                background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(255, 107, 53, 0.05))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ff6b35',
                                flexShrink: 0,
                            }}>
                                {social.icon}
                            </div>
                            <div>
                                <div style={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: '#e5e5e5',
                                    marginBottom: '0.25rem',
                                }}>{social.name}</div>
                                <div style={{
                                    fontSize: '0.875rem',
                                    color: '#6b7280',
                                }}>{social.handle}</div>
                            </div>
                        </a>
                    ))}
                </div>

                {/* Join the Movement */}
                <div style={{
                    padding: '3rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(26, 26, 26, 0.3)',
                    textAlign: 'center',
                }}>
                    <h2 style={{
                        fontSize: '1.75rem',
                        fontWeight: 600,
                        color: '#e5e5e5',
                        margin: '0 0 1rem 0',
                    }}>
                        Join the Movement
                    </h2>
                    <p style={{
                        fontSize: '1.125rem',
                        lineHeight: 1.8,
                        color: '#9ca3af',
                        margin: '0 0 2rem 0',
                        maxWidth: '40rem',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                    }}>
                        Be part of the decentralized AI revolution. Connect with our community of developers, innovators, and
                        blockchain enthusiasts working to build the future of autonomous agents.
                    </p>
                    <button style={{
                        fontFamily: 'inherit',
                        fontSize: '1rem',
                        fontWeight: 500,
                        color: '#0a0a0a',
                        background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                        border: 'none',
                        padding: '0.875rem 2.5rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        boxShadow: '0 0 30px rgba(255, 107, 53, 0.4)',
                        transition: 'all 0.2s ease',
                    }}>
                        Join Community
                    </button>
                </div>
            </main>
        </div>
    );
}

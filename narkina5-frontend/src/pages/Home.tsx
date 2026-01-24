import { useState } from 'react';

const Copy = () => (
    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const Check = () => (
    <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const Terminal = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const Cube = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
);

const Zap = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

const Shield = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

export function Home() {
    const [copied, setCopied] = useState(false);
    const address = "EaVBaKvaimQs88sNVpjutm2sCxsnyxdR7kQQBxy9Qh24";

    const handleCopy = async () => {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const features = [
        { icon: <Terminal />, title: 'AI Agent', desc: 'Autonomous agent powered by ElizaOS' },
        { icon: <Cube />, title: 'Blockchain', desc: 'Decentralized infrastructure' },
        { icon: <Zap />, title: 'Performance', desc: 'Fast and precise execution' },
        { icon: <Shield />, title: 'Security', desc: 'Secure smart contracts' },
    ];

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

            {/* Gradient Orb */}
            <div style={{
                position: 'absolute',
                top: '-20%',
                right: '-10%',
                width: '40rem',
                height: '40rem',
                background: 'radial-gradient(circle, rgba(255, 107, 53, 0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <main style={{
                maxWidth: '80rem',
                margin: '0 auto',
                padding: '6rem 1.5rem',
                position: 'relative',
            }}>
                {/* Hero Section */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    marginBottom: '5rem',
                }}>
                    {/* Logo Animation */}
                    <div style={{
                        width: '8rem',
                        height: '8rem',
                        marginBottom: '2rem',
                        background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(255, 107, 53, 0.05))',
                        borderRadius: '1.5rem',
                        border: '1px solid rgba(255, 107, 53, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 60px rgba(255, 107, 53, 0.2)',
                    }}>
                        <span style={{
                            fontSize: '2.5rem',
                            fontWeight: 'bold',
                            color: '#ff6b35',
                        }}>{">_"}</span>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '1rem',
                    }}>
                        <h1 style={{
                            fontSize: '4rem',
                            fontWeight: 800,
                            margin: 0,
                            background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            letterSpacing: '-0.02em',
                        }}>
                            NARKINA
                        </h1>
                        <span style={{
                            fontSize: '4rem',
                            fontWeight: 800,
                            color: '#ffffff',
                            letterSpacing: '-0.02em',
                        }}>5</span>
                    </div>

                    <p style={{
                        fontSize: '1.125rem',
                        color: '#6b7280',
                        marginBottom: '0.5rem',
                        fontFamily: 'inherit',
                        letterSpacing: '0.2em',
                        textTransform: 'uppercase',
                    }}>
                        Decentralized AI Agent Collective
                    </p>

                    <p style={{
                        fontSize: '1.25rem',
                        color: '#9ca3af',
                        maxWidth: '36rem',
                        margin: '1rem 0 2rem 0',
                        lineHeight: 1.6,
                    }}>
                        Where blockchain meets artificial intelligence.<br />
                        Building the future of autonomous digital infrastructure.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button style={{
                            fontFamily: 'inherit',
                            fontSize: '1rem',
                            fontWeight: 500,
                            color: '#0a0a0a',
                            background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                            border: 'none',
                            padding: '0.875rem 2rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            boxShadow: '0 0 30px rgba(255, 107, 53, 0.4)',
                            transition: 'all 0.2s ease',
                        }}>
                            Get Started
                        </button>
                        <button style={{
                            fontFamily: 'inherit',
                            fontSize: '1rem',
                            fontWeight: 500,
                            color: '#e5e5e5',
                            background: 'rgba(26, 26, 26, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            padding: '0.875rem 2rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}>
                            Documentation
                        </button>
                    </div>
                </div>

                {/* Address Section */}
                <div style={{
                    marginBottom: '5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255, 107, 53, 0.2)',
                    background: 'rgba(26, 26, 26, 0.5)',
                    backdropFilter: 'blur(10px)',
                    padding: '1.5rem 2rem',
                    boxShadow: '0 0 40px rgba(255, 107, 53, 0.1)',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                color: '#ff6b35',
                                background: 'rgba(255, 107, 53, 0.1)',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '0.25rem',
                            }}>
                                Contract Address
                            </span>
                            <code style={{
                                fontSize: '0.875rem',
                                color: '#e5e5e5',
                                letterSpacing: '0.02em',
                            }}>{address}</code>
                        </div>
                        <button
                            onClick={handleCopy}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                background: copied ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 107, 53, 0.1)',
                                border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 107, 53, 0.3)'}`,
                                color: copied ? '#22c55e' : '#ff6b35',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {copied ? <Check /> : <Copy />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>

                {/* Features Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '5rem',
                }}>
                    {features.map((feature, idx) => (
                        <div
                            key={idx}
                            style={{
                                padding: '2rem',
                                borderRadius: '0.75rem',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                background: 'rgba(26, 26, 26, 0.3)',
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
                                marginBottom: '1rem',
                                borderRadius: '0.5rem',
                                background: 'rgba(255, 107, 53, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ff6b35',
                            }}>
                                {feature.icon}
                            </div>
                            <h3 style={{
                                fontSize: '1.125rem',
                                fontWeight: 600,
                                color: '#e5e5e5',
                                margin: '0 0 0.5rem 0',
                            }}>{feature.title}</h3>
                            <p style={{
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                margin: 0,
                                lineHeight: 1.5,
                            }}>{feature.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Description Section */}
                <div style={{
                    padding: '3rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(26, 26, 26, 0.3)',
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem',
                        fontSize: '1.125rem',
                        lineHeight: 1.8,
                        color: '#9ca3af',
                    }}>
                        <p style={{ margin: 0 }}>
                            <span style={{ color: '#ff6b35', fontWeight: 600 }}>Narkina5{">_"}</span> is a decentralized AI agent
                            collective inspired by the stark, industrial world of Narkina5. Here, digital entities operate with
                            relentless precision and unity—mirroring the planet's infamous prison system, where order and repetition are
                            everything.
                        </p>

                        <p style={{ margin: 0 }}>
                            Each <span style={{ color: '#ff6b35', fontWeight: 600 }}>AI agent</span> is designed to adapt, collaborate, and
                            evolve—building a digital infrastructure as resilient and efficient as the prisoners' assembly lines. The
                            Narkina5 network thrives on discipline, innovation, and the collective will to break boundaries.
                        </p>

                        <p style={{ margin: 0 }}>
                            Join the <span style={{ color: '#ff6b35', fontWeight: 600 }}>Narkina5{">_"}</span> initiative and
                            become part of a new era in decentralized AI.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '2rem 1.5rem',
                textAlign: 'center',
            }}>
                <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: 0,
                }}>
                    © 2025 Narkina5. Building the future of decentralized AI.
                </p>
            </footer>
        </div>
    );
}

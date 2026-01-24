const Brain = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
);

const Code = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const Chat = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

export function Personality() {
    const traits = [
        { icon: <Brain />, title: 'Analytical', desc: 'Data-driven analysis with logical reasoning' },
        { icon: <Code />, title: 'Technical', desc: 'Expert in blockchain, DeFi, and smart contracts' },
        { icon: <Chat />, title: 'Accessible', desc: 'Clear communication of complex concepts' },
    ];

    const expertise = [
        'Blockchain Technology & Cryptocurrency',
        'DeFi (Decentralized Finance)',
        'NFTs & Digital Assets',
        'Smart Contract Development',
        'AI & Machine Learning',
        'Web3.0 & Metaverse',
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
                    }}>Character Profile</span>
                    <h1 style={{
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        margin: '0.5rem 0 0 0',
                        background: 'linear-gradient(135deg, #ffffff, #9ca3af)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        Personality{">_"}
                    </h1>
                </div>

                {/* Traits Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '3rem',
                }}>
                    {traits.map((trait, idx) => (
                        <div
                            key={idx}
                            style={{
                                padding: '2rem',
                                borderRadius: '0.75rem',
                                border: '1px solid rgba(255, 107, 53, 0.2)',
                                background: 'rgba(26, 26, 26, 0.5)',
                                backdropFilter: 'blur(10px)',
                                transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.4)';
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 107, 53, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(255, 107, 53, 0.2)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div style={{
                                width: '3rem',
                                height: '3rem',
                                marginBottom: '1rem',
                                borderRadius: '0.5rem',
                                background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(255, 107, 53, 0.05))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ff6b35',
                            }}>
                                {trait.icon}
                            </div>
                            <h3 style={{
                                fontSize: '1.25rem',
                                fontWeight: 600,
                                color: '#e5e5e5',
                                margin: '0 0 0.5rem 0',
                            }}>{trait.title}</h3>
                            <p style={{
                                fontSize: '0.9375rem',
                                color: '#9ca3af',
                                margin: 0,
                                lineHeight: 1.6,
                            }}>{trait.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Core Description */}
                <div style={{
                    marginBottom: '3rem',
                    padding: '2.5rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(26, 26, 26, 0.3)',
                }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        color: '#ff6b35',
                        margin: '0 0 1.5rem 0',
                    }}>
                        Core Traits
                    </h2>
                    <p style={{
                        fontSize: '1.125rem',
                        lineHeight: 1.8,
                        color: '#9ca3af',
                        margin: 0,
                    }}>
                        Narkina5 embodies the essence of industrial precision and digital resilience. As a blockchain AI agent,
                        it combines technical accuracy with creative innovation. Built on the ElizaOS framework, it provides
                        intelligent assistance for navigating the complex world of Web3 and decentralized technologies.
                    </p>
                </div>

                {/* Expertise */}
                <div style={{
                    padding: '2.5rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(26, 26, 26, 0.3)',
                    marginBottom: '3rem',
                }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        color: '#ff6b35',
                        margin: '0 0 1.5rem 0',
                    }}>
                        Areas of Expertise
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1rem',
                    }}>
                        {expertise.map((item, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '1rem',
                                    borderRadius: '0.5rem',
                                    background: 'rgba(255, 107, 53, 0.05)',
                                    border: '1px solid rgba(255, 107, 53, 0.1)',
                                }}
                            >
                                <span style={{
                                    width: '0.5rem',
                                    height: '0.5rem',
                                    borderRadius: '50%',
                                    background: '#ff6b35',
                                    flexShrink: 0,
                                }} />
                                <span style={{
                                    fontSize: '0.9375rem',
                                    color: '#e5e5e5',
                                }}>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Communication Style */}
                <div style={{
                    padding: '2.5rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(26, 26, 26, 0.3)',
                }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        color: '#ff6b35',
                        margin: '0 0 1.5rem 0',
                    }}>
                        Communication Style
                    </h2>
                    <p style={{
                        fontSize: '1.125rem',
                        lineHeight: 1.8,
                        color: '#9ca3af',
                        margin: 0,
                    }}>
                        Narkina5 maintains a balance between technical accuracy and accessibility, explaining complex concepts
                        in clear, understandable terms. Whether discussing DeFi protocols or smart contract security, it ensures
                        information is practical and actionable for users of all experience levels.
                    </p>
                </div>
            </main>
        </div>
    );
}

const Target = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

const Layers = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
);

const Globe = () => (
    <svg style={{ width: '1.5rem', height: '1.5rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export function About() {
    const techStack = [
        { name: 'ElizaOS Framework', desc: 'AI 에이전트 코어 엔진' },
        { name: 'React & TypeScript', desc: '프론트엔드 인터페이스' },
        { name: 'Blockchain Integration', desc: '온체인 데이터 연동' },
        { name: 'AI Model Integration', desc: 'OpenAI API 활용' },
        { name: 'Web3 Technologies', desc: '지갑 연결 & 트랜잭션' },
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
                    }}>Learn More</span>
                    <h1 style={{
                        fontSize: '3rem',
                        fontWeight: 'bold',
                        margin: '0.5rem 0 0 0',
                        background: 'linear-gradient(135deg, #ffffff, #9ca3af)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        About Narkina5{">_"}
                    </h1>
                </div>

                {/* Info Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '3rem',
                }}>
                    {[
                        { icon: <Target />, title: 'Mission', desc: '블록체인과 AI의 융합으로 자율적인 디지털 에이전트 생태계를 구축합니다.' },
                        { icon: <Layers />, title: 'Technology', desc: 'ElizaOS 프레임워크 기반으로 정밀하고 효율적인 AI 시스템을 제공합니다.' },
                        { icon: <Globe />, title: 'Vision', desc: '탈중앙화된 AI 네트워크로 개인과 커뮤니티에 힘을 실어줍니다.' },
                    ].map((card, idx) => (
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
                                {card.icon}
                            </div>
                            <h3 style={{
                                fontSize: '1.25rem',
                                fontWeight: 600,
                                color: '#e5e5e5',
                                margin: '0 0 0.5rem 0',
                            }}>{card.title}</h3>
                            <p style={{
                                fontSize: '0.9375rem',
                                color: '#9ca3af',
                                margin: 0,
                                lineHeight: 1.6,
                            }}>{card.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Mission Statement */}
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
                        Our Mission
                    </h2>
                    <p style={{
                        fontSize: '1.125rem',
                        lineHeight: 1.8,
                        color: '#9ca3af',
                        margin: 0,
                    }}>
                        Narkina5 represents the future of decentralized AI agents. We combine blockchain technology with artificial
                        intelligence to create autonomous digital entities that can operate with precision, adapt to challenges, and
                        collaborate effectively in the emerging Web3 ecosystem. Our goal is to build infrastructure that empowers
                        individuals and communities to harness the power of AI in a trustless, transparent environment.
                    </p>
                </div>

                {/* Tech Stack */}
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
                        Technology Stack
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {techStack.map((tech, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '1rem 1.25rem',
                                    borderRadius: '0.5rem',
                                    background: 'rgba(255, 107, 53, 0.05)',
                                    border: '1px solid rgba(255, 107, 53, 0.1)',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 107, 53, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 107, 53, 0.05)';
                                }}
                            >
                                <span style={{
                                    fontSize: '1rem',
                                    fontWeight: 500,
                                    color: '#e5e5e5',
                                }}>{tech.name}</span>
                                <span style={{
                                    fontSize: '0.875rem',
                                    color: '#6b7280',
                                }}>{tech.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Vision */}
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
                        Vision
                    </h2>
                    <p style={{
                        fontSize: '1.125rem',
                        lineHeight: 1.8,
                        color: '#9ca3af',
                        margin: 0,
                    }}>
                        We envision a world where AI agents operate seamlessly in decentralized networks, contributing to an
                        open, transparent, and collaborative digital infrastructure that empowers individuals and communities
                        worldwide. Through Narkina5, we're building the foundation for the next generation of autonomous,
                        intelligent systems.
                    </p>
                </div>
            </main>
        </div>
    );
}

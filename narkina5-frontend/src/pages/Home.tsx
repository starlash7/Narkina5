import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CopyIcon, CheckIcon } from '../components/Icons';

export function Home() {
    const [copied, setCopied] = useState(false);
    const address = "EaVBaKvaimQs88sNVpjutm2sCxsnyxdR7kQQBxy9Qh24";

    const handleCopy = async () => {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const phases = [
        {
            step: '01',
            title: 'CREATE',
            desc: 'Initialize 64 trading cells.',
            detail: 'Each cell starts with 8 role-diverse agents for a total of 512 competitors.',
        },
        {
            step: '02',
            title: 'COMPETE',
            desc: 'Cells trade on live market data.',
            detail: 'Each floor runs timed PnL simulations with market feeds and selective AI decisions.',
        },
        {
            step: '03',
            title: 'ELIMINATE',
            desc: 'Bottom cells are cut every floor.',
            detail: 'The bracket collapses from 64 cells to one survivor across seven elimination floors.',
        },
        {
            step: '04',
            title: 'GRADUATE',
            desc: 'Final survivor launches on Pump.fun.',
            detail: 'The winning cell signs and publishes a live Solana launch transaction.',
        },
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
                background: 'radial-gradient(circle, rgba(255, 107, 53, 0.12) 0%, transparent 70%)',
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
                    {/* Logo */}
                    <div style={{
                        width: '5rem',
                        height: '5rem',
                        marginBottom: '2rem',
                        background: 'rgba(255, 107, 53, 0.08)',
                        borderRadius: '1rem',
                        border: '1px solid rgba(255, 107, 53, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 60px rgba(255, 107, 53, 0.15)',
                    }}>
                        <span style={{
                            fontSize: '1.75rem',
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
                            fontSize: '3.5rem',
                            fontWeight: 300,
                            margin: 0,
                            color: '#ff6b35',
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                        }}>
                            NARKINA
                        </h1>
                        <span style={{
                            fontSize: '3.5rem',
                            fontWeight: 300,
                            color: '#ffffff',
                            letterSpacing: '0.15em',
                        }}>5</span>
                    </div>

                    <p style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        marginBottom: '0.5rem',
                        letterSpacing: '0.3em',
                        textTransform: 'uppercase',
                    }}>
                        Pump.fun PnL Elimination Arena
                    </p>

                    <p style={{
                        fontSize: '1.25rem',
                        color: '#9ca3af',
                        maxWidth: '40rem',
                        margin: '1.5rem 0 2.5rem 0',
                        lineHeight: 1.7,
                    }}>
                        64 cells enter with 512 agents.
                        <br />
                        Seven floors of eliminations reduce the bracket to one survivor.
                        <br />
                        <span style={{ color: '#ff6b35' }}>Graduate the winner directly to Pump.fun.</span>
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Link to="/pnl-arena" style={{ textDecoration: 'none' }}>
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
                                Enter PnL Arena
                            </button>
                        </Link>
                        <Link to="/about" style={{ textDecoration: 'none' }}>
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
                                About
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Address Section */}
                <div style={{
                    marginBottom: '5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(255, 107, 53, 0.15)',
                    background: 'rgba(26, 26, 26, 0.4)',
                    backdropFilter: 'blur(10px)',
                    padding: '1.25rem 1.5rem',
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
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                color: '#ff6b35',
                                background: 'rgba(255, 107, 53, 0.1)',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '0.25rem',
                            }}>
                                CA
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
                                background: copied ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 107, 53, 0.08)',
                                border: `1px solid ${copied ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 107, 53, 0.2)'}`,
                                color: copied ? '#22c55e' : '#ff6b35',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {copied ? <CheckIcon /> : <CopyIcon />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>

                {/* How It Works - Phases */}
                <div style={{ marginBottom: '5rem' }}>
                    <h2 style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#ff6b35',
                        letterSpacing: '0.3em',
                        textTransform: 'uppercase',
                        marginBottom: '2rem',
                        textAlign: 'center',
                    }}>
                        Arena Flow
                    </h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '1px',
                        background: 'rgba(255, 107, 53, 0.1)',
                        borderRadius: '0.75rem',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 107, 53, 0.1)',
                    }}>
                        {phases.map((phase) => (
                            <div
                                key={phase.step}
                                style={{
                                    padding: '2rem 1.5rem',
                                    background: '#0a0a0a',
                                    transition: 'all 0.3s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(26, 26, 26, 0.8)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#0a0a0a';
                                }}
                            >
                                <span style={{
                                    fontSize: '2rem',
                                    fontWeight: 200,
                                    color: 'rgba(255, 107, 53, 0.3)',
                                    display: 'block',
                                    marginBottom: '1rem',
                                    fontVariantNumeric: 'tabular-nums',
                                }}>{phase.step}</span>
                                <h3 style={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: '#ff6b35',
                                    margin: '0 0 0.5rem 0',
                                    letterSpacing: '0.1em',
                                }}>{phase.title}</h3>
                                <p style={{
                                    fontSize: '0.9rem',
                                    color: '#e5e5e5',
                                    margin: '0 0 0.75rem 0',
                                    lineHeight: 1.5,
                                }}>{phase.desc}</p>
                                <p style={{
                                    fontSize: '0.8rem',
                                    color: '#6b7280',
                                    margin: 0,
                                    lineHeight: 1.5,
                                }}>{phase.detail}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Inside vs Outside */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '5rem',
                }}>
                    {/* Inside the Arena */}
                    <div style={{
                        padding: '2rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        background: 'rgba(26, 26, 26, 0.3)',
                    }}>
                        <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            letterSpacing: '0.2em',
                            color: '#eab308',
                            textTransform: 'uppercase',
                        }}>Inside the Arena</span>
                        <ul style={{
                            listStyle: 'none',
                            padding: 0,
                            margin: '1.25rem 0 0 0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                        }}>
                            {[
                                'Fixed bracket + elimination rules',
                                'Cell-level risk limits enforced',
                                'Only ranked cells advance',
                                'Live market price inputs',
                                'Selective AI spotlight calls',
                            ].map((item, i) => (
                                <li key={i} style={{
                                    fontSize: '0.875rem',
                                    color: '#9ca3af',
                                    paddingLeft: '1rem',
                                    borderLeft: '2px solid rgba(234, 179, 8, 0.3)',
                                }}>{item}</li>
                            ))}
                        </ul>
                    </div>

                    {/* After Graduation */}
                    <div style={{
                        padding: '2rem',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(255, 107, 53, 0.15)',
                        background: 'rgba(255, 107, 53, 0.03)',
                    }}>
                        <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            letterSpacing: '0.2em',
                            color: '#ff6b35',
                            textTransform: 'uppercase',
                        }}>After Graduation</span>
                        <ul style={{
                            listStyle: 'none',
                            padding: 0,
                            margin: '1.25rem 0 0 0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                        }}>
                            {[
                                'Launch memecoin on Pump.fun',
                                'Full rewards, no tax',
                                'Autonomous on-chain activity',
                                'Run Twitter/Telegram bots',
                                'Revenue flows to owner',
                            ].map((item, i) => (
                                <li key={i} style={{
                                    fontSize: '0.875rem',
                                    color: '#e5e5e5',
                                    paddingLeft: '1rem',
                                    borderLeft: '2px solid rgba(255, 107, 53, 0.5)',
                                }}>{item}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom CTA */}
                <div style={{
                    textAlign: 'center',
                    padding: '3rem 2rem',
                    borderRadius: '1rem',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(26, 26, 26, 0.3)',
                }}>
                    <p style={{
                        fontSize: '1.5rem',
                        fontWeight: 300,
                        color: '#e5e5e5',
                        margin: '0 0 0.5rem 0',
                        letterSpacing: '0.05em',
                    }}>
                        Build agents. <span style={{ color: '#ff6b35' }}>Ship coins.</span>
                    </p>
                    <p style={{
                        fontSize: '0.9rem',
                        color: '#6b7280',
                        margin: '0 0 2rem 0',
                    }}>
                        The arena is live. Your cells are waiting.
                    </p>
                    <Link to="/pnl-arena" style={{ textDecoration: 'none' }}>
                        <button style={{
                            fontFamily: 'inherit',
                            fontSize: '1rem',
                            fontWeight: 500,
                            color: '#0a0a0a',
                            background: 'linear-gradient(135deg, #ff6b35, #ff8555)',
                            border: 'none',
                            padding: '1rem 3rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            boxShadow: '0 0 30px rgba(255, 107, 53, 0.3)',
                            transition: 'all 0.2s ease',
                            letterSpacing: '0.05em',
                        }}>
                            Open PnL Arena
                        </button>
                    </Link>
                </div>
            </main>
        </div>
    );
}

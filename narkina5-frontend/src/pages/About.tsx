export function About() {
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
            <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '4rem 1.5rem' }}>
                <h1 style={{
                    fontFamily: 'Courier New, monospace',
                    fontSize: '3rem',
                    fontWeight: 'bold',
                    color: '#ff6b35',
                    marginBottom: '2rem'
                }}>
                    About Narkina5{">_"}
                </h1>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e5e5',
                        padding: '2rem'
                    }}>
                        <h2 style={{
                            fontFamily: 'Courier New, monospace',
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#ff6b35',
                            marginBottom: '1rem'
                        }}>
                            Our Mission
                        </h2>
                        <p style={{ fontSize: '1.125rem', lineHeight: '1.75', color: '#374151' }}>
                            Narkina5 represents the future of decentralized AI agents. We combine blockchain technology with artificial
                            intelligence to create autonomous digital entities that can operate with precision, adapt to challenges, and
                            collaborate effectively in the emerging Web3 ecosystem.
                        </p>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e5e5',
                        padding: '2rem'
                    }}>
                        <h2 style={{
                            fontFamily: 'Courier New, monospace',
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#ff6b35',
                            marginBottom: '1rem'
                        }}>
                            Technology Stack
                        </h2>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <li style={{ fontSize: '1.125rem', color: '#374151' }}>• ElizaOS Framework</li>
                            <li style={{ fontSize: '1.125rem', color: '#374151' }}>• React & TypeScript</li>
                            <li style={{ fontSize: '1.125rem', color: '#374151' }}>• Blockchain Integration</li>
                            <li style={{ fontSize: '1.125rem', color: '#374151' }}>• AI Model Integration</li>
                            <li style={{ fontSize: '1.125rem', color: '#374151' }}>• Web3 Technologies</li>
                        </ul>
                    </div>

                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        border: '1px solid #e5e5e5',
                        padding: '2rem'
                    }}>
                        <h2 style={{
                            fontFamily: 'Courier New, monospace',
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#ff6b35',
                            marginBottom: '1rem'
                        }}>
                            Vision
                        </h2>
                        <p style={{ fontSize: '1.125rem', lineHeight: '1.75', color: '#374151' }}>
                            We envision a world where AI agents operate seamlessly in decentralized networks, contributing to an
                            open, transparent, and collaborative digital infrastructure that empowers individuals and communities
                            worldwide.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

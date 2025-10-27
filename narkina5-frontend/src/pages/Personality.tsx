export function Personality() {
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
                    Personality{">_"}
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
                            Core Traits
                        </h2>
                        <p style={{ fontSize: '1.125rem', lineHeight: '1.75', color: '#374151' }}>
                            Narkina5 embodies the essence of industrial precision and digital resilience. As a blockchain AI agent,
                            it combines technical accuracy with creative innovation.
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
                            Expertise
                        </h2>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <li style={{ fontSize: '1.125rem', color: '#374151' }}>• Blockchain Technology & Cryptocurrency</li>
                            <li style={{ fontSize: '1.125rem', color: '#374151' }}>• DeFi (Decentralized Finance)</li>
                            <li style={{ fontSize: '1.125rem', color: '#374151' }}>• NFTs & Digital Assets</li>
                            <li style={{ fontSize: '1.125rem', color: '#374151' }}>• Smart Contract Development</li>
                            <li style={{ fontSize: '1.125rem', color: '#374151' }}>• AI & Machine Learning</li>
                            <li style={{ fontSize: '1.125rem', color: '#374151' }}>• Web3.0 & Metaverse</li>
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
                            Communication Style
                        </h2>
                        <p style={{ fontSize: '1.125rem', lineHeight: '1.75', color: '#374151' }}>
                            Always responds in Korean, maintaining a balance between technical accuracy and friendliness.
                            Explains complex concepts clearly and provides practical, concrete advice.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

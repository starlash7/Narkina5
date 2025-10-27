export function Contact() {
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
                    Contact{">_"}
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
                            Get in Touch
                        </h2>
                        <p style={{ fontSize: '1.125rem', lineHeight: '1.75', color: '#374151', marginBottom: '1.5rem' }}>
                            Interested in collaborating or learning more about Narkina5? We'd love to hear from you.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <strong style={{ fontFamily: 'Courier New, monospace', color: '#ff6b35' }}>Email:</strong>
                                <span style={{ marginLeft: '0.5rem', color: '#374151' }}>contact@narkina5.xyz</span>
                            </div>
                            <div>
                                <strong style={{ fontFamily: 'Courier New, monospace', color: '#ff6b35' }}>GitHub:</strong>
                                <span style={{ marginLeft: '0.5rem', color: '#374151' }}>github.com/narkina5</span>
                            </div>
                            <div>
                                <strong style={{ fontFamily: 'Courier New, monospace', color: '#ff6b35' }}>Twitter:</strong>
                                <span style={{ marginLeft: '0.5rem', color: '#374151' }}>@narkina5</span>
                            </div>
                        </div>
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
                            Join the Movement
                        </h2>
                        <p style={{ fontSize: '1.125rem', lineHeight: '1.75', color: '#374151' }}>
                            Be part of the decentralized AI revolution. Connect with our community of developers, innovators, and
                            blockchain enthusiasts working to build the future of autonomous agents.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

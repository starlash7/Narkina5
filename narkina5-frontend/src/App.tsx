import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useState } from 'react';

const queryClient = new QueryClient();

// Button component with inline styles
const Button = ({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        fontWeight: '500',
        transition: 'colors',
        outline: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0.5rem 1rem',
        ...(className?.includes('bg-[#ff6b35]') ? {
          backgroundColor: '#ff6b35',
          color: 'white',
        } : {}),
        ...(className?.includes('hover:bg-[#e55a28]') ? {
          ':hover': {
            backgroundColor: '#e55a28',
          }
        } : {}),
      }}
      {...props}
    >
      {children}
    </button>
  );
};

// Icons
const Copy = ({ className }: { className?: string }) => (
  <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const Check = ({ className }: { className?: string }) => (
  <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

/**
 * Main Narkina5 Homepage component
 */
function Narkina5Homepage() {
  const [copied, setCopied] = useState(false);
  const address = "EaVBaKvaimQs88sNVpjutm2sCxsnyxdR7kQQBxy9Qh24";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #e5e5e5', backgroundColor: 'white' }}>
        <div style={{
          maxWidth: '80rem',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', color: '#6b7280' }}>{">_"}</span>
            <span style={{
              fontFamily: 'Courier New, monospace',
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#ff6b35'
            }}>NARKINA5</span>
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <a href="#" style={{
              fontFamily: 'Courier New, monospace',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#ff6b35',
              textDecoration: 'none'
            }}>
              Home
            </a>
            <a href="#" style={{
              fontFamily: 'Courier New, monospace',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#ff6b35',
              textDecoration: 'none'
            }}>
              Personality
            </a>
            <a href="#" style={{
              fontFamily: 'Courier New, monospace',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#ff6b35',
              textDecoration: 'none'
            }}>
              About
            </a>
            <a href="#" style={{
              fontFamily: 'Courier New, monospace',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#ff6b35',
              textDecoration: 'none'
            }}>
              Contact
            </a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button style={{
              fontFamily: 'Courier New, monospace',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}>
              Sign in
            </button>
            <Button style={{
              backgroundColor: '#ff6b35',
              fontFamily: 'Courier New, monospace',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer'
            }}>
              Sign up
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '4rem 1.5rem' }}>
        {/* Hero Section */}
        <div style={{ marginBottom: '4rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <div style={{
            height: '12rem',
            width: '12rem',
            flexShrink: 0,
            borderRadius: '0.5rem',
            backgroundColor: '#e5e5e5'
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 style={{
              fontFamily: 'Courier New, monospace',
              fontSize: '3.75rem',
              fontWeight: 'bold',
              color: '#ff6b35',
              margin: 0
            }}>NARKINA5</h1>
            <span style={{
              fontFamily: 'Courier New, monospace',
              fontSize: '3.75rem',
              color: '#9ca3af'
            }}>{">_"}</span>
          </div>
        </div>

        {/* Address Section */}
        <div style={{
          marginBottom: '4rem',
          borderRadius: '0.5rem',
          border: '1px solid #e5e5e5',
          backgroundColor: 'white',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{
                fontFamily: 'Courier New, monospace',
                fontSize: '0.875rem',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#6b7280'
              }}>
                Narkina5 Address
              </span>
              <code style={{
                fontFamily: 'Courier New, monospace',
                fontSize: '0.875rem',
                color: '#111827'
              }}>{address}</code>
            </div>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex',
                height: '2.5rem',
                width: '2.5rem',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '0.375rem',
                backgroundColor: '#ff6b35',
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
              aria-label="Copy address"
            >
              {copied ? <Check /> : <Copy />}
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontSize: '1.125rem', lineHeight: '1.75', color: '#374151' }}>
          <p>
            <span style={{ fontFamily: 'Courier New, monospace', fontWeight: '600', color: '#ff6b35' }}>Narkina5{">_"}</span> is a decentralized AI agent
            collective inspired by the stark, industrial world of Narkina5. Here, digital entities operate with
            relentless precision and unity—mirroring the planet's infamous prison system, where order and repetition are
            everything.
          </p>

          <p>
            Each <span style={{ fontWeight: '600', color: '#ff6b35' }}>AI agent</span> is designed to adapt, collaborate, and
            evolve—building a digital infrastructure as resilient and efficient as the prisoners' assembly lines. The
            Narkina5 network thrives on discipline, innovation, and the collective will to break boundaries.
          </p>

          <p>
            Join the <span style={{ fontFamily: 'Courier New, monospace', fontWeight: '600', color: '#ff6b35' }}>Narkina5{">_"}</span> initiative and
            become part of a new era in decentralized AI.
          </p>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Narkina5Homepage />
    </QueryClientProvider>
  );
}

export default App;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import './index.css';
import React, { useState } from 'react';
import type { UUID } from '@elizaos/core';

const queryClient = new QueryClient();

// Button component
const Button = ({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Icons
const Copy = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const Check = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Set page metadata
document.title = "NARKINA5 - Decentralized AI Agent Collective";
const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta');
metaDescription.setAttribute('name', 'description');
metaDescription.setAttribute('content', 'A decentralized AI agent collective inspired by the stark, industrial world of Narkina5');
document.head.appendChild(metaDescription);

// Define the interface for the ELIZA_CONFIG
interface ElizaConfig {
  agentId: string;
  apiBase: string;
}

// Declare global window extension for TypeScript
declare global {
  interface Window {
    ELIZA_CONFIG?: ElizaConfig;
  }
}

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
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl text-gray-600">{">_"}</span>
            <span className="font-mono text-xl font-bold text-[#ff6b35]">NARKINA5</span>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#" className="font-mono text-sm font-medium text-[#ff6b35] transition-colors hover:text-[#e55a28]">
              Home
            </a>
            <a href="#" className="font-mono text-sm font-medium text-[#ff6b35] transition-colors hover:text-[#e55a28]">
              Personality
            </a>
            <a href="#" className="font-mono text-sm font-medium text-[#ff6b35] transition-colors hover:text-[#e55a28]">
              About
            </a>
            <a href="#" className="font-mono text-sm font-medium text-[#ff6b35] transition-colors hover:text-[#e55a28]">
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <button className="font-mono text-sm font-medium text-gray-700 transition-colors hover:text-gray-900">
              Sign in
            </button>
            <Button className="bg-[#ff6b35] font-mono text-sm font-medium text-white hover:bg-[#e55a28]">
              Sign up
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-16">
        {/* Hero Section */}
        <div className="mb-16 flex items-center gap-8">
          <div className="h-48 w-48 flex-shrink-0 rounded-lg bg-gray-200" />
          <div className="flex items-center gap-4">
            <h1 className="font-mono text-6xl font-bold text-[#ff6b35]">NARKINA5</h1>
            <span className="font-mono text-6xl text-gray-400">{">_"}</span>
          </div>
        </div>

        {/* Address Section */}
        <div className="mb-16 rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm font-medium uppercase tracking-wide text-gray-500">
                Narkina5 Address
              </span>
              <code className="font-mono text-sm text-gray-900">{address}</code>
            </div>
            <button
              onClick={handleCopy}
              className="flex h-10 w-10 items-center justify-center rounded-md bg-[#ff6b35] text-white transition-colors hover:bg-[#e55a28]"
              aria-label="Copy address"
            >
              {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8 text-lg leading-relaxed text-gray-700">
          <p>
            <span className="font-mono font-semibold text-[#ff6b35]">Narkina5{">_"}</span> is a decentralized AI agent
            collective inspired by the stark, industrial world of Narkina5. Here, digital entities operate with
            relentless precision and unity—mirroring the planet's infamous prison system, where order and repetition are
            everything.
          </p>

          <p>
            Each <span className="font-semibold text-[#ff6b35]">AI agent</span> is designed to adapt, collaborate, and
            evolve—building a digital infrastructure as resilient and efficient as the prisoners' assembly lines. The
            Narkina5 network thrives on discipline, innovation, and the collective will to break boundaries.
          </p>

          <p>
            Join the <span className="font-mono font-semibold text-[#ff6b35]">Narkina5{">_"}</span> initiative and
            become part of a new era in decentralized AI.
          </p>
        </div>
      </main>
    </div>
  );
}

/**
 * Narkina5 provider component
 */
function Narkina5Provider({ agentId }: { agentId: UUID }) {
  return (
    <QueryClientProvider client={queryClient}>
      <Narkina5Homepage />
    </QueryClientProvider>
  );
}

// Initialize the application - no router needed for iframe
const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <QueryClientProvider client={queryClient}>
      <Narkina5Homepage />
    </QueryClientProvider>
  );
}

// Define types for integration with agent UI system
export interface AgentPanel {
  name: string;
  path: string;
  component: React.ComponentType<any>;
  icon?: string;
  public?: boolean;
  shortLabel?: string; // Optional short label for mobile
}

interface PanelProps {
  agentId: string;
}

/**
 * Example panel component for the plugin system
 */
const PanelComponent: React.FC<PanelProps> = ({ agentId }) => {
  return <div>Helllo {agentId}!</div>;
};

// Export the panel configuration for integration with the agent UI
export const panels: AgentPanel[] = [
  {
    name: 'Example',
    path: 'example',
    component: PanelComponent,
    icon: 'Book',
    public: false,
    shortLabel: 'Example',
  },
];

export * from './utils';

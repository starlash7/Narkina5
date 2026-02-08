import { Keypair, VersionedTransaction } from '@solana/web3.js';

// ── Types ──────────────────────────────────────────────
export interface AgentGraduationData {
    name: string;
    symbol: string;
    description: string;
    specialization: string;
    trustScore: number;
}

export interface GraduationResult {
    signature: string;
    mintAddress: string;
    pumpfunUrl: string;
}

// ── Token Metadata ─────────────────────────────────────
export function generateTokenDescription(agent: AgentGraduationData): string {
    return `${agent.description}\n\nTrained at Narkina5 Agent Factory | Trust Score: ${agent.trustScore}/100 | Specialization: ${agent.specialization}`;
}

// Generate SVG avatar based on agent specialization
function generateAgentAvatar(name: string, specialization: string): Blob {
    const colors: Record<string, string> = {
        Compute: '#ff6b35',
        Inference: '#8b5cf6',
        Security: '#ef4444',
        Network: '#3b82f6',
        Storage: '#22c55e',
    };
    const color = colors[specialization] || '#ff6b35';
    const initial = name.charAt(0).toUpperCase();

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#1a1a1a"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)" rx="48"/>
  <rect width="512" height="512" fill="url(#glow)" rx="48"/>
  <circle cx="256" cy="200" r="90" fill="${color}" opacity="0.12" stroke="${color}" stroke-opacity="0.3" stroke-width="2"/>
  <text x="256" y="228" text-anchor="middle" font-size="80" font-family="monospace" font-weight="bold" fill="${color}">${initial}</text>
  <text x="256" y="340" text-anchor="middle" font-size="20" font-family="monospace" font-weight="bold" fill="#e5e5e5" letter-spacing="4">NARKINA5</text>
  <text x="256" y="375" text-anchor="middle" font-size="16" font-family="monospace" fill="${color}" opacity="0.8">${specialization.toUpperCase()}</text>
  <rect x="106" y="420" width="300" height="3" rx="1.5" fill="#222"/>
  <rect x="106" y="420" width="300" height="3" rx="1.5" fill="${color}" opacity="0.5"/>
  <text x="256" y="465" text-anchor="middle" font-size="12" font-family="monospace" fill="#6b7280">GRADUATED AGENT</text>
</svg>`;

    return new Blob([svg], { type: 'image/svg+xml' });
}

// Convert Blob to base64 for proxy
async function blobToBase64(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

// ── IPFS Upload (via proxy) ────────────────────────────
export async function uploadMetadata(
    name: string,
    symbol: string,
    description: string,
    specialization: string,
): Promise<string> {
    const imageBlob = generateAgentAvatar(name, specialization);
    const imageBase64 = await blobToBase64(imageBlob);

    const response = await fetch('/api/pumpfun?action=ipfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            file: imageBase64,
            fileName: `${symbol.toLowerCase()}.svg`,
            name,
            symbol,
            description,
            twitter: 'https://x.com/narkina5',
            website: 'https://narkina5.factory',
            showName: true,
        }),
    });

    if (!response.ok) {
        throw new Error(`Metadata upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.metadataUri;
}

// ── Mint Keypair ───────────────────────────────────────
export function generateMintKeypair(): Keypair {
    return Keypair.generate();
}

// ── Build Create Token Tx (via proxy) ──────────────────
export async function buildCreateTokenTx(
    creatorPublicKey: string,
    mintPublicKey: string,
    metadataUri: string,
    tokenName: string,
    tokenSymbol: string,
    initialBuySol: number = 0,
): Promise<Uint8Array> {
    const response = await fetch('/api/pumpfun?action=trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            publicKey: creatorPublicKey,
            action: 'create',
            tokenMetadata: {
                name: tokenName,
                symbol: tokenSymbol,
                uri: metadataUri,
            },
            mint: mintPublicKey,
            denominatedInSol: 'true',
            amount: initialBuySol,
            slippage: 10,
            priorityFee: 0.0005,
            pool: 'pump',
        }),
    });

    if (!response.ok) {
        throw new Error(`PumpPortal API error: ${response.statusText}`);
    }

    return new Uint8Array(await response.arrayBuffer());
}

// ── Sign with Mint Keypair ─────────────────────────────
export function signWithMintKeypair(
    txBytes: Uint8Array,
    mintKeypair: Keypair,
): Uint8Array {
    const tx = VersionedTransaction.deserialize(txBytes);
    tx.sign([mintKeypair]);
    return Buffer.from(tx.serialize());
}

// ── URL Helpers ────────────────────────────────────────
export function getPumpfunUrl(mintAddress: string): string {
    return `https://pump.fun/coin/${mintAddress}`;
}

export function getSolscanTokenUrl(mintAddress: string): string {
    return `https://solscan.io/token/${mintAddress}`;
}

// ── Local Storage for Graduated Agents ─────────────────
const STORAGE_KEY = 'narkina5_graduated';

export interface GraduatedAgent {
    name: string;
    symbol: string;
    specialization: string;
    mintAddress: string;
    pumpfunUrl: string;
    graduatedAt: number;
    trustScore: number;
}

export function getGraduatedAgents(): GraduatedAgent[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function saveGraduatedAgent(agent: GraduatedAgent): void {
    const agents = getGraduatedAgents();
    agents.unshift(agent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
}

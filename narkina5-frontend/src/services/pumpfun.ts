import { Keypair, VersionedTransaction } from '@solana/web3.js';

const PROJECT_X_URL = import.meta.env.VITE_PROJECT_X_URL || 'https://x.com/Narkina5Agent';
const PROJECT_WEBSITE_URL = import.meta.env.VITE_PROJECT_WEBSITE_URL || 'https://narkina5.vercel.app';

// ── Types ──────────────────────────────────────────────
export type PumpfunAction = 'ipfs' | 'trade';
export type PumpfunErrorCode =
    | 'PFN_METHOD_NOT_ALLOWED'
    | 'PFN_VALIDATION_IPFS_REQUIRED_FIELDS'
    | 'PFN_PROVIDER_IPFS_FAILED'
    | 'PFN_PROVIDER_TRADE_FAILED'
    | 'PFN_BAD_ACTION'
    | 'PFN_NETWORK_ERROR'
    | 'PFN_INTERNAL'
    | 'PFN_RESPONSE_PARSE'
    | 'PFN_UNKNOWN';

interface PumpfunErrorPayload {
    error?: string;
    code?: string;
    retryable?: boolean;
    action?: PumpfunAction;
    providerStatus?: number;
    details?: string;
}

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

export class PumpfunError extends Error {
    code: PumpfunErrorCode;
    action: PumpfunAction;
    status: number;
    retryable: boolean;
    providerStatus?: number;
    details?: string;

    constructor(params: {
        message: string;
        code: PumpfunErrorCode;
        action: PumpfunAction;
        status: number;
        retryable: boolean;
        providerStatus?: number;
        details?: string;
    }) {
        super(params.message);
        this.name = 'PumpfunError';
        this.code = params.code;
        this.action = params.action;
        this.status = params.status;
        this.retryable = params.retryable;
        this.providerStatus = params.providerStatus;
        this.details = params.details;
    }
}

function mapCode(input?: string): PumpfunErrorCode {
    switch (input) {
        case 'PFN_METHOD_NOT_ALLOWED':
        case 'PFN_VALIDATION_IPFS_REQUIRED_FIELDS':
        case 'PFN_PROVIDER_IPFS_FAILED':
        case 'PFN_PROVIDER_TRADE_FAILED':
        case 'PFN_BAD_ACTION':
        case 'PFN_NETWORK_ERROR':
        case 'PFN_INTERNAL':
        case 'PFN_RESPONSE_PARSE':
            return input;
        default:
            return 'PFN_UNKNOWN';
    }
}

function defaultRetryable(status: number): boolean {
    return status === 408 || status === 429 || status >= 500;
}

async function buildPumpfunError(
    response: Response,
    action: PumpfunAction,
): Promise<PumpfunError> {
    let payload: PumpfunErrorPayload | null = null;

    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    const code = mapCode(payload?.code);
    const messageCore = payload?.error || response.statusText || 'Pumpfun request failed';
    const message = `[${code}] ${messageCore}`;

    return new PumpfunError({
        message,
        code,
        action,
        status: response.status,
        retryable: payload?.retryable ?? defaultRetryable(response.status),
        providerStatus: payload?.providerStatus,
        details: payload?.details,
    });
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
            twitter: PROJECT_X_URL,
            website: PROJECT_WEBSITE_URL,
            showName: true,
        }),
    });

    if (!response.ok) {
        throw await buildPumpfunError(response, 'ipfs');
    }

    let data: { metadataUri?: string };
    try {
        data = await response.json();
    } catch {
        throw new PumpfunError({
            message: '[PFN_RESPONSE_PARSE] Metadata upload response parse failed',
            code: 'PFN_RESPONSE_PARSE',
            action: 'ipfs',
            status: response.status,
            retryable: false,
        });
    }

    if (!data.metadataUri) {
        throw new PumpfunError({
            message: '[PFN_RESPONSE_PARSE] Missing metadataUri in IPFS response',
            code: 'PFN_RESPONSE_PARSE',
            action: 'ipfs',
            status: response.status,
            retryable: false,
        });
    }

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
        throw await buildPumpfunError(response, 'trade');
    }

    try {
        return new Uint8Array(await response.arrayBuffer());
    } catch {
        throw new PumpfunError({
            message: '[PFN_RESPONSE_PARSE] Trade tx bytes parse failed',
            code: 'PFN_RESPONSE_PARSE',
            action: 'trade',
            status: response.status,
            retryable: false,
        });
    }
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

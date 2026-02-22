// ============================================================================
// Narkina5 PnL Arena — Market Data Service
// Fetches real pump.fun / Solana token data via DexScreener proxy.
// ============================================================================

import type { PumpToken } from './pnl-types';

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const cache: Record<string, CacheEntry<unknown>> = {};

function getCached<T>(key: string, ttlMs: number): T | null {
    const entry = cache[key];
    if (entry && Date.now() - entry.timestamp < ttlMs) return entry.data as T;
    return null;
}

function setCache<T>(key: string, data: T): void {
    cache[key] = { data, timestamp: Date.now() };
}

const TRENDING_TTL = 5 * 60 * 1000;  // 5 minutes
const PRICE_TTL = 30 * 1000;          // 30 seconds

// ---------------------------------------------------------------------------
// Feed Health
// ---------------------------------------------------------------------------

export type MarketFeedStatus = 'WORKING' | 'FLAKY' | 'FAILING';
export type FeedReliabilityMode = 'balanced' | 'strict';

export interface MarketFeedHealth {
    status: MarketFeedStatus;
    consecutiveErrors: number;
    lastSuccessAt: number | null;
    lastErrorAt: number | null;
    lastErrorMessage: string | null;
}

const marketFeedHealth: MarketFeedHealth = {
    status: 'WORKING',
    consecutiveErrors: 0,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
};

function markFeedSuccess(): void {
    marketFeedHealth.consecutiveErrors = 0;
    marketFeedHealth.status = 'WORKING';
    marketFeedHealth.lastSuccessAt = Date.now();
    marketFeedHealth.lastErrorMessage = null;
}

function markFeedFailure(error: unknown): void {
    marketFeedHealth.consecutiveErrors += 1;
    marketFeedHealth.lastErrorAt = Date.now();
    marketFeedHealth.lastErrorMessage = error instanceof Error ? error.message : 'Unknown market feed error';
    marketFeedHealth.status = marketFeedHealth.consecutiveErrors >= 3 ? 'FAILING' : 'FLAKY';
}

export function getMarketFeedHealth(): MarketFeedHealth {
    return { ...marketFeedHealth };
}

export function isMarketFeedReliable(
    mode: FeedReliabilityMode,
    health: MarketFeedHealth = marketFeedHealth,
): boolean {
    if (mode === 'strict') return health.status === 'WORKING';
    return health.status !== 'FAILING';
}

// ---------------------------------------------------------------------------
// DexScreener response normalization
// ---------------------------------------------------------------------------

interface DexPair {
    baseToken?: { address?: string; name?: string; symbol?: string };
    priceNative?: string;
    priceUsd?: string;
    fdv?: number;
    volume?: { h24?: number };
    priceChange?: { h24?: number };
    info?: { imageUrl?: string };
    pairCreatedAt?: number;
    liquidity?: { usd?: number };
}

function pairToToken(pair: DexPair): PumpToken | null {
    const base = pair.baseToken;
    if (!base?.address || !base.symbol) return null;

    const priceSOL = parseFloat(pair.priceNative || '0');
    if (priceSOL <= 0) return null;

    return {
        mint: base.address,
        name: base.name || base.symbol,
        symbol: base.symbol,
        priceSOL,
        priceUSD: parseFloat(pair.priceUsd || '0'),
        marketCapSOL: (pair.fdv || 0) / Math.max(priceSOL, 0.0001),
        volume24h: pair.volume?.h24 || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
        holders: 0, // DexScreener doesn't provide this
        createdAt: pair.pairCreatedAt || 0,
        bondingCurveProgress: 0, // not available from DexScreener
        imageUri: pair.info?.imageUrl,
    };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch trending Solana tokens (top 20 boosted on DexScreener).
 */
export async function fetchTrendingTokens(): Promise<PumpToken[]> {
    const cached = getCached<PumpToken[]>('trending', TRENDING_TTL);
    if (cached) return cached;

    try {
        const res = await fetch('/api/market?action=trending');
        if (!res.ok) throw new Error(`Market trending failed: ${res.status}`);

        const boosts: Array<{ tokenAddress?: string; chainId?: string }> = await res.json();

        // Boosts are just addresses — we need to fetch full details
        const mints = boosts
            .map((b) => b.tokenAddress)
            .filter((m): m is string => !!m)
            .slice(0, 20);

        if (mints.length === 0) {
            markFeedSuccess();
            return [];
        }

        const tokens = await fetchTokensByMints(mints);
        setCache('trending', tokens);
        markFeedSuccess();
        return tokens;
    } catch (error) {
        markFeedFailure(error);
        throw error;
    }
}

/**
 * Fetch detailed info for multiple tokens by mint addresses.
 */
export async function fetchTokensByMints(mints: string[]): Promise<PumpToken[]> {
    if (mints.length === 0) return [];

    try {
        const res = await fetch(`/api/market?action=prices&mints=${mints.join(',')}`);
        if (!res.ok) throw new Error(`Market prices failed: ${res.status}`);

        const pairs: DexPair[] = await res.json();

        // Deduplicate by mint (DexScreener may return multiple pairs per token)
        const seen = new Set<string>();
        const tokens: PumpToken[] = [];
        for (const pair of pairs) {
            const token = pairToToken(pair);
            if (token && !seen.has(token.mint)) {
                seen.add(token.mint);
                tokens.push(token);
            }
        }

        // Cache individual token prices
        for (const t of tokens) {
            setCache(`price:${t.mint}`, t.priceSOL);
        }

        markFeedSuccess();
        return tokens;
    } catch (error) {
        markFeedFailure(error);
        throw error;
    }
}

/**
 * Fetch current price for a single token. Returns cached value if fresh.
 */
export async function fetchTokenPrice(mint: string): Promise<number> {
    const cached = getCached<number>(`price:${mint}`, PRICE_TTL);
    if (cached !== null) return cached;

    try {
        const res = await fetch(`/api/market?action=token&mint=${mint}`);
        if (!res.ok) throw new Error(`Market token failed: ${res.status}`);

        const pairs: DexPair[] = await res.json();
        const pair = pairs[0];
        if (!pair) {
            markFeedSuccess();
            return 0;
        }

        const price = parseFloat(pair.priceNative || '0');
        setCache(`price:${mint}`, price);
        markFeedSuccess();
        return price;
    } catch (error) {
        markFeedFailure(error);
        throw error;
    }
}

/**
 * Refresh prices for all tokens in a list. Returns updated token array.
 */
export async function refreshPrices(tokens: PumpToken[]): Promise<PumpToken[]> {
    const mints = tokens.map((t) => t.mint);
    const fresh = await fetchTokensByMints(mints);

    // Merge: keep old token data but update prices
    const priceMap = new Map(fresh.map((t) => [t.mint, t]));
    return tokens.map((t) => priceMap.get(t.mint) || t);
}

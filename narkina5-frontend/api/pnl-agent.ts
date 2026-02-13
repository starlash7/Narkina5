import type { VercelRequest, VercelResponse } from '@vercel/node';

const ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';
const MODEL = 'claude-haiku-4-5-20251001';

async function callClaude(system: string, user: string, maxTokens = 512): Promise<string> {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
    });
    if (!resp.ok) throw new Error(`Anthropic API error: ${resp.status}`);
    const data = await resp.json();
    return data.content?.[0]?.text || '';
}

// ---------------------------------------------------------------------------
// Role-specific system prompts
// ---------------------------------------------------------------------------

const ROLE_PROMPTS: Record<string, string> = {
    Researcher: `You are a token researcher at a Narkina5 Trading Desk in the PnL Arena on Solana. Analyze pump.fun tokens and identify the best opportunities. Consider: price momentum, volume, market cap, bonding curve progress, holder count. Be concise and data-driven. Respond with ONLY valid JSON.`,

    Analyst: `You are a market analyst at a Narkina5 Trading Desk in the PnL Arena on Solana. Provide sentiment scores for tokens. Consider: price trend, volume patterns, market context. Be concise. Respond with ONLY valid JSON.`,

    Strategist: `You are a portfolio strategist at a Narkina5 Trading Desk in the PnL Arena on Solana. Given research and analysis, determine optimal portfolio allocations. Max 20% per position. Be concise. Respond with ONLY valid JSON.`,

    Trader: `You are an execution trader at a Narkina5 Trading Desk in the PnL Arena on Solana. Execute the strategy by determining exact buy/sell orders. Consider current positions and cash balance. Be concise. Respond with ONLY valid JSON.`,

    RiskManager: `You are a risk manager at a Narkina5 Trading Desk in the PnL Arena on Solana. Review proposed trades and portfolio exposure. Veto any trade exceeding 20% of portfolio or creating excessive concentration. Set stop-losses. Be concise. Respond with ONLY valid JSON.`,
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

interface PnLAgentRequest {
    role: string;
    agentName: string;
    deskName: string;
    round: number;
    tokens: Array<{ mint: string; symbol: string; name: string; priceSOL: number; volume24h: number; priceChange24h: number; marketCapSOL: number }>;
    portfolio: { cashSOL: number; positions: Array<{ tokenMint: string; tokenSymbol: string; quantity: number; avgEntryPrice: number; currentPrice: number }> };
    context?: string; // previous phase outputs from other agents
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = req.body as PnLAgentRequest;
        const { role, agentName, round, tokens, portfolio, context } = body;

        if (!role || !agentName || !tokens) {
            return res.status(400).json({ error: 'Missing required fields: role, agentName, tokens' });
        }

        const systemPrompt = `You are ${agentName}. ${ROLE_PROMPTS[role] || ROLE_PROMPTS.Trader}`;

        let userPrompt = '';

        if (role === 'Researcher') {
            const tokenList = tokens.map(t =>
                `${t.symbol} (${t.mint.slice(0, 8)}...): price=${t.priceSOL.toFixed(6)} SOL, vol24h=$${t.volume24h.toFixed(0)}, change24h=${t.priceChange24h.toFixed(1)}%, mcap=${t.marketCapSOL.toFixed(1)} SOL`
            ).join('\n');

            userPrompt = `Round ${round}. Analyze these pump.fun tokens and pick the top 3 opportunities:\n\n${tokenList}\n\nRespond with JSON: [{"mint":"...","symbol":"...","thesis":"...","confidence":1-10,"targetPriceSOL":0.001}]`;

        } else if (role === 'Analyst') {
            const tokenList = tokens.slice(0, 10).map(t =>
                `${t.symbol}: price=${t.priceSOL.toFixed(6)}, change24h=${t.priceChange24h.toFixed(1)}%, vol=$${t.volume24h.toFixed(0)}`
            ).join('\n');

            userPrompt = `Round ${round}. Score sentiment for these tokens:\n\n${tokenList}\n\n${context ? `Research context: ${context}\n\n` : ''}Respond with JSON: [{"mint":"...","score":-1 to 1,"reasoning":"..."}]`;

        } else if (role === 'Strategist') {
            const posStr = portfolio.positions.length > 0
                ? portfolio.positions.map(p => `${p.tokenSymbol}: qty=${p.quantity.toFixed(2)}, avg=${p.avgEntryPrice.toFixed(6)}, curr=${p.currentPrice.toFixed(6)}`).join('\n')
                : 'No positions';

            userPrompt = `Round ${round}. Portfolio: ${portfolio.cashSOL.toFixed(2)} SOL cash.\nPositions:\n${posStr}\n\n${context ? `Research & analysis: ${context}\n\n` : ''}Determine target allocations (max 20% per position). Respond with JSON: {"allocations":{"mint":"percent_of_portfolio"},"reasoning":"..."}`;

        } else if (role === 'Trader') {
            const posStr = portfolio.positions.length > 0
                ? portfolio.positions.map(p => `${p.tokenSymbol} (${p.tokenMint.slice(0, 8)}...): qty=${p.quantity.toFixed(2)}`).join('\n')
                : 'No positions';

            userPrompt = `Round ${round}. Cash: ${portfolio.cashSOL.toFixed(2)} SOL.\nPositions:\n${posStr}\n\n${context ? `Strategy: ${context}\n\n` : ''}Execute trades. Respond with JSON: [{"side":"buy"|"sell","mint":"...","symbol":"...","amountSOL":5.0,"reasoning":"..."}]`;

        } else if (role === 'RiskManager') {
            userPrompt = `Round ${round}. Portfolio: ${portfolio.cashSOL.toFixed(2)} SOL cash, ${portfolio.positions.length} positions.\n\n${context ? `Proposed trades: ${context}\n\n` : ''}Review and approve/veto. Respond with JSON: {"approved":["trade descriptions"],"vetoed":[{"trade":"...","reason":"..."}],"stopLosses":[{"mint":"...","triggerPriceSOL":0.001}]}`;
        }

        const result = await callClaude(systemPrompt, userPrompt, 512);

        // Try to parse as JSON, return raw if not parseable
        try {
            const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleaned);
            return res.status(200).json({ role, agentName, output: parsed, raw: result });
        } catch {
            return res.status(200).json({ role, agentName, output: null, raw: result });
        }

    } catch (err) {
        console.error('PnL Agent API error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

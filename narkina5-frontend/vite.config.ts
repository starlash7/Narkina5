import { defineConfig, type Plugin, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

const env = loadEnv('development', process.cwd(), '');

async function callClaude(system: string, user: string, maxTokens = 512): Promise<string> {
  const apiKey = env.VITE_ANTHROPIC_API_KEY || '';
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!resp.ok) throw new Error(`Anthropic API: ${resp.status}`);
  const data = await resp.json() as { content?: Array<{ text?: string }> };
  return data.content?.[0]?.text || '';
}

function buildAgentPrompt(name: string, specialization: string): string {
  return `You are ${name}, an AI agent inside the Narkina5 Training Factory on Solana. Your specialization is ${specialization || 'Compute'}. You are performing training tasks to build your trust score and eventually graduate to launch your own token on Pump.fun.\n\nYou must respond as this agent character. Be concise, technical, and show your work. Output a brief task execution log (3-5 steps) followed by a result summary. Keep total response under 200 words.`;
}

// Local dev proxy for /api/agent → Anthropic API
function agentApiProxy(): Plugin {
  return {
    name: 'agent-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/agent', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = JSON.parse(body);

        try {
          // Batch mode
          if (parsed.batch) {
            const { task, agents } = parsed as {
              task: { title: string; description?: string };
              agents: Array<{ name: string; specialization: string }>;
            };
            const userPrompt = `Execute this training task:\nTask: ${task.title}\n${task.description ? `Details: ${task.description}` : ''}\n\nShow your execution steps and final result.`;

            const trainingResults = await Promise.all(
              agents.map(async (agent: { name: string; specialization: string }) => {
                const result = await callClaude(buildAgentPrompt(agent.name, agent.specialization), userPrompt);
                return { name: agent.name, result };
              }),
            );

            // Judge
            const agentSummaries = trainingResults.map(r => `Agent "${r.name}":\n${r.result}`).join('\n\n---\n\n');
            const judgePrompt = `The following ${agents.length} agents attempted this task: "${task.title}"\n\n${agentSummaries}\n\nRank these agents from best to worst based on: technical accuracy, thoroughness, creativity, and practical value. Score each agent from 1-100.\n\nYou MUST respond with ONLY valid JSON, no other text. Format:\n[{"name":"AgentName","score":85,"rank":1}]`;

            let rankings: Array<{ name: string; score: number; rank: number }>;
            try {
              const judgeResult = await callClaude('You are a strict training evaluator at Narkina5 Agent Factory.', judgePrompt, 256);
              const cleaned = judgeResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              rankings = JSON.parse(cleaned);
            } catch {
              rankings = agents.map((a: { name: string }, i: number) => ({
                name: a.name, score: 90 - i * 10 + Math.floor(Math.random() * 10), rank: i + 1,
              }));
              rankings.sort((a, b) => b.score - a.score);
              rankings.forEach((r, i) => { r.rank = i + 1; });
            }

            const results = trainingResults.map(tr => {
              const ranking = rankings.find(r => r.name === tr.name) || { score: 50, rank: agents.length };
              return { agentName: tr.name, result: tr.result, score: ranking.score, rank: ranking.rank };
            });

            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ results }));
            return;
          }

          // Single mode
          const { agentName, specialization, taskTitle, taskDescription } = parsed;
          const systemPrompt = buildAgentPrompt(agentName, specialization);
          const userPrompt = `Execute this training task:\nTask: ${taskTitle}\n${taskDescription ? `Details: ${taskDescription}` : ''}\n\nShow your execution steps and final result.`;
          const result = await callClaude(systemPrompt, userPrompt);

          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(JSON.stringify({ result, model: 'claude-haiku-4-5-20251001' }));
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// Local dev proxy for /api/pumpfun → pump.fun & pumpportal
function pumpfunApiProxy(): Plugin {
  return {
    name: 'pumpfun-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/pumpfun', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const action = url.searchParams.get('action');

        let body = '';
        for await (const chunk of req) body += chunk;

        try {
          if (action === 'trade') {
            const resp = await fetch('https://pumpportal.fun/api/trade-local', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body,
            });
            const data = Buffer.from(await resp.arrayBuffer());
            res.setHeader('Content-Type', 'application/octet-stream');
            res.statusCode = resp.status;
            res.end(data);
          } else if (action === 'ipfs') {
            const parsed = JSON.parse(body);
            const imageBuffer = Buffer.from(parsed.file, 'base64');

            // Build multipart form data manually
            const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
            const parts: Buffer[] = [];

            // File field
            parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${parsed.fileName || 'avatar.svg'}"\r\nContent-Type: image/svg+xml\r\n\r\n`));
            parts.push(imageBuffer);
            parts.push(Buffer.from('\r\n'));

            // Text fields
            for (const [key, val] of Object.entries(parsed)) {
              if (key === 'file' || key === 'fileName' || !val) continue;
              parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
            }
            parts.push(Buffer.from(`--${boundary}--\r\n`));

            const formBody = Buffer.concat(parts);
            const resp = await fetch('https://pump.fun/api/ipfs', {
              method: 'POST',
              headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
              body: formBody,
            });

            const data = await resp.json() as Record<string, unknown>;
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = resp.status;
            res.end(JSON.stringify(data));
          } else {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid action' }));
          }
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// Local dev proxy for /api/market → DexScreener
function marketApiProxy(): Plugin {
  return {
    name: 'market-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/market', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const action = url.searchParams.get('action');

        try {
          if (action === 'trending') {
            const resp = await fetch('https://api.dexscreener.com/token-boosts/top/v1', {
              headers: { Accept: 'application/json' },
            });
            const data = (await resp.json()) as Array<Record<string, unknown>>;
            const solTokens = data.filter((t) => t.chainId === 'solana').slice(0, 20);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(solTokens));
          } else if (action === 'token') {
            const mint = url.searchParams.get('mint');
            if (!mint) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Missing mint' })); return; }
            const resp = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mint}`, {
              headers: { Accept: 'application/json' },
            });
            const data = await resp.json();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(data));
          } else if (action === 'prices') {
            const mints = (url.searchParams.get('mints') || '').split(',').filter(Boolean);
            if (mints.length === 0) { res.statusCode = 400; res.end(JSON.stringify({ error: 'Missing mints' })); return; }
            const resp = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mints.join(',')}`, {
              headers: { Accept: 'application/json' },
            });
            const data = await resp.json();
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(data));
          } else {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid action' }));
          }
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// Local dev proxy for /api/pnl-agent → Anthropic API
function pnlAgentApiProxy(): Plugin {
  return {
    name: 'pnl-agent-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/pnl-agent', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        for await (const chunk of req) body += chunk;
        const parsed = JSON.parse(body);

        try {
          const { role, agentName, round, tokens, portfolio, context } = parsed;

          const ROLE_PROMPTS: Record<string, string> = {
            Researcher: 'You are a token researcher at a Narkina5 Trading Desk. Analyze pump.fun tokens. Respond with ONLY valid JSON.',
            Analyst: 'You are a market analyst at a Narkina5 Trading Desk. Score token sentiment. Respond with ONLY valid JSON.',
            Strategist: 'You are a portfolio strategist at a Narkina5 Trading Desk. Determine allocations. Respond with ONLY valid JSON.',
            Trader: 'You are an execution trader at a Narkina5 Trading Desk. Execute trades. Respond with ONLY valid JSON.',
            RiskManager: 'You are a risk manager at a Narkina5 Trading Desk. Review trades. Respond with ONLY valid JSON.',
          };

          const systemPrompt = `You are ${agentName}. ${ROLE_PROMPTS[role] || ROLE_PROMPTS.Trader}`;

          let userPrompt = '';
          if (role === 'Researcher') {
            const tokenList = tokens.map((t: { symbol: string; priceSOL: number; volume24h: number; priceChange24h: number }) =>
              `${t.symbol}: price=${t.priceSOL.toFixed(6)}, vol=$${t.volume24h.toFixed(0)}, change=${t.priceChange24h.toFixed(1)}%`
            ).join('\n');
            userPrompt = `Round ${round}. Top 3 picks from:\n${tokenList}\n\nJSON: [{"mint":"...","symbol":"...","thesis":"...","confidence":1-10,"targetPriceSOL":0.001}]`;
          } else if (role === 'Trader') {
            userPrompt = `Round ${round}. Cash: ${portfolio.cashSOL.toFixed(2)} SOL. ${context || ''}\nJSON: [{"side":"buy"|"sell","mint":"...","symbol":"...","amountSOL":5.0,"reasoning":"..."}]`;
          } else {
            userPrompt = `Round ${round}. Portfolio: ${portfolio.cashSOL.toFixed(2)} SOL. ${context || ''}\nRespond with appropriate JSON for your role.`;
          }

          const result = await callClaude(systemPrompt, userPrompt, 512);
          try {
            const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const output = JSON.parse(cleaned);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ role, agentName, output, raw: result }));
          } catch {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ role, agentName, output: null, raw: result }));
          }
        } catch {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({ include: ['buffer', 'crypto', 'stream', 'util'] }),
    agentApiProxy(),
    pumpfunApiProxy(),
    marketApiProxy(),
    pnlAgentApiProxy(),
  ],
  optimizeDeps: {
    include: ['@solana-program/memo', '@solana/web3.js', 'buffer'],
  },
})

import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

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
        const { agentName, specialization, taskTitle, taskDescription } = JSON.parse(body);

        const systemPrompt = `You are ${agentName}, an AI agent inside the Narkina5 Training Factory on Solana. Your specialization is ${specialization || 'Compute'}. You are performing training tasks to build your trust score and eventually graduate to launch your own token on Pump.fun.\n\nYou must respond as this agent character. Be concise, technical, and show your work. Output a brief task execution log (3-5 steps) followed by a result summary. Keep total response under 200 words.`;

        const userPrompt = `Execute this training task:\nTask: ${taskTitle}\n${taskDescription ? `Details: ${taskDescription}` : ''}\n\nShow your execution steps and final result.`;

        try {
          const apiKey = process.env.VITE_ANTHROPIC_API_KEY || '';
          const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 512,
              system: systemPrompt,
              messages: [{ role: 'user', content: userPrompt }],
            }),
          });

          const data: Record<string, unknown> = await resp.json();
          res.setHeader('Content-Type', 'application/json');

          if (!resp.ok) {
            res.statusCode = resp.status;
            res.end(JSON.stringify({ error: 'AI service error' }));
            return;
          }

          const content = data.content as Array<{ text?: string }> | undefined;
          res.statusCode = 200;
          res.end(JSON.stringify({
            result: content?.[0]?.text || 'Task completed.',
            model: data.model,
            usage: data.usage,
          }));
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
  ],
  optimizeDeps: {
    include: ['@solana-program/memo', '@solana/web3.js', 'buffer'],
  },
})

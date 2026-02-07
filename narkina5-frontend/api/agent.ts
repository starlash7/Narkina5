import type { VercelRequest, VercelResponse } from '@vercel/node';

const ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { agentName, specialization, taskTitle, taskDescription } = req.body;

    if (!agentName || !taskTitle) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const systemPrompt = `You are ${agentName}, an AI agent inside the Narkina5 Training Factory on Solana. Your specialization is ${specialization || 'Compute'}. You are performing training tasks to build your trust score and eventually graduate to launch your own token on Pump.fun.

You must respond as this agent character. Be concise, technical, and show your work. Output a brief task execution log (3-5 steps) followed by a result summary. Keep total response under 200 words.`;

    const userPrompt = `Execute this training task:
Task: ${taskTitle}
${taskDescription ? `Details: ${taskDescription}` : ''}

Show your execution steps and final result.`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 512,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Anthropic API error:', error);
            return res.status(response.status).json({ error: 'AI service error' });
        }

        const data = await response.json();
        const text = data.content?.[0]?.text || 'Task completed.';

        return res.status(200).json({
            result: text,
            model: data.model,
            usage: data.usage,
        });
    } catch (err) {
        console.error('Agent API error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

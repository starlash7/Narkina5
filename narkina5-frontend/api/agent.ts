import type { VercelRequest, VercelResponse } from '@vercel/node';

const ANTHROPIC_API_KEY = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';
const MODEL = 'claude-haiku-4-5-20251001';

interface AgentInfo { name: string; specialization: string }
interface TrainingResult { agentName: string; result: string; score: number; rank: number }

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

function buildAgentPrompt(agent: AgentInfo): string {
    return `You are ${agent.name}, an AI agent inside the Narkina5 Training Factory on Solana. Your specialization is ${agent.specialization || 'Compute'}. You are performing training tasks to build your trust score and eventually graduate to launch your own token on Pump.fun.\n\nYou must respond as this agent character. Be concise, technical, and show your work. Output a brief task execution log (3-5 steps) followed by a result summary. Keep total response under 200 words.`;
}

async function handleBatch(body: { task: { title: string; description?: string }; agents: AgentInfo[] }): Promise<TrainingResult[]> {
    const { task, agents } = body;
    const userPrompt = `Execute this training task:\nTask: ${task.title}\n${task.description ? `Details: ${task.description}` : ''}\n\nShow your execution steps and final result.`;

    // 1. Run all agents in parallel
    const trainingResults = await Promise.all(
        agents.map(async (agent) => {
            const result = await callClaude(buildAgentPrompt(agent), userPrompt);
            return { name: agent.name, result };
        }),
    );

    // 2. Judge call to score and rank
    const judgeSystem = `You are a strict training evaluator at Narkina5 Agent Factory. You evaluate AI agent task executions and rank them competitively. Be fair but decisive - there must be clear winners and losers.`;

    const agentSummaries = trainingResults.map((r, i) => `Agent "${r.name}":\n${r.result}`).join('\n\n---\n\n');
    const judgePrompt = `The following ${agents.length} agents attempted this task: "${task.title}"

${agentSummaries}

Rank these agents from best to worst based on: technical accuracy, thoroughness, creativity, and practical value. Score each agent from 1-100.

You MUST respond with ONLY valid JSON, no other text. Format:
[{"name":"AgentName","score":85,"rank":1}]`;

    let rankings: Array<{ name: string; score: number; rank: number }>;
    try {
        const judgeResult = await callClaude(judgeSystem, judgePrompt, 256);
        const cleaned = judgeResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        rankings = JSON.parse(cleaned);
    } catch {
        // Fallback: assign random-ish scores if judge fails
        rankings = agents.map((a, i) => ({
            name: a.name,
            score: 90 - i * 10 + Math.floor(Math.random() * 10),
            rank: i + 1,
        }));
        rankings.sort((a, b) => b.score - a.score);
        rankings.forEach((r, i) => { r.rank = i + 1; });
    }

    // Merge training results with rankings
    return trainingResults.map((tr) => {
        const ranking = rankings.find(r => r.name === tr.name) || { score: 50, rank: agents.length };
        return {
            agentName: tr.name,
            result: tr.result,
            score: ranking.score,
            rank: ranking.rank,
        };
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Batch mode
        if (req.body.batch) {
            if (!req.body.task?.title || !Array.isArray(req.body.agents) || req.body.agents.length === 0) {
                return res.status(400).json({ error: 'Batch requires task.title and agents array' });
            }
            const results = await handleBatch(req.body);
            return res.status(200).json({ results });
        }

        // Single mode (backward compatible)
        const { agentName, specialization, taskTitle, taskDescription } = req.body;
        if (!agentName || !taskTitle) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const systemPrompt = buildAgentPrompt({ name: agentName, specialization });
        const userPrompt = `Execute this training task:\nTask: ${taskTitle}\n${taskDescription ? `Details: ${taskDescription}` : ''}\n\nShow your execution steps and final result.`;
        const result = await callClaude(systemPrompt, userPrompt);

        return res.status(200).json({ result, model: MODEL });
    } catch (err) {
        console.error('Agent API error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

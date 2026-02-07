export interface TrainingRequest {
    agentName: string;
    specialization: string;
    taskTitle: string;
    taskDescription?: string;
}

export interface TrainingResult {
    result: string;
    model: string;
    usage?: { input_tokens: number; output_tokens: number };
}

/**
 * Execute a training task via the AI agent.
 * In production, calls /api/agent (Vercel serverless).
 * In dev, calls the Anthropic API directly via a local proxy.
 */
export async function executeTrainingTask(req: TrainingRequest): Promise<TrainingResult> {
    const apiUrl = import.meta.env.DEV ? '/api/agent' : '/api/agent';

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `API error: ${response.status}`);
    }

    return response.json();
}

/**
 * Parse agent execution log into step-by-step lines for display.
 */
export function parseExecutionSteps(result: string): string[] {
    return result
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

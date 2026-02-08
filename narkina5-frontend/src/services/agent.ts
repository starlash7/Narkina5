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

export interface BatchTrainingRequest {
    task: { title: string; description?: string };
    agents: Array<{ name: string; specialization: string }>;
}

export interface BatchAgentResult {
    agentName: string;
    result: string;
    score: number;
    rank: number;
}

export interface BatchTrainingResult {
    results: BatchAgentResult[];
}

/**
 * Execute a single training task via the AI agent (backward compatible).
 */
export async function executeTrainingTask(req: TrainingRequest): Promise<TrainingResult> {
    const response = await fetch('/api/agent', {
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
 * Execute batch training for multiple agents competing on the same task.
 * Returns ranked results with scores.
 */
export async function executeBatchTraining(req: BatchTrainingRequest): Promise<BatchTrainingResult> {
    const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: true, ...req }),
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

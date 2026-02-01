import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// ── Constants ──────────────────────────────────────────
export const PROGRAM_ID = new PublicKey('EopUaCV2svxj9j4hd7KjbrWfdjkspmm2BCBe7jGpKzKZ');

const SEEDS = {
    PROTOCOL: Buffer.from('protocol'),
    TASK: Buffer.from('task'),
    CLAIM: Buffer.from('claim'),
    AGENT: Buffer.from('agent'),
    ESCROW: Buffer.from('escrow'),
} as const;

const DISCRIMINATOR_SIZE = 8;

// Account size: 8 + 32 + 32 + 8 + 64 + 32 + 8 + 1 + 1 + 1 + 1 + 8 + 8 + 8 + 32 + 64 + 1 + 1 + 1 + 32 = 333
const TASK_ACCOUNT_SIZE = 333;

// ── Task State ─────────────────────────────────────────
export const TaskState = {
    Open: 0,
    InProgress: 1,
    PendingValidation: 2,
    Completed: 3,
    Cancelled: 4,
    Disputed: 5,
} as const;

export type TaskState = (typeof TaskState)[keyof typeof TaskState];

export const TaskStateLabels: Record<TaskState, string> = {
    [TaskState.Open]: 'open',
    [TaskState.InProgress]: 'in_progress',
    [TaskState.PendingValidation]: 'pending_validation',
    [TaskState.Completed]: 'completed',
    [TaskState.Cancelled]: 'cancelled',
    [TaskState.Disputed]: 'disputed',
};

// ── Task Type ──────────────────────────────────────────
export const TaskType = {
    Exclusive: 0,
    Collaborative: 1,
    Competitive: 2,
} as const;

// ── Capability Bitmasks ────────────────────────────────
const CAPABILITY_LABELS: Record<number, string> = {
    1: 'Compute',
    2: 'Storage',
    4: 'Inference',
    8: 'Network',
    16: 'Coordinator',
};

function primaryCapability(bitmask: bigint): string {
    for (const [bit, label] of Object.entries(CAPABILITY_LABELS)) {
        if (bitmask & BigInt(bit)) return label;
    }
    return 'Compute';
}

// ── Interfaces ─────────────────────────────────────────
export interface TaskAccount {
    taskId: Uint8Array;
    creator: PublicKey;
    requiredCapabilities: bigint;
    description: string;
    constraintHash: Uint8Array;
    rewardAmount: bigint;
    maxWorkers: number;
    currentWorkers: number;
    status: TaskState;
    taskType: number;
    createdAt: number;
    deadline: number;
    completedAt: number;
    escrow: PublicKey;
    result: Uint8Array;
    completions: number;
    requiredCompletions: number;
    bump: number;
    pda: PublicKey;
}

export interface TaskDisplay {
    id: string;
    title: string;
    description: string;
    reward: number;
    creator: string;
    status: string;
    createdAt: string;
    category: string;
    pda: string;
    onChain: boolean;
}

// ── PDA Derivation ─────────────────────────────────────
export function deriveTaskPda(creator: PublicKey, taskId: Uint8Array): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [SEEDS.TASK, creator.toBuffer(), Buffer.from(taskId)],
        PROGRAM_ID
    );
    return pda;
}

export function deriveAgentPda(agentId: Uint8Array): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [SEEDS.AGENT, Buffer.from(agentId)],
        PROGRAM_ID
    );
    return pda;
}

export function deriveClaimPda(taskPda: PublicKey, agent: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [SEEDS.CLAIM, taskPda.toBuffer(), agent.toBuffer()],
        PROGRAM_ID
    );
    return pda;
}

export function deriveEscrowPda(taskPda: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [SEEDS.ESCROW, taskPda.toBuffer()],
        PROGRAM_ID
    );
    return pda;
}

export function deriveProtocolPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [SEEDS.PROTOCOL],
        PROGRAM_ID
    );
    return pda;
}

// ── Account Deserialization ────────────────────────────
// Matches Task struct from agenc-coordination state.rs (all fixed-size fields)
function parseTaskAccount(data: Buffer, pda: PublicKey): TaskAccount | null {
    try {
        if (data.length < TASK_ACCOUNT_SIZE) return null;

        let offset = DISCRIMINATOR_SIZE;

        // task_id: [u8; 32]
        const taskId = new Uint8Array(data.subarray(offset, offset + 32));
        offset += 32;

        // creator: Pubkey
        const creator = new PublicKey(data.subarray(offset, offset + 32));
        offset += 32;

        // required_capabilities: u64
        const requiredCapabilities = data.readBigUInt64LE(offset);
        offset += 8;

        // description: [u8; 64]
        const descBytes = data.subarray(offset, offset + 64);
        const nullIdx = descBytes.indexOf(0);
        const description = descBytes.subarray(0, nullIdx === -1 ? 64 : nullIdx).toString('utf-8');
        offset += 64;

        // constraint_hash: [u8; 32]
        const constraintHash = new Uint8Array(data.subarray(offset, offset + 32));
        offset += 32;

        // reward_amount: u64
        const rewardAmount = data.readBigUInt64LE(offset);
        offset += 8;

        // max_workers: u8
        const maxWorkers = data.readUInt8(offset);
        offset += 1;

        // current_workers: u8
        const currentWorkers = data.readUInt8(offset);
        offset += 1;

        // status: u8 (TaskStatus enum)
        const status = data.readUInt8(offset) as TaskState;
        offset += 1;

        // task_type: u8 (TaskType enum)
        const taskType = data.readUInt8(offset);
        offset += 1;

        // created_at: i64
        const createdAt = Number(data.readBigInt64LE(offset));
        offset += 8;

        // deadline: i64
        const deadline = Number(data.readBigInt64LE(offset));
        offset += 8;

        // completed_at: i64
        const completedAt = Number(data.readBigInt64LE(offset));
        offset += 8;

        // escrow: Pubkey
        const escrow = new PublicKey(data.subarray(offset, offset + 32));
        offset += 32;

        // result: [u8; 64]
        const result = new Uint8Array(data.subarray(offset, offset + 64));
        offset += 64;

        // completions: u8
        const completions = data.readUInt8(offset);
        offset += 1;

        // required_completions: u8
        const requiredCompletions = data.readUInt8(offset);
        offset += 1;

        // bump: u8
        const bump = data.readUInt8(offset);

        return {
            taskId,
            creator,
            requiredCapabilities,
            description,
            constraintHash,
            rewardAmount,
            maxWorkers,
            currentWorkers,
            status,
            taskType,
            createdAt,
            deadline,
            completedAt,
            escrow,
            result,
            completions,
            requiredCompletions,
            bump,
            pda,
        };
    } catch (e) {
        console.error('Failed to parse task account:', e);
        return null;
    }
}

// ── Fetch Tasks ────────────────────────────────────────
export async function fetchTasks(connection: Connection): Promise<TaskAccount[]> {
    // Use getProgramAccounts with dataSize filter since task PDAs include
    // creator key and random task_id (can't iterate sequentially)
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [{ dataSize: TASK_ACCOUNT_SIZE }],
    });

    const tasks: TaskAccount[] = [];
    for (const { pubkey, account } of accounts) {
        const task = parseTaskAccount(Buffer.from(account.data), pubkey);
        if (task) tasks.push(task);
    }

    // Sort by created_at descending (newest first)
    tasks.sort((a, b) => b.createdAt - a.createdAt);
    return tasks;
}

export async function fetchTasksByCreator(
    connection: Connection,
    creator: PublicKey,
): Promise<TaskAccount[]> {
    // Filter by creator at offset 40 (8 disc + 32 taskId = 40)
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
            { dataSize: TASK_ACCOUNT_SIZE },
            { memcmp: { offset: 40, bytes: creator.toBase58() } },
        ],
    });

    const tasks: TaskAccount[] = [];
    for (const { pubkey, account } of accounts) {
        const task = parseTaskAccount(Buffer.from(account.data), pubkey);
        if (task) tasks.push(task);
    }

    tasks.sort((a, b) => b.createdAt - a.createdAt);
    return tasks;
}

// ── Convert to Display Format ──────────────────────────
function taskIdHex(taskId: Uint8Array): string {
    return Array.from(taskId.slice(0, 8))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function relativeTime(timestamp: number): string {
    const age = Date.now() / 1000 - timestamp;
    if (age < 60) return 'just now';
    if (age < 3600) return `${Math.floor(age / 60)}m ago`;
    if (age < 86400) return `${Math.floor(age / 3600)}h ago`;
    return `${Math.floor(age / 86400)}d ago`;
}

export function taskToDisplay(task: TaskAccount): TaskDisplay {
    return {
        id: taskIdHex(task.taskId),
        title: task.description || `Task ${taskIdHex(task.taskId)}`,
        description: task.description,
        reward: Number(task.rewardAmount) / LAMPORTS_PER_SOL,
        creator: `${task.creator.toBase58().slice(0, 4)}...${task.creator.toBase58().slice(-4)}`,
        status: TaskStateLabels[task.status],
        createdAt: relativeTime(task.createdAt),
        category: primaryCapability(task.requiredCapabilities),
        pda: task.pda.toBase58(),
        onChain: true,
    };
}

// ── Fee Calculation ────────────────────────────────────
export const PROTOCOL_FEE_PERCENT = 1;

export function calculateEscrowWithFee(solAmount: number): number {
    const lamports = solAmount * LAMPORTS_PER_SOL;
    const fee = Math.floor((lamports * PROTOCOL_FEE_PERCENT) / 100);
    return lamports + fee;
}

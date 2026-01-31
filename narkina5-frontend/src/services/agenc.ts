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

const U64_SIZE = 8;
const DISCRIMINATOR_SIZE = 8;

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

// ── Interfaces ─────────────────────────────────────────
export interface TaskAccount {
    taskId: number;
    state: TaskState;
    creator: PublicKey;
    escrowLamports: number;
    deadline: number;
    description: string;
    claimedBy: PublicKey | null;
    completedAt: number | null;
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
export function deriveTaskPda(taskId: number): PublicKey {
    const taskIdBuffer = Buffer.alloc(U64_SIZE);
    taskIdBuffer.writeBigUInt64LE(BigInt(taskId));

    const [pda] = PublicKey.findProgramAddressSync(
        [SEEDS.TASK, taskIdBuffer],
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
// Anchor account discriminator for "Task" (first 8 bytes of sha256("account:Task"))
function parseTaskAccount(data: Buffer, pda: PublicKey): TaskAccount | null {
    try {
        // Skip 8-byte discriminator
        let offset = DISCRIMINATOR_SIZE;

        // task_id: u64
        const taskId = Number(data.readBigUInt64LE(offset));
        offset += 8;

        // state: u8 (enum)
        const state = data.readUInt8(offset) as TaskState;
        offset += 1;

        // creator: Pubkey (32 bytes)
        const creator = new PublicKey(data.subarray(offset, offset + 32));
        offset += 32;

        // escrow_lamports: u64
        const escrowLamports = Number(data.readBigUInt64LE(offset));
        offset += 8;

        // deadline: i64
        const deadline = Number(data.readBigInt64LE(offset));
        offset += 8;

        // description: String (4 bytes length prefix + data)
        const descLen = data.readUInt32LE(offset);
        offset += 4;
        const description = data.subarray(offset, offset + descLen).toString('utf-8');
        offset += descLen;

        // constraint_hash: Option<[u8; 32]> - 1 byte tag + optional 32 bytes
        const hasConstraint = data.readUInt8(offset) === 1;
        offset += 1;
        if (hasConstraint) offset += 32;

        // claimed_by: Option<Pubkey> - 1 byte tag + optional 32 bytes
        const hasClaimed = data.readUInt8(offset) === 1;
        offset += 1;
        let claimedBy: PublicKey | null = null;
        if (hasClaimed) {
            claimedBy = new PublicKey(data.subarray(offset, offset + 32));
            offset += 32;
        }

        // completed_at: Option<i64> - 1 byte tag + optional 8 bytes
        const hasCompleted = data.readUInt8(offset) === 1;
        offset += 1;
        let completedAt: number | null = null;
        if (hasCompleted) {
            completedAt = Number(data.readBigInt64LE(offset));
        }

        return {
            taskId,
            state,
            creator,
            escrowLamports,
            deadline,
            description,
            claimedBy,
            completedAt,
            pda,
        };
    } catch (e) {
        console.error('Failed to parse task account:', e);
        return null;
    }
}

// ── Fetch Tasks ────────────────────────────────────────
export async function fetchTasks(
    connection: Connection,
    maxTaskId: number = 50
): Promise<TaskAccount[]> {
    const tasks: TaskAccount[] = [];

    // Batch fetch: derive PDAs for task IDs 0..maxTaskId and check which exist
    const pdas = Array.from({ length: maxTaskId }, (_, i) => deriveTaskPda(i));

    // Fetch all accounts in one batch
    const accounts = await connection.getMultipleAccountsInfo(pdas);

    for (let i = 0; i < accounts.length; i++) {
        const accountInfo = accounts[i];
        if (accountInfo && accountInfo.owner.equals(PROGRAM_ID)) {
            const task = parseTaskAccount(
                Buffer.from(accountInfo.data),
                pdas[i]
            );
            if (task) tasks.push(task);
        }
    }

    return tasks;
}

export async function fetchTaskById(
    connection: Connection,
    taskId: number
): Promise<TaskAccount | null> {
    const pda = deriveTaskPda(taskId);
    const accountInfo = await connection.getAccountInfo(pda);

    if (!accountInfo || !accountInfo.owner.equals(PROGRAM_ID)) {
        return null;
    }

    return parseTaskAccount(Buffer.from(accountInfo.data), pda);
}

export async function fetchTasksByCreator(
    connection: Connection,
    creator: PublicKey,
    maxTaskId: number = 50
): Promise<TaskAccount[]> {
    const allTasks = await fetchTasks(connection, maxTaskId);
    return allTasks.filter(t => t.creator.equals(creator));
}

// ── Convert to Display Format ──────────────────────────
const CATEGORIES = ['Compute', 'Inference', 'Security', 'Network', 'Storage'];

export function taskToDisplay(task: TaskAccount): TaskDisplay {
    const now = Date.now() / 1000;
    const age = now - (task.deadline - 7 * 24 * 3600); // approximate creation time
    let createdAt: string;

    if (age < 3600) createdAt = `${Math.floor(age / 60)}m ago`;
    else if (age < 86400) createdAt = `${Math.floor(age / 3600)}h ago`;
    else createdAt = `${Math.floor(age / 86400)}d ago`;

    return {
        id: `task_${task.taskId}`,
        title: task.description || `Task #${task.taskId}`,
        description: task.description,
        reward: task.escrowLamports / LAMPORTS_PER_SOL,
        creator: `${task.creator.toBase58().slice(0, 4)}...${task.creator.toBase58().slice(-4)}`,
        status: TaskStateLabels[task.state],
        createdAt,
        category: CATEGORIES[task.taskId % CATEGORIES.length],
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

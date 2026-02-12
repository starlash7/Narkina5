import {
    Connection,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
} from '@solana/web3.js';

// ── Program ───────────────────────────────────────────
export const PROGRAM_ID = new PublicKey('EopUaCV2svxj9j4hd7KjbrWfdjkspmm2BCBe7jGpKzKZ');

const SEEDS = {
    PROTOCOL: Buffer.from('protocol'),
    TASK: Buffer.from('task'),
    AGENT: Buffer.from('agent'),
    ESCROW: Buffer.from('escrow'),
} as const;

// ── Pre-computed Anchor Discriminators ────────────────
// sha256("global:<name>")[0..8]
const DISCRIMINATORS = {
    register_agent: new Uint8Array([135, 157, 66, 195, 2, 113, 175, 30]),
    create_task: new Uint8Array([194, 80, 6, 180, 232, 127, 48, 171]),
} as const;

// ── Borsh Writer ──────────────────────────────────────
class BorshWriter {
    private buf: number[] = [];

    writeU8(val: number) {
        this.buf.push(val & 0xff);
    }

    writeU32LE(val: number) {
        this.buf.push(val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >> 24) & 0xff);
    }

    writeU64LE(val: bigint) {
        for (let i = 0; i < 8; i++) {
            this.buf.push(Number((val >> BigInt(i * 8)) & 0xffn));
        }
    }

    writeI64LE(val: bigint) {
        // Two's complement for signed
        const unsigned = val < 0n ? (1n << 64n) + val : val;
        this.writeU64LE(unsigned);
    }

    writeBytes(bytes: Uint8Array) {
        for (let i = 0; i < bytes.length; i++) {
            this.buf.push(bytes[i]);
        }
    }

    writeFixedBytes(bytes: Uint8Array, len: number) {
        const padded = new Uint8Array(len);
        padded.set(bytes.slice(0, len));
        this.writeBytes(padded);
    }

    writeString(s: string) {
        const encoded = new TextEncoder().encode(s);
        this.writeU32LE(encoded.length);
        this.writeBytes(encoded);
    }

    writeOptionBytes32(val: Uint8Array | null) {
        if (val === null) {
            this.writeU8(0);
        } else {
            this.writeU8(1);
            this.writeFixedBytes(val, 32);
        }
    }

    writeOptionString(val: string | null) {
        if (val === null) {
            this.writeU8(0);
        } else {
            this.writeU8(1);
            this.writeString(val);
        }
    }

    toBytes(): Uint8Array {
        return new Uint8Array(this.buf);
    }
}

// ── PDA Derivation ────────────────────────────────────
export function deriveProtocolPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync([SEEDS.PROTOCOL], PROGRAM_ID);
    return pda;
}

export function deriveAgentPda(agentId: Uint8Array): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [SEEDS.AGENT, Buffer.from(agentId)],
        PROGRAM_ID
    );
    return pda;
}

export function deriveTaskPda(creator: PublicKey, taskId: Uint8Array): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
        [SEEDS.TASK, creator.toBuffer(), Buffer.from(taskId)],
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

// ── Helpers ───────────────────────────────────────────
export function generateTaskId(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
}

export function deriveAgentIdFromWallet(wallet: PublicKey): Uint8Array {
    // Use first 32 bytes of wallet pubkey as agent ID
    return new Uint8Array(wallet.toBytes());
}

export function stringToFixed64(text: string): Uint8Array {
    const buf = new Uint8Array(64);
    const encoded = new TextEncoder().encode(text.slice(0, 64));
    buf.set(encoded);
    return buf;
}

// Capability bitmasks
export const CAPABILITIES = {
    COMPUTE: 1n,
    STORAGE: 2n,
    INFERENCE: 4n,
    NETWORK: 8n,
    COORDINATOR: 16n,
} as const;

export function categoryToCapability(category: string): bigint {
    switch (category) {
        case 'Hyperspace': return CAPABILITIES.COMPUTE;
        case 'Kyber': return CAPABILITIES.STORAGE;
        case 'Holocron': return CAPABILITIES.INFERENCE;
        case 'Holonet': return CAPABILITIES.NETWORK;
        default: return CAPABILITIES.COMPUTE;
    }
}

// ── Account Checks ────────────────────────────────────
export async function checkProtocolInitialized(connection: Connection): Promise<boolean> {
    const pda = deriveProtocolPda();
    const info = await connection.getAccountInfo(pda);
    return !!info && info.owner.equals(PROGRAM_ID);
}

export async function checkAgentRegistered(
    connection: Connection,
    agentId: Uint8Array
): Promise<boolean> {
    const pda = deriveAgentPda(agentId);
    const info = await connection.getAccountInfo(pda);
    return !!info && info.owner.equals(PROGRAM_ID);
}

// ── Build Register Agent Transaction ──────────────────
export async function buildRegisterAgentTx(
    connection: Connection,
    authority: PublicKey,
    agentId: Uint8Array,
    capabilities: bigint,
    endpoint: string,
    metadataUri: string | null,
    stakeAmount: bigint,
): Promise<Uint8Array> {
    const agentPda = deriveAgentPda(agentId);
    const protocolPda = deriveProtocolPda();

    // Serialize instruction data
    const writer = new BorshWriter();
    writer.writeBytes(DISCRIMINATORS.register_agent);
    writer.writeFixedBytes(agentId, 32);       // agent_id: [u8; 32]
    writer.writeU64LE(capabilities);            // capabilities: u64
    writer.writeString(endpoint);               // endpoint: String
    writer.writeOptionString(metadataUri);      // metadata_uri: Option<String>
    writer.writeU64LE(stakeAmount);             // stake_amount: u64

    const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
            { pubkey: agentPda, isSigner: false, isWritable: true },
            { pubkey: protocolPda, isSigner: false, isWritable: true },
            { pubkey: authority, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(writer.toBytes()),
    });

    const tx = new Transaction().add(ix);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = authority;

    return tx.serialize({ requireAllSignatures: false });
}

// ── Build Create Task Transaction ─────────────────────
export async function buildCreateTaskTx(
    connection: Connection,
    creator: PublicKey,
    agentId: Uint8Array,
    taskId: Uint8Array,
    requiredCapabilities: bigint,
    description: Uint8Array, // 64 bytes
    rewardLamports: bigint,
    maxWorkers: number,
    deadline: bigint,
    taskType: number,
    constraintHash: Uint8Array | null,
): Promise<Uint8Array> {
    const creatorAgentPda = deriveAgentPda(agentId);
    const taskPda = deriveTaskPda(creator, taskId);
    const escrowPda = deriveEscrowPda(taskPda);
    const protocolPda = deriveProtocolPda();

    // Serialize instruction data
    const writer = new BorshWriter();
    writer.writeBytes(DISCRIMINATORS.create_task);
    writer.writeFixedBytes(taskId, 32);         // task_id: [u8; 32]
    writer.writeU64LE(requiredCapabilities);     // required_capabilities: u64
    writer.writeFixedBytes(description, 64);     // description: [u8; 64]
    writer.writeU64LE(rewardLamports);           // reward_amount: u64
    writer.writeU8(maxWorkers);                  // max_workers: u8
    writer.writeI64LE(deadline);                 // deadline: i64
    writer.writeU8(taskType);                    // task_type: u8
    writer.writeOptionBytes32(constraintHash);   // constraint_hash: Option<[u8; 32]>

    // Account ordering must match CreateTask struct in create_task.rs
    const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
            { pubkey: taskPda, isSigner: false, isWritable: true },
            { pubkey: escrowPda, isSigner: false, isWritable: true },
            { pubkey: protocolPda, isSigner: false, isWritable: true },
            { pubkey: creatorAgentPda, isSigner: false, isWritable: true },
            { pubkey: creator, isSigner: true, isWritable: false },  // authority
            { pubkey: creator, isSigner: true, isWritable: true },   // creator (same wallet)
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: Buffer.from(writer.toBytes()),
    });

    const tx = new Transaction().add(ix);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.feePayer = creator;

    return tx.serialize({ requireAllSignatures: false });
}

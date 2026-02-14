// ============================================================================
// Narkina5 Prison Arena — Competition Engine
// 64 agents. 5 floors. 1 graduate.
// Pure business logic / data layer. No React.
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Specialization =
  | 'Hyperspace'
  | 'Holocron'
  | 'Garrison'
  | 'Holonet'
  | 'Kyber';

export interface CompetitionTask {
  id: string;
  title: string;
  description: string;
  category: Specialization;
  difficulty: number; // 1-5
}

export interface PrisonAgent {
  id: string;
  name: string;
  symbol: string;
  specialization: Specialization;
  color: string;
  floor: number; // current floor (0 = eliminated)
  room: number;
  status: 'competing' | 'advancing' | 'eliminated' | 'graduated';
  roundScores: number[];
  totalScore: number;
  rank: number;
  lastAiOutput?: string;
  isSpotlight: boolean;
  seed: number;
  strengths: Specialization[];
}

export interface Room {
  id: string;
  floorNumber: number;
  roomIndex: number;
  agents: string[]; // agent IDs
  status: 'pending' | 'competing' | 'complete';
}

export interface Floor {
  number: number;
  label: string;
  rooms: Room[];
  totalAgents: number;
  advancingPerRoom: number;
  roundsPerFloor: number;
  status: 'locked' | 'active' | 'complete';
}

export interface CompetitionLogEntry {
  timestamp: number;
  floor: number;
  type:
    | 'system'
    | 'round_start'
    | 'round_end'
    | 'elimination'
    | 'advancement'
    | 'spotlight'
    | 'graduation';
  message: string;
}

export interface CompetitionState {
  status: 'idle' | 'generating' | 'running' | 'complete';
  currentFloor: number;
  currentRound: number;
  floors: Floor[];
  agents: Record<string, PrisonAgent>; // indexed by ID for fast lookup
  winner: string | null; // winner agent ID
  log: CompetitionLogEntry[];
  apiCallsMade: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SPEC_COLORS: Record<Specialization, string> = {
  Hyperspace: '#ff6b35',
  Holocron: '#8b5cf6',
  Garrison: '#ef4444',
  Holonet: '#3b82f6',
  Kyber: '#22c55e',
};

export const FLOOR_CONFIG = [
  {
    number: 1,
    label: 'GENERAL POPULATION',
    agents: 64,
    rooms: 8,
    perRoom: 8,
    advance: 4,
    rounds: 1,
  },
  {
    number: 2,
    label: 'HARD LABOR',
    agents: 32,
    rooms: 8,
    perRoom: 4,
    advance: 2,
    rounds: 1,
  },
  {
    number: 3,
    label: 'PROVING GROUNDS',
    agents: 16,
    rooms: 4,
    perRoom: 4,
    advance: 2,
    rounds: 2,
  },
  {
    number: 4,
    label: 'THE GAUNTLET',
    agents: 8,
    rooms: 2,
    perRoom: 4,
    advance: 2,
    rounds: 2,
  },
  {
    number: 5,
    label: 'FINAL TRIAL',
    agents: 4,
    rooms: 1,
    perRoom: 4,
    advance: 1,
    rounds: 3,
  },
] as const;

export const FLOOR_COLORS: Record<number, string> = {
  1: '#6b7280',
  2: '#3b82f6',
  3: '#eab308',
  4: '#f97316',
  5: '#ef4444',
};

// ---------------------------------------------------------------------------
// Name generation data
// ---------------------------------------------------------------------------

const PREFIXES: string[] = [
  'Tarkin', 'Thrawn', 'Grievous', 'Dooku', 'Maul', 'Ventress', 'Boba', 'Bossk',
  'Dengar', 'Cad', 'Hondo', 'Savage', 'Krennic', 'Moff', 'Pryce', 'Kallus',
  'Hux', 'Phasma', 'Snoke', 'Djarin', 'Greef', 'Mayfeld', 'Migs', 'Saxon',
  'Luthen', 'Dedra', 'Syril', 'Bix', 'Brasso', 'Nemik', 'Vel', 'Cinta',
];

const SUFFIXES: string[] = [
  'Droid', 'Unit', 'Cell', 'Ops', 'Prime', 'Forge', 'Net', 'Axis',
];

const ALL_SPECIALIZATIONS: Specialization[] = [
  'Hyperspace',
  'Holocron',
  'Garrison',
  'Holonet',
  'Kyber',
];

// ---------------------------------------------------------------------------
// Competition tasks (15 total, blockchain / crypto themed, difficulty 1-5)
// ---------------------------------------------------------------------------

const COMPETITION_TASKS: CompetitionTask[] = [
  // Difficulty 1
  {
    id: 'task-01',
    title: 'Hash Rate Baseline',
    description: 'Compute SHA-256 hashes for a synthetic block header dataset and report throughput.',
    category: 'Hyperspace',
    difficulty: 1,
  },
  {
    id: 'task-02',
    title: 'Token Metadata Parser',
    description: 'Parse and validate on-chain token metadata from a raw transaction feed.',
    category: 'Holocron',
    difficulty: 1,
  },
  {
    id: 'task-03',
    title: 'Peer Discovery Ping',
    description: 'Enumerate reachable nodes in a simulated P2P gossip network within a time limit.',
    category: 'Holonet',
    difficulty: 1,
  },
  // Difficulty 2
  {
    id: 'task-04',
    title: 'Signature Verification Audit',
    description: 'Detect invalid Ed25519 signatures across a batch of 10,000 mock transactions.',
    category: 'Garrison',
    difficulty: 2,
  },
  {
    id: 'task-05',
    title: 'State Trie Compaction',
    description: 'Compact a Merkle-Patricia trie snapshot to minimize on-disk storage footprint.',
    category: 'Kyber',
    difficulty: 2,
  },
  {
    id: 'task-06',
    title: 'Gas Estimation Model',
    description: 'Build a predictive model that estimates gas costs for arbitrary smart-contract calls.',
    category: 'Holocron',
    difficulty: 2,
  },
  // Difficulty 3
  {
    id: 'task-07',
    title: 'MEV Opportunity Scanner',
    description: 'Identify profitable MEV bundles in a stream of simulated mempool transactions.',
    category: 'Hyperspace',
    difficulty: 3,
  },
  {
    id: 'task-08',
    title: 'Cross-Chain Bridge Monitor',
    description: 'Track asset flows across three simulated bridge contracts and flag discrepancies.',
    category: 'Holonet',
    difficulty: 3,
  },
  {
    id: 'task-09',
    title: 'Rug-Pull Pattern Detector',
    description: 'Analyze liquidity pool histories and classify tokens as safe or probable rug-pulls.',
    category: 'Garrison',
    difficulty: 3,
  },
  // Difficulty 4
  {
    id: 'task-10',
    title: 'ZK Proof Generation',
    description: 'Generate a zero-knowledge proof for a confidential token transfer circuit.',
    category: 'Hyperspace',
    difficulty: 4,
  },
  {
    id: 'task-11',
    title: 'Consensus Fork Resolution',
    description: 'Resolve a simulated chain fork by replaying conflicting block proposals under BFT rules.',
    category: 'Holonet',
    difficulty: 4,
  },
  {
    id: 'task-12',
    title: 'Archival Node Reindex',
    description: 'Reindex 1M blocks of historical state data with full receipts and event logs.',
    category: 'Kyber',
    difficulty: 4,
  },
  // Difficulty 5
  {
    id: 'task-13',
    title: 'Flash Loan Exploit Synthesis',
    description: 'Craft a multi-step flash loan attack vector against a vulnerable DeFi protocol simulation.',
    category: 'Garrison',
    difficulty: 5,
  },
  {
    id: 'task-14',
    title: 'On-Chain Governance Optimizer',
    description: 'Design an optimal voting strategy across a DAO with quadratic voting and delegation.',
    category: 'Holocron',
    difficulty: 5,
  },
  {
    id: 'task-15',
    title: 'Full-Chain State Proof',
    description: 'Produce a cryptographic proof of the entire chain state root against an independent validator set.',
    category: 'Kyber',
    difficulty: 5,
  },
];

// ---------------------------------------------------------------------------
// Deterministic pseudo-random number generator
// ---------------------------------------------------------------------------

/**
 * Simple deterministic pseudo-random number in [0, 1) derived from a seed.
 * Uses a basic hash-style mixing function so the same seed always yields the
 * same output — critical for reproducible tournament brackets.
 */
export function seededRandom(seed: number): number {
  let s = seed;
  s = ((s >>> 0) * 2654435761) >>> 0; // Knuth multiplicative hash
  s = ((s ^ (s >>> 13)) * 1597334677) >>> 0;
  s = (s ^ (s >>> 16)) >>> 0;
  return (s & 0x7fffffff) / 0x80000000;
}

// ---------------------------------------------------------------------------
// Agent generation
// ---------------------------------------------------------------------------

/**
 * Creates a single PrisonAgent from a deterministic index (0-63).
 */
export function generateAgent(index: number): PrisonAgent {
  const prefix = PREFIXES[index % 32];
  const suffix = SUFFIXES[Math.floor(index / 32) % 8];
  const paddedIndex = String(index).padStart(2, '0');
  const name = `${prefix}${suffix}-${paddedIndex}`;
  const symbol = `${prefix.slice(0, 3).toUpperCase()}${paddedIndex}`;
  const id = `agent-${paddedIndex}`;

  const specialization = ALL_SPECIALIZATIONS[index % 5];
  const seed = index * 7919 + 42; // deterministic per-agent seed

  // Secondary strength: pick a different specialization using the seed
  const secondaryIndex = (index + 1 + Math.floor(seededRandom(seed) * 4)) % 5;
  const secondary = ALL_SPECIALIZATIONS[secondaryIndex];
  const strengths: Specialization[] = [specialization];
  if (secondary !== specialization) {
    strengths.push(secondary);
  }

  return {
    id,
    name,
    symbol,
    specialization,
    color: SPEC_COLORS[specialization],
    floor: 1,
    room: 0,
    status: 'competing',
    roundScores: [],
    totalScore: 0,
    rank: 0,
    isSpotlight: false,
    seed,
    strengths,
  };
}

/**
 * Generates all 64 agents and returns them indexed by ID for O(1) lookup.
 */
export function generateAllAgents(): Record<string, PrisonAgent> {
  const agents: Record<string, PrisonAgent> = {};
  for (let i = 0; i < 64; i++) {
    const agent = generateAgent(i);
    agents[agent.id] = agent;
  }
  return agents;
}

// ---------------------------------------------------------------------------
// Floor & room construction
// ---------------------------------------------------------------------------

/**
 * Creates the full 5-floor bracket structure.
 * Floor 1 is populated with the provided agent IDs (must be 64).
 * Floors 2-5 are created as 'locked' with empty rooms.
 */
export function buildFloors(agentIds: string[]): Floor[] {
  return FLOOR_CONFIG.map((cfg) => {
    const rooms: Room[] = [];
    for (let r = 0; r < cfg.rooms; r++) {
      const roomAgents: string[] = [];
      if (cfg.number === 1) {
        // Populate Floor 1 rooms
        const start = r * cfg.perRoom;
        const end = start + cfg.perRoom;
        for (let a = start; a < end && a < agentIds.length; a++) {
          roomAgents.push(agentIds[a]);
        }
      }
      rooms.push({
        id: `floor-${cfg.number}-room-${r}`,
        floorNumber: cfg.number,
        roomIndex: r,
        agents: roomAgents,
        status: cfg.number === 1 ? 'pending' : 'pending',
      });
    }

    return {
      number: cfg.number,
      label: cfg.label,
      rooms,
      totalAgents: cfg.agents,
      advancingPerRoom: cfg.advance,
      roundsPerFloor: cfg.rounds,
      status: cfg.number === 1 ? 'active' : 'locked',
    } as Floor;
  });
}

// ---------------------------------------------------------------------------
// Task selection
// ---------------------------------------------------------------------------

/**
 * Returns a task whose difficulty matches or is close to the given floor number.
 * Higher floors get harder tasks.
 */
export function getTaskForFloor(floorNumber: number): CompetitionTask {
  const difficulty = Math.min(floorNumber, 5);
  const candidates = COMPETITION_TASKS.filter((t) => t.difficulty === difficulty);
  if (candidates.length === 0) {
    // Fallback: pick the hardest available
    return COMPETITION_TASKS[COMPETITION_TASKS.length - 1];
  }
  // Deterministic pick based on floor number
  return candidates[floorNumber % candidates.length];
}

// ---------------------------------------------------------------------------
// Score simulation
// ---------------------------------------------------------------------------

/**
 * Simulates a competition score for one agent on one task.
 *
 * Scoring breakdown:
 *   - Base score: 40-70 (deterministic from agent seed + round seed)
 *   - Affinity bonus: +15 if agent's primary specialization matches the task
 *                     category, +8 if the task category is in the agent's
 *                     secondary strengths
 *   - Floor penalty: -(floorNumber - 1) * 3  (higher floors are harder)
 *   - Random variance: +/- 10 (deterministic from combined seed)
 *
 * Final score is clamped to [10, 100].
 */
export function simulateScore(
  agent: PrisonAgent,
  task: CompetitionTask,
  floorNumber: number,
  roundSeed: number,
): number {
  const combinedSeed = agent.seed * 31 + roundSeed * 17 + floorNumber * 53;

  // Base score: 40-70
  const base = 40 + seededRandom(combinedSeed) * 30;

  // Affinity bonus
  let affinity = 0;
  if (agent.specialization === task.category) {
    affinity = 15;
  } else if (agent.strengths.includes(task.category)) {
    affinity = 8;
  }

  // Floor penalty — competing at higher floors is tougher overall
  const floorPenalty = (floorNumber - 1) * 3;

  // Random variance: -10 to +10
  const variance = (seededRandom(combinedSeed + 9973) * 20) - 10;

  const raw = base + affinity - floorPenalty + variance;
  return Math.round(Math.max(10, Math.min(100, raw)));
}

// ---------------------------------------------------------------------------
// Competition initialization
// ---------------------------------------------------------------------------

/**
 * Creates the full initial CompetitionState with 64 agents placed on Floor 1.
 */
export function initializeCompetition(): CompetitionState {
  const agents = generateAllAgents();
  const agentIds = Object.keys(agents).sort();

  // Assign rooms on Floor 1
  for (let i = 0; i < agentIds.length; i++) {
    agents[agentIds[i]].room = Math.floor(i / 8);
  }

  const floors = buildFloors(agentIds);

  return {
    status: 'idle',
    currentFloor: 1,
    currentRound: 1,
    floors,
    agents,
    winner: null,
    log: [
      {
        timestamp: Date.now(),
        floor: 0,
        type: 'system',
        message:
          'Narkina5 Prison Arena initialized. 64 agents incarcerated across 8 cells on Floor 1.',
      },
    ],
    apiCallsMade: 0,
  };
}

// ---------------------------------------------------------------------------
// AI / Spotlight helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the given floor should use real AI calls instead of pure
 * simulated scoring. Floors 3, 4, and 5 use real AI.
 */
export function shouldUseRealAI(floorNumber: number): boolean {
  return floorNumber >= 3;
}

/**
 * Returns the number of "spotlight" agents on a given floor — agents whose
 * AI-generated output is displayed prominently to the audience.
 *
 *   Floor 1-2 : 0  (too many agents, pure simulation)
 *   Floor 3-4 : 2  (highlight top contenders)
 *   Floor 5   : 4  (all remaining agents are spotlighted)
 */
export function getSpotlightCount(floorNumber: number): number {
  if (floorNumber <= 2) return 0;
  if (floorNumber <= 4) return 2;
  return 4;
}

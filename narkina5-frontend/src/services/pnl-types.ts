// ============================================================================
// Narkina5 PnL Arena — Type Definitions
// Unified arena model: 512 agents, 64 cells, 7 floors, 1 survivor.
// ============================================================================

import type { Specialization, PrisonAgent } from './competition';

// ---------------------------------------------------------------------------
// Investment Roles (mapped from Specializations)
// ---------------------------------------------------------------------------

export type InvestmentRole =
  | 'Researcher'   // Holocron  — knowledge / data
  | 'Trader'       // Hyperspace — speed / execution
  | 'RiskManager'  // Garrison  — defense / security
  | 'Analyst'      // Holonet   — network / information
  | 'Strategist';  // Kyber     — energy / power

export type TradingDoctrine =
  | 'Wyckoff'
  | 'Scalping'
  | 'Technical'
  | 'MacroResearch'
  | 'OrderFlow';

export interface RoleCompetencyProfile {
  focus: string[];
  methods: string[];
  dataSources: string[];
  riskControls: string[];
}

export const ROLE_COMPETENCY_MATRIX: Record<InvestmentRole, RoleCompetencyProfile> = {
  Researcher: {
    focus: ['narrative discovery', 'new listing context', 'flow triggers'],
    methods: ['X operator queries', 'news clustering', 'on-chain event tagging'],
    dataSources: ['X search', 'DexScreener boosts', 'token age and turnover'],
    riskControls: ['spam source filter', 'duplicate narrative pruning'],
  },
  Analyst: {
    focus: ['market structure', 'trend regime', 'entry timing'],
    methods: ['Wyckoff phase scan', 'VWAP drift check', 'RSI and volatility regime'],
    dataSources: ['price change', '24h volume', 'market cap turnover'],
    riskControls: ['avoid thin liquidity breakouts', 'reject unstable structure'],
  },
  Strategist: {
    focus: ['capital allocation', 'cell-level positioning', 'rotation'],
    methods: ['thesis weighting', 'confidence scoring', 'cross-role synthesis'],
    dataSources: ['research confidence', 'analyst score', 'portfolio exposure'],
    riskControls: ['position caps', 'scenario branch limits'],
  },
  Trader: {
    focus: ['execution quality', 'fill efficiency', 'timing precision'],
    methods: ['price impact budgeting', 'slippage guardrails', 'minimum hold windows'],
    dataSources: ['expected edge', 'execution cost bps', 'priority-fee proxy'],
    riskControls: ['skip negative edge trades', 'throttle overtrading'],
  },
  RiskManager: {
    focus: ['tail-risk prevention', 'manipulation defense', 'portfolio survival'],
    methods: ['holder concentration checks', 'suspicion scoring', 'drawdown governance'],
    dataSources: ['holders', 'turnover ratio', 'momentum spike flags'],
    riskControls: ['veto toxic buys', 'enforce consistency gates'],
  },
};

export const RESEARCH_QUERY_TEMPLATES: string[] = [
  '$TOKEN lang:en -is:retweet has:cashtags',
  '$TOKEN (#solana OR #memecoin) -is:retweet',
  '$TOKEN (announce OR listing OR partnership) lang:en',
  'from:project_handle $TOKEN -is:retweet',
];

export const ROLE_FROM_SPEC: Record<Specialization, InvestmentRole> = {
  Holocron: 'Researcher',
  Hyperspace: 'Trader',
  Garrison: 'RiskManager',
  Holonet: 'Analyst',
  Kyber: 'Strategist',
};

export const ROLE_COLORS: Record<InvestmentRole, string> = {
  Researcher: '#8b5cf6',
  Trader: '#ff6b35',
  RiskManager: '#ef4444',
  Analyst: '#3b82f6',
  Strategist: '#22c55e',
};

export const ROLE_LABELS: Record<InvestmentRole, string> = {
  Researcher: 'Research',
  Trader: 'Trading',
  RiskManager: 'Risk Mgmt',
  Analyst: 'Analysis',
  Strategist: 'Strategy',
};

// ---------------------------------------------------------------------------
// Market Data
// ---------------------------------------------------------------------------

export interface PumpToken {
  mint: string;
  name: string;
  symbol: string;
  priceSOL: number;
  priceUSD: number;
  marketCapSOL: number;
  volume24h: number;
  priceChange24h: number; // percentage
  holders: number;
  createdAt: number;      // unix timestamp
  bondingCurveProgress: number; // 0-100
  imageUri?: string;
}

export interface TokenSnapshot {
  mint: string;
  priceSOL: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Portfolio & Trading
// ---------------------------------------------------------------------------

export interface Position {
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  entryRound?: number;
  quantity: number;
  avgEntryPrice: number;   // in SOL
  currentPrice: number;    // in SOL
  unrealizedPnL: number;   // in SOL
  unrealizedPnLPercent: number;
}

export interface Trade {
  id: string;
  timestamp: number;
  tokenMint: string;
  tokenSymbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  priceSOL: number;
  totalSOL: number;
  slippage: number;
  agentId: string;
  agentRole: InvestmentRole;
  reasoning: string;
}

export interface Portfolio {
  cashSOL: number;
  positions: Position[];
  trades: Trade[];
  totalValue: number;      // cash + positions
  realizedPnL: number;
  unrealizedPnL: number;
  totalPnL: number;
  totalPnLPercent: number;
  maxDrawdown: number;
  peakValue: number;
}

// ---------------------------------------------------------------------------
// Trading Cell
// ---------------------------------------------------------------------------

export type TradingPhase =
  | 'research'
  | 'analysis'
  | 'strategy'
  | 'execution'
  | 'risk_review';

export const PHASE_ORDER: TradingPhase[] = [
  'research', 'analysis', 'strategy', 'execution', 'risk_review',
];

export interface TradingCell {
  id: string;
  name: string;
  cellIndex: number;
  agents: string[];
  portfolio: Portfolio;
  status: 'pending' | 'trading' | 'complete' | 'eliminated';
  currentPhase: TradingPhase;
  roundPnL: number[];
  eliminatedRound?: number;
}

// ---------------------------------------------------------------------------
// PnL Agent (extends PrisonAgent)
// ---------------------------------------------------------------------------

export interface PnLAgent extends PrisonAgent {
  investmentRole: InvestmentRole;
  cellId: string;
  contribution: string;
  skillProfile: {
    doctrine: TradingDoctrine;
    riskAppetite: number;    // 0..1
    execution: number;       // 0..1
    researchDepth: number;   // 0..1
    chartSkill: number;      // 0..1
    adaptation: number;      // 0..1
    edgeScore: number;       // 0.3..1.5
  };
  learning: {
    rounds: number;
    cumulativePnL: number;
    recentRoundPnL: number[];
    confidence: number;      // 0..1
  };
}

// ---------------------------------------------------------------------------
// Competition State
// ---------------------------------------------------------------------------

export interface PnLLogEntry {
  timestamp: number;
  round: number;
  cellId?: string;
  type: 'system' | 'research' | 'trade' | 'risk_alert' | 'pnl_update' | 'round_end' | 'graduation';
  message: string;
}

export interface PnLCompetitionState {
  status: 'idle' | 'loading_tokens' | 'running' | 'complete';
  currentRound: number;
  totalRounds: number;

  cells: TradingCell[];
  agents: Record<string, PnLAgent>;

  availableTokens: PumpToken[];
  tokenHistory: Record<string, TokenSnapshot[]>;

  winner: string | null; // winning cell ID
  log: PnLLogEntry[];
  apiCallsMade: number;
}

// ---------------------------------------------------------------------------
// AI Response Types
// ---------------------------------------------------------------------------

export interface ResearchOutput {
  opportunities: Array<{
    mint: string;
    symbol: string;
    thesis: string;
    confidence: number;
    targetPriceSOL: number;
  }>;
}

export interface AnalysisOutput {
  sentiment: Array<{
    mint: string;
    score: number;
    reasoning: string;
  }>;
}

export interface StrategyOutput {
  allocations: Record<string, number>;
  reasoning: string;
}

export interface TradeDecision {
  side: 'buy' | 'sell';
  mint: string;
  symbol: string;
  amountSOL: number;
  reasoning: string;
}

export interface RiskReviewOutput {
  approved: string[];
  vetoed: Array<{ tradeId: string; reason: string }>;
  stopLosses: Array<{ mint: string; triggerPriceSOL: number }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const STARTING_CAPITAL = 100;
export const MAX_POSITION_PERCENT = 0.2;
export const SLIPPAGE_PERCENT = 0.0015;

export const TOTAL_FLOORS = 7;
export const TOTAL_ROUNDS = TOTAL_FLOORS;
export const SEASON_DURATION_DAYS = 7;
export const ROUNDS_PER_SEASON = TOTAL_ROUNDS;
export const MAX_GRADUATIONS_PER_SEASON = 1;
export const RELAX_GATE_AFTER_SEASONS = 4;

export const CELLS_COUNT = 64;
export const AGENTS_PER_CELL = 8;
export const TOTAL_AGENTS = CELLS_COUNT * AGENTS_PER_CELL;

export const SPOTLIGHT_CELLS = 3;

export interface FloorBracket {
  floor: number;
  cells: number;
  agents: number;
  advancePerCell: number;
}

export const FLOOR_BRACKET: FloorBracket[] = [
  { floor: 1, cells: 64, agents: 512, advancePerCell: 4 },
  { floor: 2, cells: 32, agents: 256, advancePerCell: 4 },
  { floor: 3, cells: 16, agents: 128, advancePerCell: 4 },
  { floor: 4, cells: 8, agents: 64, advancePerCell: 4 },
  { floor: 5, cells: 4, agents: 32, advancePerCell: 4 },
  { floor: 6, cells: 2, agents: 16, advancePerCell: 4 },
  { floor: 7, cells: 1, agents: 8, advancePerCell: 1 },
];

export const CELL_NAMES: string[] = [
  'Thrawn',
  'Tarkin',
  'Krennic',
  'Hux',
  'Pryce',
  'Kallus',
  'Yularen',
  'Piett',
  'Veers',
  'Jerjerrod',
  'Pellaeon',
  'Daala',
  'Rae Sloane',
  'Moff Gideon',
  'Bossk',
  'Dengar',
  'IG-88',
  'Zuckuss',
  '4-LOM',
  'Cad Bane',
  'Embo',
  'Aurra Sing',
  'Hondo Ohnaka',
  'Dryden Vos',
  "Qi'ra",
  'Ventress',
  'General Grievous',
  'Savage Opress',
  'Count Dooku',
  'Darth Maul',
  'Pre Vizsla',
  'Gar Saxon',
  'Rook Kast',
  'Almec',
  'Nute Gunray',
  'Rune Haako',
  'Wat Tambor',
  'Poggle the Lesser',
  'San Hill',
  'Lok Durd',
  'Mar Tuuk',
  'Osi Sobeck',
  'Admiral Trench',
  'Dedra Meero',
  'Syril Karn',
  'Major Partagaz',
  'Supervisor Blevin',
  'Linus Mosk',
  'Heert',
  'Doctor Gorst',
  'Eedy Karn',
  'Perrin Fertha',
  'Tay Kolma',
  'Kleya Marki',
  'Lonni Jung',
  'Bix Caleen',
  'Brasso',
  'Vel Sartha',
  'Cinta Kaz',
  'Arvel Skeen',
  'Karis Nemik',
  'Taramyn Barcona',
  'Melshi',
  'Xanwan',
];

// Floor-level elimination schedule (cells removed at end of each floor)
// 64 -> 32 -> 16 -> 8 -> 4 -> 2 -> 1
export const ELIMINATION_SCHEDULE: Record<number, number> = {
  1: 32,
  2: 16,
  3: 8,
  4: 4,
  5: 2,
  6: 1,
};

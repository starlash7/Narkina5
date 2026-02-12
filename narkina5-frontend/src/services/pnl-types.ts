// ============================================================================
// Narkina5 PnL Arena — Type Definitions
// 8 Trading Desks. 64 Agents. 5 Investment Roles. PnL determines the winner.
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
// Trading Desk (Room equivalent)
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

export interface TradingDesk {
  id: string;
  deskIndex: number;
  agents: string[];        // agent IDs
  portfolio: Portfolio;
  status: 'pending' | 'trading' | 'complete';
  currentPhase: TradingPhase;
  roundPnL: number[];      // PnL per round
}

// ---------------------------------------------------------------------------
// PnL Agent (extends PrisonAgent)
// ---------------------------------------------------------------------------

export interface PnLAgent extends PrisonAgent {
  investmentRole: InvestmentRole;
  deskId: string;
  contribution: string; // last AI output
}

// ---------------------------------------------------------------------------
// Competition State
// ---------------------------------------------------------------------------

export interface PnLLogEntry {
  timestamp: number;
  round: number;
  deskId?: string;
  type: 'system' | 'research' | 'trade' | 'risk_alert' | 'pnl_update' | 'round_end' | 'graduation';
  message: string;
}

export interface PnLCompetitionState {
  status: 'idle' | 'loading_tokens' | 'running' | 'complete';
  currentRound: number;
  totalRounds: number;

  desks: TradingDesk[];
  agents: Record<string, PnLAgent>;

  availableTokens: PumpToken[];
  tokenHistory: Record<string, TokenSnapshot[]>;

  winner: string | null; // winning desk ID
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
    confidence: number; // 1-10
    targetPriceSOL: number;
  }>;
}

export interface AnalysisOutput {
  sentiment: Array<{
    mint: string;
    score: number; // -1 to 1
    reasoning: string;
  }>;
}

export interface StrategyOutput {
  allocations: Record<string, number>; // mint -> % of portfolio
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
  approved: string[];     // trade IDs approved
  vetoed: Array<{ tradeId: string; reason: string }>;
  stopLosses: Array<{ mint: string; triggerPriceSOL: number }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const STARTING_CAPITAL = 100;           // SOL per desk
export const MAX_POSITION_PERCENT = 0.2;       // 20% max per position
export const SLIPPAGE_PERCENT = 0.01;          // 1% flat
export const TOTAL_ROUNDS = 5;
export const DESKS_COUNT = 8;
export const AGENTS_PER_DESK = 8;
export const SPOTLIGHT_DESKS = 3;              // top 3 use real AI

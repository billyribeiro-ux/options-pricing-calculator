import { GreeksResult, OptionType, Position } from '../quant/types';

export type StrategyType =
  | 'iron-condor'
  | 'bull-put-spread'
  | 'bear-call-spread'
  | 'iron-butterfly'
  | 'calendar-spread'
  | 'diagonal-spread'
  | 'straddle'
  | 'strangle'
  | 'covered-call'
  | 'cash-secured-put'
  | 'long-call'
  | 'long-put'
  | 'equity'
  | 'custom';

export type TradeStatus = 'open' | 'closed' | 'adjusted';

export type ExecutionGrade = 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';

export type MindsetTag =
  | 'disciplined'
  | 'patient'
  | 'pre-market plan'
  | 'fomo'
  | 'hesitant'
  | 'revenge trade'
  | 'impulsive'
  | 'over-leveraged'
  | 'boredom entry';

export interface TradeLeg {
  id: string;
  type: OptionType | 'equity';
  position: Position;
  strike?: number;
  expirationDate?: string; // YYYY-MM-DD
  dteAtEntry?: number;
  entryPrice: number; // Price per share
  exitPrice?: number;
  contracts: number; // 1 contract = 100 shares for options
  status: 'open' | 'closed' | 'rolled';
}

export interface TradeAdjustment {
  id: string;
  timestamp: string;
  description: string;
  action: 'roll' | 'close-leg' | 'add-leg' | 'hedge';
  creditOrDebit: number; // positive = credit, negative = debit
}

export interface PsychologyMetrics {
  confidence: number; // 1 to 10
  mindsetTags: MindsetTag[];
  rulesFollowed: boolean;
  planAdherenceScore: number; // 0 to 100%
  executionGrade: ExecutionGrade;
  preTradeMindset?: string;
  postTradeReview?: string;
}

export interface MarketSnapshotAtEntry {
  spotPrice: number;
  atmIV: number;
  dte: number;
  expectedMove1Sigma: number;
  expectedValueModel: number; // Exact EV from OptionsQuant model
  greeks: GreeksResult;
}

export interface JournalEntry {
  id: string;
  entryDate: string; // YYYY-MM-DD
  exitDate?: string; // YYYY-MM-DD
  symbol: string;
  strategyType: StrategyType;
  status: TradeStatus;
  
  // Structure & Legs
  legs: TradeLeg[];
  adjustments: TradeAdjustment[];
  
  // Financial Accounting
  netCreditOrDebitPerShare: number; // positive = credit received, negative = debit paid
  totalPremiumDollars: number;
  feesAndCommissions: number;
  realizedPnL?: number; // Net dollars after fees
  unrealizedPnL?: number;
  maxRiskDollars: number;
  returnOnRisk?: number; // realizedPnL / maxRiskDollars
  
  // Context & Snapshots
  snapshotAtEntry?: MarketSnapshotAtEntry;
  psychology: PsychologyMetrics;
  
  // Notes & Attachments
  thesisNotes: string;
  lessonsLearned?: string;
  screenshotUrls?: string[];
  tags: string[];
}

export interface DailyJournalSummary {
  date: string; // YYYY-MM-DD
  realizedPnL: number;
  tradeCount: number;
  wins: number;
  losses: number;
  trades: JournalEntry[];
}

export interface PerformanceKPIs {
  totalNetPnL: number;
  grossWins: number;
  grossLosses: number;
  profitFactor: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  scratchTrades: number;
  avgWin: number;
  avgLoss: number;
  winLossRatio: number;
  expectancyDollars: number;
  maxDrawdownDollars: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  avgHoldDays: number;
  disciplineScore: number; // % rules followed
}

export interface JournalFilter {
  symbol?: string;
  strategyType?: StrategyType | 'all';
  status?: TradeStatus | 'all';
  outcome?: 'win' | 'loss' | 'all';
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

import { JournalEntry } from './types';

const STORAGE_KEY = 'optionsquant_journal_entries_v1';

const INITIAL_SAMPLE_TRADES: JournalEntry[] = [
  {
    id: 'tr-001',
    entryDate: '2026-10-15',
    exitDate: '2026-10-25',
    symbol: 'AAPL',
    strategyType: 'iron-condor',
    status: 'closed',
    legs: [
      { id: 'l1', type: 'call', position: 'sell', strike: 705, entryPrice: 0.65, exitPrice: 0.00, contracts: 10, status: 'closed' },
      { id: 'l2', type: 'call', position: 'buy', strike: 710, entryPrice: 0.20, exitPrice: 0.00, contracts: 10, status: 'closed' },
      { id: 'l3', type: 'put', position: 'sell', strike: 690, entryPrice: 0.50, exitPrice: 0.00, contracts: 10, status: 'closed' },
      { id: 'l4', type: 'put', position: 'buy', strike: 685, entryPrice: 0.18, exitPrice: 0.00, contracts: 10, status: 'closed' },
    ],
    adjustments: [],
    netCreditOrDebitPerShare: 0.77,
    totalPremiumDollars: 770.00,
    feesAndCommissions: 12.50,
    realizedPnL: 757.50,
    maxRiskDollars: 4230.00,
    returnOnRisk: 0.179,
    snapshotAtEntry: {
      spotPrice: 698.00,
      atmIV: 0.174,
      dte: 10,
      expectedMove1Sigma: 20.10,
      expectedValueModel: 142.10,
      greeks: { delta: -0.42, gamma: -0.012, theta: 48.5, vega: -84.2, rho: -3.1 }
    },
    psychology: {
      confidence: 9,
      mindsetTags: ['disciplined', 'patient', 'pre-market plan'],
      rulesFollowed: true,
      planAdherenceScore: 100,
      executionGrade: 'A+',
      preTradeMindset: 'Waited for AAPL IV rank expansion before entering 10-day Iron Condor beyond 1-sigma bounds.',
      postTradeReview: 'Flawless expiration. Underlying pinned at $699.20. Closed automatically at full profit.'
    },
    thesisNotes: 'Entered 10-day pre-earnings Iron Condor. Strikes set safely outside expected move ($678 to $718). Credit collected exceeded fair continuous EV expectation.',
    lessonsLearned: 'Patience paid off by waiting for afternoon implied volatility pop rather than chasing morning open.',
    tags: ['earnings-play', 'high-iv', 'excel-parity']
  },
  {
    id: 'tr-002',
    entryDate: '2026-10-18',
    exitDate: '2026-10-24',
    symbol: 'SPY',
    strategyType: 'bull-put-spread',
    status: 'closed',
    legs: [
      { id: 'l5', type: 'put', position: 'sell', strike: 575, entryPrice: 1.10, exitPrice: 0.15, contracts: 5, status: 'closed' },
      { id: 'l6', type: 'put', position: 'buy', strike: 570, entryPrice: 0.42, exitPrice: 0.05, contracts: 5, status: 'closed' },
    ],
    adjustments: [],
    netCreditOrDebitPerShare: 0.68,
    totalPremiumDollars: 340.00,
    feesAndCommissions: 8.00,
    realizedPnL: 290.00,
    maxRiskDollars: 2160.00,
    returnOnRisk: 0.134,
    snapshotAtEntry: {
      spotPrice: 582.50,
      atmIV: 0.135,
      dte: 6,
      expectedMove1Sigma: 7.20,
      expectedValueModel: 95.00,
      greeks: { delta: 12.5, gamma: -0.85, theta: 24.0, vega: -32.0, rho: 1.2 }
    },
    psychology: {
      confidence: 8,
      mindsetTags: ['disciplined', 'pre-market plan'],
      rulesFollowed: true,
      planAdherenceScore: 95,
      executionGrade: 'A',
      preTradeMindset: 'Market found firm support at 50-day moving average. Selling 575 Put spread below support.',
      postTradeReview: 'Closed at 85% max profit when SPY rallied toward 585.'
    },
    thesisNotes: 'Bullish bounce at key support. High probability put credit spread with 6 DTE.',
    lessonsLearned: 'Taking profit at 85% instead of holding to zero saved capital and reduced tail risk.',
    tags: ['support-bounce', 'spy-credit']
  },
  {
    id: 'tr-003',
    entryDate: '2026-10-12',
    exitDate: '2026-10-16',
    symbol: 'NVDA',
    strategyType: 'bear-call-spread',
    status: 'closed',
    legs: [
      { id: 'l7', type: 'call', position: 'sell', strike: 140, entryPrice: 1.45, exitPrice: 2.80, contracts: 5, status: 'closed' },
      { id: 'l8', type: 'call', position: 'buy', strike: 145, entryPrice: 0.65, exitPrice: 1.40, contracts: 5, status: 'closed' },
    ],
    adjustments: [],
    netCreditOrDebitPerShare: 0.80,
    totalPremiumDollars: 400.00,
    feesAndCommissions: 10.00,
    realizedPnL: -310.00,
    maxRiskDollars: 2100.00,
    returnOnRisk: -0.147,
    snapshotAtEntry: {
      spotPrice: 136.00,
      atmIV: 0.44,
      dte: 7,
      expectedMove1Sigma: 6.80,
      expectedValueModel: -40.00,
      greeks: { delta: -18.0, gamma: -1.2, theta: 35.0, vega: -45.0, rho: -2.0 }
    },
    psychology: {
      confidence: 6,
      mindsetTags: ['disciplined', 'patient'],
      rulesFollowed: true,
      planAdherenceScore: 90,
      executionGrade: 'B+',
      preTradeMindset: 'Expected resistance at $140. Set stop at 1.5x credit.',
      postTradeReview: 'NVDA surged on unexpected supplier news. Stop triggered cleanly at -1.5x credit. Controlled loss.'
    },
    thesisNotes: 'Counter-trend resistance test. Position sized to only 1% portfolio risk.',
    lessonsLearned: 'Stops work. Accepting the loss kept portfolio safe from the subsequent gap to $146.',
    tags: ['controlled-loss', 'tech-momentum']
  },
  {
    id: 'tr-004',
    entryDate: '2026-10-20',
    exitDate: '2026-10-24',
    symbol: 'QQQ',
    strategyType: 'iron-condor',
    status: 'closed',
    legs: [
      { id: 'l9', type: 'call', position: 'sell', strike: 505, entryPrice: 0.85, exitPrice: 0.10, contracts: 10, status: 'closed' },
      { id: 'l10', type: 'call', position: 'buy', strike: 510, entryPrice: 0.25, exitPrice: 0.02, contracts: 10, status: 'closed' },
      { id: 'l11', type: 'put', position: 'sell', strike: 485, entryPrice: 0.70, exitPrice: 0.08, contracts: 10, status: 'closed' },
      { id: 'l12', type: 'put', position: 'buy', strike: 480, entryPrice: 0.20, exitPrice: 0.01, contracts: 10, status: 'closed' },
    ],
    adjustments: [],
    netCreditOrDebitPerShare: 1.10,
    totalPremiumDollars: 1100.00,
    feesAndCommissions: 16.00,
    realizedPnL: 934.00,
    maxRiskDollars: 3900.00,
    returnOnRisk: 0.239,
    snapshotAtEntry: {
      spotPrice: 495.00,
      atmIV: 0.165,
      dte: 5,
      expectedMove1Sigma: 9.50,
      expectedValueModel: 180.00,
      greeks: { delta: -2.1, gamma: -0.04, theta: 62.0, vega: -95.0, rho: -1.5 }
    },
    psychology: {
      confidence: 9,
      mindsetTags: ['disciplined', 'patient', 'pre-market plan'],
      rulesFollowed: true,
      planAdherenceScore: 100,
      executionGrade: 'A+',
      preTradeMindset: 'Weekly range-bound expectation between 485 and 505.',
      postTradeReview: 'Closed on Friday morning ahead of weekend theta decay exhaustion.'
    },
    thesisNotes: 'Weekly index condor with delta-neutral stance.',
    lessonsLearned: 'Index Iron Condors provide cleaner range-bound behavior than single-stock condors.',
    tags: ['index-condor', 'high-theta']
  },
  {
    id: 'tr-005',
    entryDate: '2026-10-24',
    symbol: 'MSFT',
    strategyType: 'bull-put-spread',
    status: 'open',
    legs: [
      { id: 'l13', type: 'put', position: 'sell', strike: 425, entryPrice: 1.40, contracts: 5, status: 'open' },
      { id: 'l14', type: 'put', position: 'buy', strike: 420, entryPrice: 0.45, contracts: 5, status: 'open' },
    ],
    adjustments: [],
    netCreditOrDebitPerShare: 0.95,
    totalPremiumDollars: 475.00,
    feesAndCommissions: 8.00,
    unrealizedPnL: 180.00,
    maxRiskDollars: 2025.00,
    snapshotAtEntry: {
      spotPrice: 432.00,
      atmIV: 0.19,
      dte: 14,
      expectedMove1Sigma: 12.80,
      expectedValueModel: 110.00,
      greeks: { delta: 14.2, gamma: -0.65, theta: 18.5, vega: -28.0, rho: 1.5 }
    },
    psychology: {
      confidence: 8,
      mindsetTags: ['disciplined', 'patient'],
      rulesFollowed: true,
      planAdherenceScore: 95,
      executionGrade: 'A',
      preTradeMindset: 'MSFT holding strong above cloud support. Selling 425 put spread.',
    },
    thesisNotes: 'Cloud momentum with upcoming product releases. Strong support cushion.',
    tags: ['open-position', 'cloud-leader']
  }
];

export function getJournalEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_TRADES));
      return INITIAL_SAMPLE_TRADES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load journal entries from storage:', e);
    return INITIAL_SAMPLE_TRADES;
  }
}

export function saveJournalEntry(entry: JournalEntry): void {
  const current = getJournalEntries();
  const index = current.findIndex((e) => e.id === entry.id);

  if (index >= 0) {
    current[index] = entry;
  } else {
    current.unshift(entry); // Add to beginning of log
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function deleteJournalEntry(id: string): void {
  const current = getJournalEntries();
  const filtered = current.filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function exportJournalJSON(): string {
  const entries = getJournalEntries();
  return JSON.stringify(entries, null, 2);
}

export function importJournalJSON(jsonString: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return { success: false, count: 0, error: 'JSON root must be an array of journal entries' };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    return { success: true, count: parsed.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message };
  }
}

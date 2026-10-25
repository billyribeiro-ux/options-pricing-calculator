import { JournalEntry, PerformanceKPIs, DailyJournalSummary, StrategyType, MindsetTag } from './types';

export function calculatePerformanceKPIs(entries: JournalEntry[]): PerformanceKPIs {
  const closedTrades = entries.filter((e) => e.status === 'closed' && e.realizedPnL !== undefined);

  if (closedTrades.length === 0) {
    return {
      totalNetPnL: 0,
      grossWins: 0,
      grossLosses: 0,
      profitFactor: 0,
      winRate: 0,
      totalTrades: entries.length,
      winningTrades: 0,
      losingTrades: 0,
      scratchTrades: 0,
      avgWin: 0,
      avgLoss: 0,
      winLossRatio: 0,
      expectancyDollars: 0,
      maxDrawdownDollars: 0,
      maxDrawdownPercent: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      avgHoldDays: 0,
      disciplineScore: entries.length > 0
        ? (entries.filter((e) => e.psychology.rulesFollowed).length / entries.length) * 100
        : 100
    };
  }

  let totalNetPnL = 0;
  let grossWins = 0;
  let grossLosses = 0;
  let winningTrades = 0;
  let losingTrades = 0;
  let scratchTrades = 0;
  let totalHoldDays = 0;

  closedTrades.forEach((trade) => {
    const pnl = trade.realizedPnL || 0;
    totalNetPnL += pnl;

    if (pnl > 0.01) {
      grossWins += pnl;
      winningTrades++;
    } else if (pnl < -0.01) {
      grossLosses += Math.abs(pnl);
      losingTrades++;
    } else {
      scratchTrades++;
    }

    // Days held
    if (trade.entryDate && trade.exitDate) {
      const entry = new Date(trade.entryDate).getTime();
      const exit = new Date(trade.exitDate).getTime();
      const days = Math.max(1, Math.round((exit - entry) / (1000 * 60 * 60 * 24)));
      totalHoldDays += days;
    }
  });

  const totalDecided = winningTrades + losingTrades;
  const winRate = totalDecided > 0 ? winningTrades / totalDecided : 0;
  const avgWin = winningTrades > 0 ? grossWins / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? grossLosses / losingTrades : 0;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 99 : 0;
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 99 : 0;
  const expectancyDollars = winRate * avgWin - (1 - winRate) * avgLoss;
  const avgHoldDays = closedTrades.length > 0 ? totalHoldDays / closedTrades.length : 0;

  // Max Drawdown Calculation
  let peak = 0;
  let currentEquity = 0;
  let maxDrawdownDollars = 0;
  let maxDrawdownPercent = 0;

  // Chronological sort
  const sorted = [...closedTrades].sort(
    (a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime()
  );

  const dailyReturns: number[] = [];

  sorted.forEach((trade) => {
    currentEquity += trade.realizedPnL || 0;
    dailyReturns.push(trade.realizedPnL || 0);

    if (currentEquity > peak) {
      peak = currentEquity;
    }

    const drawdown = peak - currentEquity;
    if (drawdown > maxDrawdownDollars) {
      maxDrawdownDollars = drawdown;
      if (peak > 0) {
        maxDrawdownPercent = (drawdown / peak) * 100;
      }
    }
  });

  // Sharpe & Sortino Ratios (Annualized assuming 252 trading sessions)
  let sharpeRatio = 0;
  let sortinoRatio = 0;

  if (dailyReturns.length > 2) {
    const meanReturn = totalNetPnL / dailyReturns.length;
    let sumSq = 0;
    let sumDownsideSq = 0;

    dailyReturns.forEach((r) => {
      const diff = r - meanReturn;
      sumSq += diff * diff;
      if (r < 0) {
        sumDownsideSq += r * r;
      }
    });

    const stdDev = Math.sqrt(sumSq / dailyReturns.length);
    const downsideStdDev = Math.sqrt(sumDownsideSq / dailyReturns.length);

    if (stdDev > 0) {
      sharpeRatio = (meanReturn / stdDev) * Math.sqrt(252);
    }
    if (downsideStdDev > 0) {
      sortinoRatio = (meanReturn / downsideStdDev) * Math.sqrt(252);
    }
  }

  // Rules adherence
  const rulesFollowedCount = entries.filter((e) => e.psychology.rulesFollowed).length;
  const disciplineScore = entries.length > 0 ? (rulesFollowedCount / entries.length) * 100 : 100;

  return {
    totalNetPnL,
    grossWins,
    grossLosses,
    profitFactor,
    winRate,
    totalTrades: entries.length,
    winningTrades,
    losingTrades,
    scratchTrades,
    avgWin,
    avgLoss,
    winLossRatio,
    expectancyDollars,
    maxDrawdownDollars,
    maxDrawdownPercent,
    sharpeRatio,
    sortinoRatio,
    avgHoldDays,
    disciplineScore
  };
}

/**
 * Groups journal entries by date for calendar heatmap
 */
export function groupEntriesByDate(entries: JournalEntry[]): Map<string, DailyJournalSummary> {
  const map = new Map<string, DailyJournalSummary>();

  entries.forEach((trade) => {
    // Group by exitDate if closed, else entryDate
    const dateKey = (trade.status === 'closed' && trade.exitDate ? trade.exitDate : trade.entryDate).split('T')[0];

    const existing = map.get(dateKey) || {
      date: dateKey,
      realizedPnL: 0,
      tradeCount: 0,
      wins: 0,
      losses: 0,
      trades: []
    };

    const pnl = trade.realizedPnL || trade.unrealizedPnL || 0;
    existing.realizedPnL += pnl;
    existing.tradeCount += 1;
    if (pnl > 0.01) existing.wins += 1;
    if (pnl < -0.01) existing.losses += 1;
    existing.trades.push(trade);

    map.set(dateKey, existing);
  });

  return map;
}

/**
 * Breakdown of performance by Strategy Type
 */
export function calculateStrategyBreakdown(entries: JournalEntry[]): {
  strategy: StrategyType;
  trades: number;
  winRate: number;
  totalPnL: number;
}[] {
  const grouped = new Map<StrategyType, { trades: number; wins: number; totalPnL: number }>();

  entries.forEach((e) => {
    const curr = grouped.get(e.strategyType) || { trades: 0, wins: 0, totalPnL: 0 };
    curr.trades++;
    const pnl = e.realizedPnL || e.unrealizedPnL || 0;
    curr.totalPnL += pnl;
    if (pnl > 0) curr.wins++;
    grouped.set(e.strategyType, curr);
  });

  const results: { strategy: StrategyType; trades: number; winRate: number; totalPnL: number }[] = [];
  grouped.forEach((val, strat) => {
    results.push({
      strategy: strat,
      trades: val.trades,
      winRate: val.trades > 0 ? val.wins / val.trades : 0,
      totalPnL: val.totalPnL
    });
  });

  return results.sort((a, b) => b.totalPnL - a.totalPnL);
}

/**
 * Dynamically computes frequency, win rate, and net P&L for each Mindset Tag
 */
export function calculateMindsetBreakdown(entries: JournalEntry[]): {
  tag: MindsetTag;
  count: number;
  frequencyPct: number;
  winRate: number;
  totalPnL: number;
}[] {
  const totalEntries = Math.max(1, entries.length);
  const map = new Map<MindsetTag, { count: number; wins: number; totalPnL: number }>();

  entries.forEach((e) => {
    const pnl = e.realizedPnL ?? e.unrealizedPnL ?? 0;
    e.psychology.mindsetTags.forEach((tag) => {
      const curr = map.get(tag) || { count: 0, wins: 0, totalPnL: 0 };
      curr.count += 1;
      curr.totalPnL += pnl;
      if (pnl > 0) curr.wins += 1;
      map.set(tag, curr);
    });
  });

  const out: {
    tag: MindsetTag;
    count: number;
    frequencyPct: number;
    winRate: number;
    totalPnL: number;
  }[] = [];

  map.forEach((val, tag) => {
    out.push({
      tag,
      count: val.count,
      frequencyPct: (val.count / totalEntries) * 100,
      winRate: val.count > 0 ? val.wins / val.count : 0,
      totalPnL: val.totalPnL
    });
  });

  return out.sort((a, b) => b.count - a.count);
}

/**
 * Computes performance grouped by Day of Week (Mon-Fri)
 */
export function calculateDayOfWeekBreakdown(entries: JournalEntry[]): {
  day: string;
  trades: number;
  winRate: number;
  totalPnL: number;
}[] {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const map = new Map<string, { trades: number; wins: number; totalPnL: number }>();
  days.forEach((d) => map.set(d, { trades: 0, wins: 0, totalPnL: 0 }));

  entries.forEach((e) => {
    const dt = new Date(`${e.entryDate.split('T')[0]}T12:00:00`);
    const dayIdx = dt.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    const dayName = days[Math.max(0, Math.min(4, dayIdx - 1))] || 'Monday';
    const curr = map.get(dayName)!;
    const pnl = e.realizedPnL ?? e.unrealizedPnL ?? 0;
    curr.trades += 1;
    curr.totalPnL += pnl;
    if (pnl > 0) curr.wins += 1;
  });

  return days.map((day) => {
    const val = map.get(day)!;
    return {
      day,
      trades: val.trades,
      winRate: val.trades > 0 ? val.wins / val.trades : 0,
      totalPnL: val.totalPnL
    };
  });
}

/**
 * Generates chronological cumulative equity and drawdown series
 */
export function calculateEquityCurve(entries: JournalEntry[]): {
  date: string;
  symbol: string;
  tradePnL: number;
  cumulativeEquity: number;
  drawdown: number;
}[] {
  const closed = entries
    .filter((e) => e.status === 'closed' && e.realizedPnL !== undefined)
    .sort((a, b) => new Date(a.exitDate || a.entryDate).getTime() - new Date(b.exitDate || b.entryDate).getTime());

  let cum = 0;
  let peak = 0;

  return closed.map((t) => {
    const pnl = t.realizedPnL || 0;
    cum += pnl;
    if (cum > peak) peak = cum;
    return {
      date: (t.exitDate || t.entryDate).split('T')[0],
      symbol: t.symbol,
      tradePnL: pnl,
      cumulativeEquity: cum,
      drawdown: peak - cum
    };
  });
}

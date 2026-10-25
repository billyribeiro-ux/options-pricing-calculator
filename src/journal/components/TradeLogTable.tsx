import React, { useState } from 'react';
import { JournalEntry, StrategyType, TradeStatus } from '../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Search, Eye, Edit3, Trash2 } from 'lucide-react';

interface TradeLogTableProps {
  entries: JournalEntry[];
  onSelectTrade: (trade: JournalEntry) => void;
  onEditTrade?: (trade: JournalEntry) => void;
  onDeleteTrade: (id: string) => void;
  selectedDate: string | null;
}

export const TradeLogTable: React.FC<TradeLogTableProps> = ({
  entries,
  onSelectTrade,
  onEditTrade,
  onDeleteTrade,
  selectedDate
}) => {
  const [search, setSearch] = useState('');
  const [strategyFilter, setStrategyFilter] = useState<StrategyType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TradeStatus | 'all'>('all');

  // Filter entries
  const filtered = entries.filter((e) => {
    if (selectedDate && e.entryDate !== selectedDate && e.exitDate !== selectedDate) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchSymbol = e.symbol.toLowerCase().includes(q);
      const matchNotes = e.thesisNotes.toLowerCase().includes(q);
      const matchTags = e.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchSymbol && !matchNotes && !matchTags) return false;
    }
    if (strategyFilter !== 'all' && e.strategyType !== strategyFilter) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    return true;
  });

  const getGradeClass = (grade: string) => {
    if (grade.startsWith('A')) return 'md-chip md-chip--gain';
    if (grade.startsWith('B')) return 'md-chip md-chip--neutral';
    return 'md-chip md-chip--loss';
  };

  return (
    <div className="md-card md-card--elevated">
      <div className="md-card__header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 className="md-card__title">Trade Journal & Execution Log</h3>
          <span className="md-chip md-chip--neutral">{filtered.length} Trades</span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div className="md-input-wrapper" style={{ height: 36, width: 180, padding: '0 8px' }}>
            <label htmlFor="trade-log-search" style={{ display: 'none' }}>Search Trades</label>
            <Search size={14} color="var(--md-sys-color-outline)" style={{ marginRight: 6 }} />
            <input
              id="trade-log-search"
              name="tradeLogSearch"
              type="text"
              className="md-input"
              placeholder="Search ticker, tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 12 }}
            />
          </div>

          <label htmlFor="trade-strategy-filter" style={{ display: 'none' }}>Strategy Filter</label>
          <select
            id="trade-strategy-filter"
            name="strategyFilter"
            className="md-select"
            style={{
              height: 36,
              fontSize: 12,
              padding: '0 10px',
              borderRadius: 8,
              color: 'var(--md-sys-color-on-surface)',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)'
            }}
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value as any)}
          >
            <option value="all" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>All Strategies</option>
            <option value="iron-condor" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>Iron Condor</option>
            <option value="bull-put-spread" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>Bull Put Spread</option>
            <option value="bear-call-spread" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>Bear Call Spread</option>
            <option value="iron-butterfly" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>Iron Butterfly</option>
            <option value="straddle" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>Straddle</option>
          </select>

          <label htmlFor="trade-status-filter" style={{ display: 'none' }}>Status Filter</label>
          <select
            id="trade-status-filter"
            name="statusFilter"
            className="md-select"
            style={{
              height: 36,
              fontSize: 12,
              padding: '0 10px',
              borderRadius: 8,
              color: 'var(--md-sys-color-on-surface)',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)'
            }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>All Status</option>
            <option value="open" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>Open</option>
            <option value="closed" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>Closed</option>
          </select>
        </div>
      </div>

      <div className="md-table-container">
        <table className="md-table">
          <thead>
            <tr>
              <th style={{ width: 95 }}>Date</th>
              <th style={{ width: 85 }}>Symbol</th>
              <th style={{ width: 140 }}>Strategy</th>
              <th style={{ width: 90 }}>Status</th>
              <th style={{ minWidth: 150 }}>Legs Summary</th>
              <th className="text-right" style={{ width: 115 }}>Credit / Debit</th>
              <th className="text-right" style={{ width: 125 }}>Realized P&L</th>
              <th className="text-right" style={{ width: 100 }}>Return (RoR)</th>
              <th className="text-center" style={{ width: 75 }}>Grade</th>
              <th className="text-center" style={{ width: 120 }}>Discipline</th>
              <th className="text-right" style={{ width: 110 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((trade) => {
              const pnl = trade.realizedPnL ?? trade.unrealizedPnL ?? 0;
              const isProfit = pnl >= 0;

              // Generate concise legs summary
              const legsSummary = trade.legs
                .map((l) => `${l.position.toUpperCase() === 'BUY' ? '+' : '-'}${l.strike || ''}${l.type.charAt(0).toUpperCase()}`)
                .join(' / ');

              return (
                <tr key={trade.id} onClick={() => onSelectTrade(trade)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600 }}>{trade.entryDate}</td>
                  <td>
                    <span className="md-top-app-bar__ticker-badge" style={{ fontSize: 11, padding: '2px 8px' }}>
                      {trade.symbol}
                    </span>
                  </td>
                  <td>
                    <span style={{ textTransform: 'capitalize', fontSize: 12, fontWeight: 500, color: 'var(--md-sys-color-on-surface)' }}>
                      {trade.strategyType.replace(/-/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <span
                      className="md-chip"
                      style={{
                        fontSize: 10,
                        backgroundColor: trade.status === 'open' ? 'var(--quant-color-neutral-container)' : 'var(--md-sys-color-surface-container-high)',
                        color: trade.status === 'open' ? 'var(--quant-color-neutral)' : 'var(--md-sys-color-on-surface)'
                      }}
                    >
                      {trade.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)' }}>
                    {legsSummary}
                  </td>
                  <td className="mono-small">
                    {formatCurrency(trade.totalPremiumDollars)}
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    <span style={{ color: isProfit ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}>
                      {trade.realizedPnL !== undefined ? formatCurrency(trade.realizedPnL) : `${formatCurrency(trade.unrealizedPnL || 0)} (Open)`}
                    </span>
                  </td>
                  <td className="mono-small">
                    {trade.returnOnRisk !== undefined ? formatPercent(trade.returnOnRisk) : '—'}
                  </td>
                  <td>
                    <span className={getGradeClass(trade.psychology.executionGrade)} style={{ fontSize: 11 }}>
                      {trade.psychology.executionGrade}
                    </span>
                  </td>
                  <td>
                    {trade.psychology.rulesFollowed ? (
                      <span className="md-chip md-chip--gain" style={{ fontSize: 10 }}>Followed Rules</span>
                    ) : (
                      <span className="md-chip md-chip--loss" style={{ fontSize: 10 }}>Violated Rules</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button
                        className="md-icon-button"
                        style={{ width: 28, height: 28 }}
                        onClick={(e) => { e.stopPropagation(); onSelectTrade(trade); }}
                        title="View Full Post-Mortem"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="md-icon-button"
                        style={{ width: 28, height: 28 }}
                        onClick={(e) => { e.stopPropagation(); onEditTrade?.(trade); }}
                        title="Edit Trade Entry"
                      >
                        <Edit3 size={14} color="var(--md-sys-color-primary)" />
                      </button>
                      <button
                        className="md-icon-button"
                        style={{ width: 28, height: 28 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete trade entry ${trade.symbol} (${trade.strategyType})?`)) {
                            onDeleteTrade(trade.id);
                          }
                        }}
                        title="Delete Trade Entry"
                      >
                        <Trash2 size={14} color="var(--quant-color-loss)" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: 32, color: 'var(--md-sys-color-outline)' }}>
                  No trades found matching current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { JournalEntry } from './types';
import { getJournalEntries, saveJournalEntry, deleteJournalEntry } from './storage';
import { calculatePerformanceKPIs, calculateStrategyBreakdown } from './analytics';
import { JournalKPIs } from './components/JournalKPIs';
import { CalendarHeatmap } from './components/CalendarHeatmap';
import { TradeLogTable } from './components/TradeLogTable';
import { TradeDetailModal } from './components/TradeDetailModal';
import { BrokerImportModal } from './components/BrokerImportModal';
import { NewTradeModal } from './components/NewTradeModal';
import { Journal3DLandscape } from './components/Journal3DLandscape';
import { BookOpen, Plus, Upload, Mountain, PieChart } from 'lucide-react';
import { formatCurrency, formatPercent } from '../utils/formatters';

export const JournalView: React.FC = () => {
  const [entries, setEntries] = useState<JournalEntry[]>(() => getJournalEntries());
  const [subView, setSubView] = useState<'overview' | '3d' | 'analytics'>('overview');
  const [selectedTrade, setSelectedTrade] = useState<JournalEntry | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [isNewTradeOpen, setIsNewTradeOpen] = useState<boolean>(false);
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  const kpis = useMemo(() => calculatePerformanceKPIs(entries), [entries]);
  const strategyBreakdown = useMemo(() => calculateStrategyBreakdown(entries), [entries]);

  const handleSaveNewTrade = (trade: JournalEntry) => {
    saveJournalEntry(trade);
    setEntries(getJournalEntries());
  };

  const handleDeleteTrade = (id: string) => {
    deleteJournalEntry(id);
    setEntries(getJournalEntries());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Journal View Sub-Header */}
      <div className="md-card md-card--elevated" style={{ padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BookOpen size={22} color="var(--md-sys-color-primary)" />
            <div>
              <h2 className="title-medium" style={{ margin: 0 }}>OptionsQuant Trader Journal</h2>
              <span className="body-small" style={{ color: 'var(--md-sys-color-outline)' }}>
                Track trades, psychological discipline, execution grades, and performance topology
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div className="md-segmented-button">
              <button
                className={`md-segmented-button__segment ${subView === 'overview' ? 'md-segmented-button__segment--active' : ''}`}
                onClick={() => setSubView('overview')}
              >
                Log & Calendar
              </button>
              <button
                className={`md-segmented-button__segment ${subView === '3d' ? 'md-segmented-button__segment--active' : ''}`}
                onClick={() => setSubView('3d')}
              >
                <Mountain size={14} />
                <span>3D Topology</span>
              </button>
              <button
                className={`md-segmented-button__segment ${subView === 'analytics' ? 'md-segmented-button__segment--active' : ''}`}
                onClick={() => setSubView('analytics')}
              >
                <PieChart size={14} />
                <span>Analytics</span>
              </button>
            </div>

            <button
              className="md-button md-button--filled"
              style={{ height: 36, padding: '0 14px', fontSize: 13 }}
              onClick={() => setIsNewTradeOpen(true)}
            >
              <Plus size={16} />
              <span>Log Trade</span>
            </button>

            <button
              className="md-button md-button--tonal"
              style={{ height: 36, padding: '0 12px', fontSize: 13 }}
              onClick={() => setIsImportOpen(true)}
              title="Import Broker CSV / Export Journal"
            >
              <Upload size={14} />
              <span>Import / Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <JournalKPIs kpis={kpis} />

      {/* Sub-view switcher */}
      {subView === 'overview' && (
        <>
          {/* Calendar Heatmap */}
          <CalendarHeatmap
            entries={entries}
            selectedDate={selectedCalendarDate}
            onSelectDate={setSelectedCalendarDate}
          />

          {/* Trade Log Table */}
          <TradeLogTable
            entries={entries}
            onSelectTrade={setSelectedTrade}
            onDeleteTrade={handleDeleteTrade}
            selectedDate={selectedCalendarDate}
          />
        </>
      )}

      {subView === '3d' && (
        <Journal3DLandscape entries={entries} onSelectTrade={setSelectedTrade} />
      )}

      {subView === 'analytics' && (
        <div className="grid-analytics">
          {/* Strategy Breakdown Card */}
          <div className="md-card md-card--elevated">
            <div className="md-card__header">
              <h3 className="md-card__title">Performance by Strategy Type</h3>
            </div>
            <div className="md-table-container">
              <table className="md-table">
                <thead>
                  <tr>
                    <th>Strategy</th>
                    <th>Trades</th>
                    <th>Win Rate</th>
                    <th>Total Net P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {strategyBreakdown.map((s) => (
                    <tr key={s.strategy}>
                      <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                        {s.strategy.replace(/-/g, ' ')}
                      </td>
                      <td>{s.trades}</td>
                      <td>{formatPercent(s.winRate)}</td>
                      <td style={{ fontWeight: 700, color: s.totalPnL >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}>
                        {formatCurrency(s.totalPnL)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Psychology & Discipline Summary */}
          <div className="md-card md-card--elevated">
            <div className="md-card__header">
              <h3 className="md-card__title">Psychological & Mindset Audit</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="md-card md-card--tonal" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="body-medium">Overall Plan Adherence</span>
                  <span className="mono-medium" style={{ color: 'var(--quant-color-gain)' }}>
                    {kpis.disciplineScore.toFixed(0)}%
                  </span>
                </div>
                <div style={{ height: 6, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${kpis.disciplineScore}%`,
                      height: '100%',
                      backgroundColor: 'var(--quant-color-gain)'
                    }}
                  />
                </div>
              </div>

              <div className="md-card md-card--tonal" style={{ padding: 14 }}>
                <span className="title-small" style={{ display: 'block', marginBottom: 8 }}>
                  Most Frequent Mindset Tags
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span className="md-chip md-chip--gain">Disciplined (85%)</span>
                  <span className="md-chip md-chip--gain">Pre-Market Plan (70%)</span>
                  <span className="md-chip md-chip--neutral">Patient (60%)</span>
                  <span className="md-chip md-chip--loss">FOMO (10%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <TradeDetailModal
        trade={selectedTrade}
        onClose={() => setSelectedTrade(null)}
      />

      <NewTradeModal
        isOpen={isNewTradeOpen}
        onClose={() => setIsNewTradeOpen(false)}
        onSaveTrade={handleSaveNewTrade}
      />

      <BrokerImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        entries={entries}
        onReloadEntries={() => setEntries(getJournalEntries())}
      />
    </div>
  );
};

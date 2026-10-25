import React, { useState, useEffect } from 'react';
import { JournalEntry, ExecutionGrade } from '../types';
import { formatCurrency, formatPercent, formatDelta } from '../../utils/formatters';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Tag, CheckSquare, RefreshCw, Save } from 'lucide-react';

interface TradeDetailModalProps {
  trade: JournalEntry | null;
  onClose: () => void;
  onUpdateTrade?: (updated: JournalEntry) => void;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({ trade, onClose, onUpdateTrade }) => {
  const [closeDate, setCloseDate] = useState<string>('');
  const [closingPnL, setClosingPnL] = useState<number>(0);
  const [adjNote, setAdjNote] = useState<string>('');
  const [adjCredit, setAdjCredit] = useState<number>(0);
  const [lessons, setLessons] = useState<string>('');
  const [grade, setGrade] = useState<ExecutionGrade>('A');

  useEffect(() => {
    if (trade) {
      setCloseDate(trade.exitDate || new Date().toISOString().split('T')[0]);
      setClosingPnL(trade.realizedPnL ?? trade.unrealizedPnL ?? Math.round(trade.totalPremiumDollars * 0.5));
      setLessons(trade.lessonsLearned || '');
      setGrade(trade.psychology.executionGrade);
    }
  }, [trade]);

  if (!trade) return null;

  const pnl = trade.realizedPnL ?? trade.unrealizedPnL ?? 0;
  const isProfit = pnl >= 0;

  const handleClosePosition = () => {
    if (!onUpdateTrade) return;
    const updated: JournalEntry = {
      ...trade,
      status: 'closed',
      exitDate: closeDate || new Date().toISOString().split('T')[0],
      realizedPnL: closingPnL,
      returnOnRisk: trade.maxRiskDollars > 0 ? closingPnL / trade.maxRiskDollars : 0,
      lessonsLearned: lessons || trade.lessonsLearned,
      psychology: {
        ...trade.psychology,
        executionGrade: grade
      },
      legs: trade.legs.map((l) => ({
        ...l,
        status: 'closed',
        exitPrice: l.exitPrice ?? 0.05
      }))
    };
    onUpdateTrade(updated);
  };

  const handleAddAdjustment = () => {
    if (!onUpdateTrade || !adjNote.trim()) return;
    const updated: JournalEntry = {
      ...trade,
      adjustments: [
        ...trade.adjustments,
        {
          id: `adj-${Date.now()}`,
          timestamp: new Date().toISOString().split('T')[0],
          description: adjNote.trim(),
          action: 'roll',
          creditOrDebit: adjCredit
        }
      ]
    };
    setAdjNote('');
    setAdjCredit(0);
    onUpdateTrade(updated);
  };

  const handleSavePostMortem = () => {
    if (!onUpdateTrade) return;
    const updated: JournalEntry = {
      ...trade,
      lessonsLearned: lessons,
      psychology: {
        ...trade.psychology,
        executionGrade: grade
      }
    };
    onUpdateTrade(updated);
  };

  return (
    <div className="md-dialog-backdrop" onClick={onClose}>
      <div
        className="md-dialog"
        style={{ maxWidth: 840, maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md-dialog__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="md-top-app-bar__ticker-badge" style={{ fontSize: 16 }}>
              {trade.symbol}
            </span>
            <div>
              <h2 className="title-large" style={{ margin: 0, textTransform: 'capitalize' }}>
                {trade.strategyType.replace(/-/g, ' ')}
              </h2>
              <span className="body-small" style={{ color: 'var(--md-sys-color-outline)' }}>
                Opened on {trade.entryDate} {trade.exitDate ? `• Closed on ${trade.exitDate}` : '• Position Open'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              className="mono-large"
              style={{ color: isProfit ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}
            >
              {formatCurrency(pnl)}
            </div>
            <button className="md-icon-button" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 1. Multi-Leg Structure Breakdown */}
        <div>
          <div className="title-medium" style={{ marginBottom: 8 }}>Option Legs & Position Structure</div>
          <div className="md-table-container">
            <table className="md-table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Strike</th>
                  <th>Type</th>
                  <th>Entry Price</th>
                  <th>Exit Price</th>
                  <th>Contracts</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {trade.legs.map((leg) => (
                  <tr key={leg.id}>
                    <td style={{ fontWeight: 700, color: leg.position === 'sell' ? 'var(--quant-color-loss)' : 'var(--quant-color-gain)' }}>
                      {leg.position.toUpperCase()}
                    </td>
                    <td className="mono-small">${leg.strike || 'Market'}</td>
                    <td style={{ textTransform: 'uppercase' }}>{leg.type}</td>
                    <td className="mono-small">{formatCurrency(leg.entryPrice)}</td>
                    <td className="mono-small">{leg.exitPrice !== undefined ? formatCurrency(leg.exitPrice) : '—'}</td>
                    <td>{leg.contracts}</td>
                    <td>
                      <span className="md-chip md-chip--neutral" style={{ fontSize: 10 }}>
                        {leg.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Snapshot at Entry (Pre-Trade Quant Model) */}
        {trade.snapshotAtEntry && (
          <div className="md-card md-card--tonal" style={{ padding: 14 }}>
            <div className="title-small" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="var(--md-sys-color-primary)" />
              Quantitative Snapshot at Execution (OptionsQuant Model)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, fontSize: 12 }}>
              <div>
                <span style={{ color: 'var(--md-sys-color-outline)' }}>Spot Price: </span>
                <span className="mono-small">{formatCurrency(trade.snapshotAtEntry.spotPrice)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--md-sys-color-outline)' }}>ATM IV: </span>
                <span className="mono-small">{formatPercent(trade.snapshotAtEntry.atmIV)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--md-sys-color-outline)' }}>DTE: </span>
                <span className="mono-small">{trade.snapshotAtEntry.dte} Days</span>
              </div>
              <div>
                <span style={{ color: 'var(--md-sys-color-outline)' }}>1σ Move: </span>
                <span className="mono-small">±{formatCurrency(trade.snapshotAtEntry.expectedMove1Sigma)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--md-sys-color-outline)' }}>Model EV: </span>
                <span className="mono-small" style={{ color: trade.snapshotAtEntry.expectedValueModel >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}>
                  {formatCurrency(trade.snapshotAtEntry.expectedValueModel)}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--md-sys-color-outline)' }}>Net Delta: </span>
                <span className="mono-small">{formatDelta(trade.snapshotAtEntry.greeks.delta)}</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Psychological & Discipline Audit */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div className="md-card md-card--outlined" style={{ padding: 14 }}>
            <div className="title-small" style={{ marginBottom: 8 }}>Discipline & Execution Rating</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <div
                className="mono-large"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: 'var(--md-sys-color-primary-container)',
                  color: 'var(--md-sys-color-on-primary-container)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {trade.psychology.executionGrade}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  Confidence: {trade.psychology.confidence}/10
                </div>
                <div className="body-small" style={{ color: 'var(--md-sys-color-outline)' }}>
                  Plan Adherence: {trade.psychology.planAdherenceScore}%
                </div>
              </div>
            </div>
            <div>
              {trade.psychology.rulesFollowed ? (
                <span className="md-chip md-chip--gain" style={{ fontSize: 11 }}>
                  <CheckCircle2 size={12} style={{ marginRight: 4 }} />
                  Strictly Followed Trading Plan
                </span>
              ) : (
                <span className="md-chip md-chip--loss" style={{ fontSize: 11 }}>
                  <AlertTriangle size={12} style={{ marginRight: 4 }} />
                  Rule Violation Detected
                </span>
              )}
            </div>
          </div>

          <div className="md-card md-card--outlined" style={{ padding: 14 }}>
            <div className="title-small" style={{ marginBottom: 8 }}>Mindset & Behavioral Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {trade.psychology.mindsetTags.map((tag) => (
                <span key={tag} className="md-chip md-chip--neutral" style={{ textTransform: 'capitalize' }}>
                  {tag}
                </span>
              ))}
              {trade.tags.map((tag) => (
                <span key={tag} className="md-chip" style={{ backgroundColor: 'var(--md-sys-color-surface-container-highest)', color: 'var(--md-sys-color-on-surface)' }}>
                  <Tag size={10} style={{ marginRight: 4 }} />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Trade Thesis & Interactive Post-Mortem / Position Lifecycle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="md-card md-card--filled" style={{ padding: 14 }}>
            <div className="title-small" style={{ marginBottom: 4, color: 'var(--md-sys-color-primary)' }}>Trade Thesis & Setup Criteria</div>
            <div className="body-medium" style={{ whiteSpace: 'pre-wrap' }}>
              {trade.thesisNotes || 'No initial thesis recorded.'}
            </div>
          </div>

          {/* Adjustments & Rolls History + Add Form */}
          <div className="md-card md-card--outlined" style={{ padding: 14 }}>
            <div className="title-small" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={15} color="var(--md-sys-color-primary)" />
              Position Adjustments & Rolls ({trade.adjustments.length})
            </div>
            {trade.adjustments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                {trade.adjustments.map((adj) => (
                  <div
                    key={adj.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12,
                      padding: '6px 10px',
                      borderRadius: 6,
                      backgroundColor: 'var(--md-sys-color-surface-container)'
                    }}
                  >
                    <span><strong>{adj.timestamp}:</strong> {adj.description}</span>
                    <span className="mono-small" style={{ color: adj.creditOrDebit >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}>
                      {adj.creditOrDebit >= 0 ? '+' : ''}{formatCurrency(adj.creditOrDebit)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {onUpdateTrade && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, alignItems: 'center' }}>
                <div className="md-input-wrapper" style={{ height: 34 }}>
                  <label htmlFor="detail-adj-note" style={{ display: 'none' }}>Adjustment Description</label>
                  <input
                    id="detail-adj-note"
                    name="adjNote"
                    type="text"
                    className="md-input"
                    placeholder="Log roll or adjustment (e.g., Rolled 705C to 710C)..."
                    value={adjNote}
                    onChange={(e) => setAdjNote(e.target.value)}
                  />
                </div>
                <div className="md-input-wrapper" style={{ height: 34 }}>
                  <label htmlFor="detail-adj-credit" style={{ display: 'none' }}>Adjustment Credit or Debit</label>
                  <span className="md-input-prefix">$</span>
                  <input
                    id="detail-adj-credit"
                    name="adjCredit"
                    type="number"
                    step="10"
                    className="md-input"
                    value={adjCredit}
                    onChange={(e) => setAdjCredit(parseFloat(e.target.value) || 0)}
                    title="Net Credit (+) or Debit (-) in Dollars"
                  />
                </div>
                <button className="md-button md-button--tonal" style={{ height: 34 }} onClick={handleAddAdjustment}>
                  Log Roll
                </button>
              </div>
            )}
          </div>

          {/* Close Open Position Panel */}
          {trade.status === 'open' && onUpdateTrade && (
            <div className="md-card md-card--tonal" style={{ padding: 14, border: '1px solid var(--md-sys-color-primary)' }}>
              <div className="title-small" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--md-sys-color-primary)' }}>
                <CheckSquare size={16} />
                Close Open Position & Realize P&L
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, alignItems: 'end' }}>
                <div className="md-field-group">
                  <label htmlFor="detail-close-date" className="md-field-label">Exit Date</label>
                  <div className="md-input-wrapper" style={{ height: 36 }}>
                    <input
                      id="detail-close-date"
                      name="closeDate"
                      type="date"
                      className="md-input"
                      value={closeDate}
                      onChange={(e) => setCloseDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="md-field-group">
                  <label htmlFor="detail-close-pnl" className="md-field-label">Realized Net P&L ($)</label>
                  <div className="md-input-wrapper" style={{ height: 36 }}>
                    <span className="md-input-prefix">$</span>
                    <input
                      id="detail-close-pnl"
                      name="closingPnL"
                      type="number"
                      step="10"
                      className="md-input"
                      value={closingPnL}
                      onChange={(e) => setClosingPnL(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="md-field-group">
                  <label htmlFor="detail-close-grade" className="md-field-label">Execution Grade</label>
                  <select
                    id="detail-close-grade"
                    name="closeGrade"
                    className="md-select"
                    style={{ height: 36, color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container)' }}
                    value={grade}
                    onChange={(e) => setGrade(e.target.value as ExecutionGrade)}
                  >
                    <option value="A+" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>A+</option>
                    <option value="A" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>A</option>
                    <option value="B+" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>B+</option>
                    <option value="B" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>B</option>
                    <option value="C" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>C</option>
                    <option value="D" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>D</option>
                  </select>
                </div>
                <button className="md-button md-button--filled" style={{ height: 36 }} onClick={handleClosePosition}>
                  Close Position
                </button>
              </div>
            </div>
          )}

          {/* Post-Mortem Audit & Lessons Learned Editor */}
          <div className="md-card md-card--filled" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div className="title-small" style={{ color: 'var(--quant-color-gain)' }}>
                Post-Mortem Audit & Lessons Learned
              </div>
              {onUpdateTrade && (
                <button
                  className="md-button md-button--tonal"
                  style={{ height: 28, padding: '0 10px', fontSize: 11 }}
                  onClick={handleSavePostMortem}
                >
                  <Save size={12} />
                  <span>Save Post-Mortem</span>
                </button>
              )}
            </div>
            <label htmlFor="detail-post-mortem" style={{ display: 'none' }}>Post-Mortem Lessons</label>
            <textarea
              id="detail-post-mortem"
              name="postMortemLessons"
              className="md-textarea"
              style={{
                width: '100%',
                height: 64,
                padding: 8,
                resize: 'vertical',
                fontFamily: 'inherit',
                color: 'var(--md-sys-color-on-surface)',
                backgroundColor: 'var(--md-sys-color-surface-container)',
                border: '1px solid var(--md-sys-color-outline-variant)'
              }}
              placeholder="Document post-trade execution review, exit timing analysis, and key takeaways..."
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
            />
          </div>
        </div>

        <div className="md-dialog__actions">
          <button className="md-button md-button--filled" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

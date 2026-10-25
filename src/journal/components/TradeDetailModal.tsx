import React from 'react';
import { JournalEntry } from '../types';
import { formatCurrency, formatPercent, formatDelta } from '../../utils/formatters';
import { X, CheckCircle2, AlertTriangle, ShieldCheck, Tag } from 'lucide-react';

interface TradeDetailModalProps {
  trade: JournalEntry | null;
  onClose: () => void;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({ trade, onClose }) => {
  if (!trade) return null;

  const pnl = trade.realizedPnL ?? trade.unrealizedPnL ?? 0;
  const isProfit = pnl >= 0;

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

        {/* 4. Trade Thesis & Post-Mortem Review */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="md-card md-card--filled" style={{ padding: 14 }}>
            <div className="title-small" style={{ marginBottom: 4, color: 'var(--md-sys-color-primary)' }}>Trade Thesis & Setup Criteria</div>
            <div className="body-medium" style={{ whiteSpace: 'pre-wrap' }}>
              {trade.thesisNotes || 'No initial thesis recorded.'}
            </div>
          </div>

          {trade.lessonsLearned && (
            <div className="md-card md-card--filled" style={{ padding: 14 }}>
              <div className="title-small" style={{ marginBottom: 4, color: 'var(--quant-color-gain)' }}>Post-Mortem Audit & Lessons Learned</div>
              <div className="body-medium" style={{ whiteSpace: 'pre-wrap' }}>
                {trade.lessonsLearned}
              </div>
            </div>
          )}
        </div>

        <div className="md-dialog__actions">
          <button className="md-button md-button--filled" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

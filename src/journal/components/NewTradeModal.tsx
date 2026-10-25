import React, { useState } from 'react';
import { JournalEntry, StrategyType, TradeStatus, ExecutionGrade, MindsetTag } from '../types';
import { X, Plus } from 'lucide-react';

interface NewTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTrade: (entry: JournalEntry) => void;
}

export const NewTradeModal: React.FC<NewTradeModalProps> = ({ isOpen, onClose, onSaveTrade }) => {
  const [symbol, setSymbol] = useState('SPY');
  const [strategyType, setStrategyType] = useState<StrategyType>('bull-put-spread');
  const [status, setStatus] = useState<TradeStatus>('open');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [exitDate, setExitDate] = useState('');
  const [netPrice, setNetPrice] = useState<number>(0.85);
  const [contracts, setContracts] = useState<number>(5);
  const [realizedPnL, setRealizedPnL] = useState<number>(350);
  const [maxRisk, setMaxRisk] = useState<number>(2075);
  const [thesis, setThesis] = useState('');
  const [confidence, setConfidence] = useState<number>(8);
  const [executionGrade, setExecutionGrade] = useState<ExecutionGrade>('A');
  const [rulesFollowed, setRulesFollowed] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSave = () => {
    const totalPremium = netPrice * contracts * 100;
    const newEntry: JournalEntry = {
      id: `manual-${Date.now()}`,
      entryDate,
      exitDate: status === 'closed' ? exitDate || entryDate : undefined,
      symbol: symbol.toUpperCase(),
      strategyType,
      status,
      legs: [
        {
          id: `leg-${Date.now()}-1`,
          type: 'put',
          position: 'sell',
          strike: 575,
          entryPrice: netPrice + 0.3,
          exitPrice: status === 'closed' ? 0.05 : undefined,
          contracts,
          status: status === 'closed' ? 'closed' : 'open'
        }
      ],
      adjustments: [],
      netCreditOrDebitPerShare: netPrice,
      totalPremiumDollars: totalPremium,
      feesAndCommissions: contracts * 1.30,
      realizedPnL: status === 'closed' ? realizedPnL : undefined,
      unrealizedPnL: status === 'open' ? 0 : undefined,
      maxRiskDollars: maxRisk,
      returnOnRisk: status === 'closed' && maxRisk > 0 ? realizedPnL / maxRisk : undefined,
      psychology: {
        confidence,
        mindsetTags: ['disciplined', 'pre-market plan'] as MindsetTag[],
        rulesFollowed,
        planAdherenceScore: rulesFollowed ? 100 : 70,
        executionGrade
      },
      thesisNotes: thesis || `${strategyType} on ${symbol.toUpperCase()}. Manual journal log entry.`,
      tags: ['manual-entry']
    };

    onSaveTrade(newEntry);
    onClose();
  };

  return (
    <div className="md-dialog-backdrop" onClick={onClose}>
      <div className="md-dialog" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="md-dialog__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Plus size={22} color="var(--md-sys-color-primary)" />
            <h2 className="md-dialog__title">Manual Trade Entry</h2>
          </div>
          <button className="md-icon-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div className="md-field-group">
            <label className="md-field-label">Symbol</label>
            <div className="md-input-wrapper">
              <input
                type="text"
                className="md-input"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="md-field-group">
            <label className="md-field-label">Strategy</label>
            <select
              className="md-input-wrapper"
              value={strategyType}
              onChange={(e) => setStrategyType(e.target.value as any)}
            >
              <option value="iron-condor">Iron Condor</option>
              <option value="bull-put-spread">Bull Put Spread</option>
              <option value="bear-call-spread">Bear Call Spread</option>
              <option value="iron-butterfly">Iron Butterfly</option>
              <option value="covered-call">Covered Call</option>
              <option value="cash-secured-put">Cash-Secured Put</option>
              <option value="long-call">Long Call</option>
              <option value="long-put">Long Put</option>
              <option value="equity">Equity Shares</option>
            </select>
          </div>

          <div className="md-field-group">
            <label className="md-field-label">Status</label>
            <select
              className="md-input-wrapper"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div className="md-field-group">
            <label className="md-field-label">Entry Date</label>
            <div className="md-input-wrapper">
              <input
                type="date"
                className="md-input"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="md-field-group">
            <label className="md-field-label">Net Credit/Debit ($/sh)</label>
            <div className="md-input-wrapper">
              <span className="md-input-prefix">$</span>
              <input
                type="number"
                step="0.01"
                className="md-input"
                value={netPrice}
                onChange={(e) => setNetPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="md-field-group">
            <label className="md-field-label">Contracts / Shares</label>
            <div className="md-input-wrapper">
              <input
                type="number"
                min="1"
                className="md-input"
                value={contracts}
                onChange={(e) => setContracts(parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>
        </div>

        {status === 'closed' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="md-field-group">
              <label className="md-field-label">Exit Date</label>
              <div className="md-input-wrapper">
                <input
                  type="date"
                  className="md-input"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                />
              </div>
            </div>

            <div className="md-field-group">
              <label className="md-field-label">Realized Net P&L ($)</label>
              <div className="md-input-wrapper">
                <span className="md-input-prefix">$</span>
                <input
                  type="number"
                  step="1"
                  className="md-input"
                  value={realizedPnL}
                  onChange={(e) => setRealizedPnL(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div className="md-field-group">
            <label className="md-field-label">Max Risk ($)</label>
            <div className="md-input-wrapper">
              <span className="md-input-prefix">$</span>
              <input
                type="number"
                className="md-input"
                value={maxRisk}
                onChange={(e) => setMaxRisk(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="md-field-group">
            <label className="md-field-label">Confidence ({confidence}/10)</label>
            <div className="md-input-wrapper">
              <input
                type="number"
                min="1"
                max="10"
                className="md-input"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>

          <div className="md-field-group">
            <label className="md-field-label">Execution Grade</label>
            <select
              className="md-input-wrapper"
              value={executionGrade}
              onChange={(e) => setExecutionGrade(e.target.value as any)}
            >
              <option value="A+">A+ (Perfect Execution)</option>
              <option value="A">A (Followed Plan)</option>
              <option value="B+">B+ (Good Execution)</option>
              <option value="B">B (Acceptable)</option>
              <option value="C">C (Deviated slightly)</option>
              <option value="D">D (Rule Broken)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
          <input
            type="checkbox"
            id="new-trade-rules"
            checked={rulesFollowed}
            onChange={(e) => setRulesFollowed(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--md-sys-color-primary)' }}
          />
          <label htmlFor="new-trade-rules" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Followed written trading plan & position risk limit
          </label>
        </div>

        <div className="md-field-group">
          <label className="md-field-label">Trade Thesis & Notes</label>
          <textarea
            className="md-input-wrapper"
            style={{ height: 60, padding: 8, width: '100%', resize: 'none', fontFamily: 'inherit' }}
            placeholder="Trade rationale, support/resistance levels, news catalysts..."
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
          />
        </div>

        <div className="md-dialog__actions">
          <button className="md-button md-button--text" onClick={onClose}>
            Cancel
          </button>
          <button className="md-button md-button--filled" onClick={handleSave}>
            Save to Journal
          </button>
        </div>
      </div>
    </div>
  );
};

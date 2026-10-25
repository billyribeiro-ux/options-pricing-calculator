import React, { useState } from 'react';
import { JournalEntry, TradeLeg, StrategyType, TradeStatus, ExecutionGrade, MindsetTag } from '../types';
import { X, Plus, Trash2 } from 'lucide-react';

interface NewTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTrade: (entry: JournalEntry) => void;
}

const ALL_MINDSET_TAGS: MindsetTag[] = [
  'disciplined',
  'patient',
  'pre-market plan',
  'fomo',
  'hesitant',
  'revenge trade',
  'impulsive',
  'over-leveraged',
  'boredom entry'
];

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
  const [selectedTags, setSelectedTags] = useState<MindsetTag[]>(['disciplined', 'pre-market plan']);

  const [legs, setLegs] = useState<TradeLeg[]>([
    { id: 'leg-1', type: 'put', position: 'sell', strike: 575, entryPrice: 1.45, contracts: 5, status: 'open' },
    { id: 'leg-2', type: 'put', position: 'buy', strike: 570, entryPrice: 0.60, contracts: 5, status: 'open' }
  ]);

  if (!isOpen) return null;

  const toggleMindsetTag = (tag: MindsetTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddLeg = () => {
    setLegs((prev) => [
      ...prev,
      {
        id: `leg-${Date.now()}-${prev.length + 1}`,
        type: 'call',
        position: 'sell',
        strike: 590,
        entryPrice: 0.75,
        contracts,
        status: status === 'closed' ? 'closed' : 'open'
      }
    ]);
  };

  const handleUpdateLeg = (idx: number, patch: Partial<TradeLeg>) => {
    setLegs((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const handleRemoveLeg = (idx: number) => {
    if (legs.length <= 1) return;
    setLegs((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const totalPremium = netPrice * contracts * 100;
    const newEntry: JournalEntry = {
      id: `manual-${Date.now()}`,
      entryDate,
      exitDate: status === 'closed' ? exitDate || entryDate : undefined,
      symbol: symbol.toUpperCase(),
      strategyType,
      status,
      legs: legs.map((l) => ({
        ...l,
        contracts,
        status: status === 'closed' ? 'closed' : 'open'
      })),
      adjustments: [],
      netCreditOrDebitPerShare: netPrice,
      totalPremiumDollars: totalPremium,
      feesAndCommissions: contracts * legs.length * 0.65,
      realizedPnL: status === 'closed' ? realizedPnL : undefined,
      unrealizedPnL: status === 'open' ? 0 : undefined,
      maxRiskDollars: maxRisk,
      returnOnRisk: status === 'closed' && maxRisk > 0 ? realizedPnL / maxRisk : undefined,
      psychology: {
        confidence,
        mindsetTags: selectedTags.length > 0 ? selectedTags : ['disciplined'],
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div className="md-field-group">
            <label htmlFor="new-trade-symbol" className="md-field-label">Symbol</label>
            <div className="md-input-wrapper">
              <input
                id="new-trade-symbol"
                name="symbol"
                type="text"
                className="md-input"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="md-field-group">
            <label htmlFor="new-trade-strategy" className="md-field-label">Strategy</label>
            <select
              id="new-trade-strategy"
              name="strategyType"
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
            <label htmlFor="new-trade-status" className="md-field-label">Status</label>
            <select
              id="new-trade-status"
              name="status"
              className="md-input-wrapper"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div className="md-field-group">
            <label htmlFor="new-trade-entry-date" className="md-field-label">Entry Date</label>
            <div className="md-input-wrapper">
              <input
                id="new-trade-entry-date"
                name="entryDate"
                type="date"
                className="md-input"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
          </div>

          <div className="md-field-group">
            <label htmlFor="new-trade-net-price" className="md-field-label">Net Credit/Debit ($/sh)</label>
            <div className="md-input-wrapper">
              <span className="md-input-prefix">$</span>
              <input
                id="new-trade-net-price"
                name="netPrice"
                type="number"
                step="0.01"
                className="md-input"
                value={netPrice}
                onChange={(e) => setNetPrice(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="md-field-group">
            <label htmlFor="new-trade-contracts" className="md-field-label">Contracts / Shares</label>
            <div className="md-input-wrapper">
              <input
                id="new-trade-contracts"
                name="contracts"
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
              <label htmlFor="new-trade-exit-date" className="md-field-label">Exit Date</label>
              <div className="md-input-wrapper">
                <input
                  id="new-trade-exit-date"
                  name="exitDate"
                  type="date"
                  className="md-input"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                />
              </div>
            </div>

            <div className="md-field-group">
              <label htmlFor="new-trade-pnl" className="md-field-label">Realized Net P&L ($)</label>
              <div className="md-input-wrapper">
                <span className="md-input-prefix">$</span>
                <input
                  id="new-trade-pnl"
                  name="realizedPnL"
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <div className="md-field-group">
            <label htmlFor="new-trade-max-risk" className="md-field-label">Max Risk ($)</label>
            <div className="md-input-wrapper">
              <span className="md-input-prefix">$</span>
              <input
                id="new-trade-max-risk"
                name="maxRisk"
                type="number"
                className="md-input"
                value={maxRisk}
                onChange={(e) => setMaxRisk(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="md-field-group">
            <label htmlFor="new-trade-confidence" className="md-field-label">Confidence ({confidence}/10)</label>
            <div className="md-input-wrapper">
              <input
                id="new-trade-confidence"
                name="confidence"
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
            <label htmlFor="new-trade-grade" className="md-field-label">Execution Grade</label>
            <select
              id="new-trade-grade"
              name="executionGrade"
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0' }}>
          <input
            type="checkbox"
            id="new-trade-rules"
            name="rulesFollowed"
            checked={rulesFollowed}
            onChange={(e) => setRulesFollowed(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: 'var(--md-sys-color-primary)' }}
          />
          <label htmlFor="new-trade-rules" style={{ fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Followed written trading plan & position risk limit
          </label>
        </div>

        {/* Option Legs Builder */}
        <div className="md-card md-card--outlined" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="label-medium">Option Legs ({legs.length})</span>
            <button
              type="button"
              className="md-button md-button--tonal"
              style={{ height: 26, padding: '0 10px', fontSize: 11 }}
              onClick={handleAddLeg}
            >
              <Plus size={12} />
              <span>Add Leg</span>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {legs.map((leg, idx) => (
              <div key={leg.id} style={{ display: 'grid', gridTemplateColumns: '85px 85px 1fr 1fr 28px', gap: 6, alignItems: 'center' }}>
                <select
                  id={`new-trade-leg-pos-${idx}`}
                  name={`legPosition_${idx}`}
                  aria-label={`Leg ${idx + 1} Position`}
                  className="md-input-wrapper"
                  style={{ height: 30, fontSize: 12 }}
                  value={leg.position}
                  onChange={(e) => handleUpdateLeg(idx, { position: e.target.value as 'buy' | 'sell' })}
                >
                  <option value="sell">SELL</option>
                  <option value="buy">BUY</option>
                </select>
                <select
                  id={`new-trade-leg-type-${idx}`}
                  name={`legType_${idx}`}
                  aria-label={`Leg ${idx + 1} Type`}
                  className="md-input-wrapper"
                  style={{ height: 30, fontSize: 12 }}
                  value={leg.type}
                  onChange={(e) => handleUpdateLeg(idx, { type: e.target.value as 'call' | 'put' })}
                >
                  <option value="put">PUT</option>
                  <option value="call">CALL</option>
                </select>
                <div className="md-input-wrapper" style={{ height: 30 }}>
                  <span className="md-input-prefix">$</span>
                  <input
                    id={`new-trade-leg-strike-${idx}`}
                    name={`legStrike_${idx}`}
                    aria-label={`Leg ${idx + 1} Strike Price`}
                    type="number"
                    className="md-input"
                    style={{ fontSize: 12 }}
                    value={leg.strike || 0}
                    onChange={(e) => handleUpdateLeg(idx, { strike: parseFloat(e.target.value) || 0 })}
                    title="Strike Price"
                  />
                </div>
                <div className="md-input-wrapper" style={{ height: 30 }}>
                  <span className="md-input-prefix">@</span>
                  <input
                    id={`new-trade-leg-price-${idx}`}
                    name={`legPrice_${idx}`}
                    aria-label={`Leg ${idx + 1} Entry Price`}
                    type="number"
                    step="0.05"
                    className="md-input"
                    style={{ fontSize: 12 }}
                    value={leg.entryPrice}
                    onChange={(e) => handleUpdateLeg(idx, { entryPrice: parseFloat(e.target.value) || 0 })}
                    title="Entry Premium ($/sh)"
                  />
                </div>
                <button
                  type="button"
                  className="md-icon-button"
                  style={{ width: 28, height: 28 }}
                  onClick={() => handleRemoveLeg(idx)}
                  disabled={legs.length <= 1}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Mindset Tag Chips */}
        <div>
          <label className="md-field-label" style={{ display: 'block', marginBottom: 6 }}>Mindset & Setup Tags</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ALL_MINDSET_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleMindsetTag(tag)}
                  className={`md-chip ${active ? 'md-chip--gain' : 'md-chip--neutral'}`}
                  style={{
                    cursor: 'pointer',
                    border: active ? '1px solid var(--quant-color-gain)' : '1px solid transparent',
                    textTransform: 'capitalize'
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        <div className="md-field-group">
          <label htmlFor="new-trade-thesis" className="md-field-label">Trade Thesis & Notes</label>
          <textarea
            id="new-trade-thesis"
            name="thesis"
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

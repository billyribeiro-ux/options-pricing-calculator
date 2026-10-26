import React, { useState } from 'react';
import { IronCondorEvaluation, StrategyMode, UnderlyingParams } from '../../quant/types';
import { JournalEntry, MindsetTag, ExecutionGrade, TradeLeg, StrategyType } from '../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { Zap, ShieldCheck, Check, X } from 'lucide-react';

interface LogCalculatorTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  params: UnderlyingParams;
  condorEval: IronCondorEvaluation;
  strategyMode: StrategyMode;
  onSaveTrade: (entry: JournalEntry) => void;
}

export const LogCalculatorTradeModal: React.FC<LogCalculatorTradeModalProps> = ({
  isOpen,
  onClose,
  params,
  condorEval,
  strategyMode,
  onSaveTrade
}) => {
  const [thesis, setThesis] = useState('');
  const [confidence, setConfidence] = useState<number>(8);
  const [rulesFollowed, setRulesFollowed] = useState<boolean>(true);
  const [executionGrade, setExecutionGrade] = useState<ExecutionGrade>('A');
  const [selectedMindset, setSelectedMindset] = useState<MindsetTag[]>(['disciplined', 'pre-market plan']);

  if (!isOpen) return null;

  const availableTags: MindsetTag[] = [
    'disciplined',
    'patient',
    'pre-market plan',
    'fomo',
    'hesitant',
    'revenge trade',
    'impulsive'
  ];

  const toggleTag = (tag: MindsetTag) => {
    if (selectedMindset.includes(tag)) {
      setSelectedMindset(selectedMindset.filter((t) => t !== tag));
    } else {
      setSelectedMindset([...selectedMindset, tag]);
    }
  };

  const handleSave = () => {
    const today = new Date().toISOString().split('T')[0];

    // Build legs based on mode
    const legs: TradeLeg[] = [];
    const cs = condorEval.callSpread.shortStrike;
    const cl = condorEval.callSpread.longStrike;
    const ps = condorEval.putSpread.shortStrike;
    const pl = condorEval.putSpread.longStrike;
    const contracts = params.contracts;

    const includeCall = strategyMode !== 'put-spread';
    const includePut = strategyMode !== 'call-spread';
    const hasLongWings = strategyMode !== 'short-strangle';

    if (includeCall) {
      legs.push({ id: `leg-${Date.now()}-1`, type: 'call', position: 'sell', strike: cs, entryPrice: condorEval.callSpread.netCredit + (hasLongWings ? 0.15 : 0), contracts, status: 'open' });
      if (hasLongWings) {
        legs.push({ id: `leg-${Date.now()}-2`, type: 'call', position: 'buy', strike: cl, entryPrice: 0.15, contracts, status: 'open' });
      }
    }
    if (includePut) {
      legs.push({ id: `leg-${Date.now()}-3`, type: 'put', position: 'sell', strike: ps, entryPrice: condorEval.putSpread.netCredit + (hasLongWings ? 0.12 : 0), contracts, status: 'open' });
      if (hasLongWings) {
        legs.push({ id: `leg-${Date.now()}-4`, type: 'put', position: 'buy', strike: pl, entryPrice: 0.12, contracts, status: 'open' });
      }
    }

    const netCredit = condorEval.totalCreditPerShare;
    const totalPremium = condorEval.totalCreditDollars;
    const maxRisk = condorEval.maxLoss;

    const mappedStrategy: StrategyType =
      strategyMode === 'iron-condor'
        ? 'iron-condor'
        : strategyMode === 'iron-butterfly'
          ? 'iron-butterfly'
          : strategyMode === 'short-strangle'
            ? 'strangle'
            : strategyMode === 'call-spread'
              ? 'bear-call-spread'
              : 'bull-put-spread';

    const newEntry: JournalEntry = {
      id: `trade-${Date.now()}`,
      entryDate: today,
      symbol: params.symbol,
      strategyType: mappedStrategy,
      status: 'open',
      legs,
      adjustments: [],
      netCreditOrDebitPerShare: netCredit,
      totalPremiumDollars: totalPremium,
      feesAndCommissions: contracts * legs.length * 0.65, // ~$0.65 per contract fee standard
      unrealizedPnL: 0,
      maxRiskDollars: maxRisk,
      snapshotAtEntry: {
        spotPrice: params.spotPrice,
        atmIV: params.atmIV,
        dte: params.dte,
        expectedMove1Sigma: params.spotPrice * params.atmIV * Math.sqrt(params.dte / 365),
        expectedValueModel: condorEval.exactCombinedEV,
        greeks: condorEval.greeks
      },
      psychology: {
        confidence,
        mindsetTags: selectedMindset,
        rulesFollowed,
        planAdherenceScore: rulesFollowed ? 100 : 65,
        executionGrade
      },
      thesisNotes: thesis || `Logged directly from OptionsQuant Calculator. Modeled EV: ${formatCurrency(condorEval.exactCombinedEV)}. Net credit: ${formatCurrency(netCredit)}/sh.`,
      tags: ['calculator-logged', strategyMode]
    };

    onSaveTrade(newEntry);
    onClose();
  };

  return (
    <div className="md-dialog-backdrop" onClick={onClose}>
      <div className="md-dialog" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="md-dialog__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={22} color="var(--md-sys-color-primary)" />
            <h2 className="md-dialog__title">Log Trade to Journal (1-Click Bridge)</h2>
          </div>
          <button className="md-icon-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Quant Snapshot Banner */}
        <div className="md-card md-card--tonal" style={{ padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="title-medium">
              {params.symbol} — {strategyMode.replace(/-/g, ' ').toUpperCase()} ({params.contracts} contracts)
            </span>
            <span className="mono-medium" style={{ color: 'var(--quant-color-gain)' }}>
              +{formatCurrency(condorEval.totalCreditDollars)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--md-sys-color-on-surface-variant)' }}>
            <span>Spot: <strong className="mono-small">{formatCurrency(params.spotPrice)}</strong></span>
            <span>IV: <strong className="mono-small">{formatPercent(params.atmIV)}</strong></span>
            <span>DTE: <strong className="mono-small">{params.dte}d</strong></span>
            <span>POP: <strong className="mono-small">{formatPercent(condorEval.probMaxProfit)}</strong></span>
            <span>Model EV: <strong className="mono-small">{formatCurrency(condorEval.exactCombinedEV)}</strong></span>
          </div>
        </div>

        {/* Thesis & Setup */}
        <div className="md-field-group">
          <label htmlFor="log-calc-thesis" className="md-field-label">Trade Thesis & Catalyst Rationale</label>
          <textarea
            id="log-calc-thesis"
            name="thesis"
            className="md-textarea"
            style={{
              height: 80,
              padding: 10,
              width: '100%',
              resize: 'none',
              fontFamily: 'inherit',
              color: 'var(--md-sys-color-on-surface)',
              backgroundColor: 'var(--md-sys-color-surface-container)',
              border: '1px solid var(--md-sys-color-outline-variant)'
            }}
            placeholder="Why are you taking this trade? (e.g. Expected move boundary, IV expansion, key support test...)"
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
          />
        </div>

        {/* Confidence & Grade */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="md-field-group">
            <label htmlFor="log-calc-confidence" className="md-field-label">
              <span>Confidence Level</span>
              <span className="mono-small">{confidence} / 10</span>
            </label>
            <input
              id="log-calc-confidence"
              name="confidence"
              type="range"
              min="1"
              max="10"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--md-sys-color-primary)', marginTop: 8 }}
            />
          </div>

          <div className="md-field-group">
            <label htmlFor="log-calc-grade" className="md-field-label">Execution Grade</label>
            <select
              id="log-calc-grade"
              name="executionGrade"
              className="md-select"
              style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container)' }}
              value={executionGrade}
              onChange={(e) => setExecutionGrade(e.target.value as any)}
            >
              <option value="A+" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>A+ (Perfect Setup & Timing)</option>
              <option value="A" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>A (Followed Plan Strictly)</option>
              <option value="B+" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>B+ (Good Execution)</option>
              <option value="B" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>B (Minor Deviation)</option>
              <option value="C" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>C (Hesitant or Rushed)</option>
              <option value="D" style={{ color: 'var(--md-sys-color-on-surface)', backgroundColor: 'var(--md-sys-color-surface-container-high)' }}>D (Violated Core Rule)</option>
            </select>
          </div>
        </div>

        {/* Mindset Check-in */}
        <div>
          <label className="md-field-label" style={{ marginBottom: 8 }}>Mindset Check-in (Emotional State)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {availableTags.map((tag) => {
              const isSelected = selectedMindset.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={`md-button ${isSelected ? 'md-button--filled' : 'md-button--outlined'}`}
                  style={{ height: 28, padding: '0 10px', fontSize: 11, textTransform: 'capitalize' }}
                  onClick={() => toggleTag(tag)}
                >
                  {isSelected && <Check size={12} style={{ marginRight: 4 }} />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Plan adherence checkbox */}
        <div
          onClick={() => setRulesFollowed(!rulesFollowed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            padding: '10px 14px',
            borderRadius: 8,
            backgroundColor: rulesFollowed ? 'var(--quant-color-gain-container)' : 'var(--quant-color-loss-container)',
            color: rulesFollowed ? 'var(--quant-color-on-gain-container)' : 'var(--quant-color-on-loss-container)',
            fontSize: 13,
            fontWeight: 600
          }}
        >
          <ShieldCheck size={18} />
          <span>I confirm this trade strictly complies with my risk management plan (&lt; 2% capital risk)</span>
        </div>

        <div className="md-dialog__actions">
          <button className="md-button md-button--text" onClick={onClose}>
            Cancel
          </button>
          <button className="md-button md-button--filled" onClick={handleSave}>
            Log Trade to Journal
          </button>
        </div>
      </div>
    </div>
  );
};

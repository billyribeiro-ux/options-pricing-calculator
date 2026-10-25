import React from 'react';
import { IronCondorEvaluation } from '../quant/types';
import { formatCurrency, formatMultiplier, formatPercent, formatDelta } from '../utils/formatters';
import { DollarSign, Percent, ShieldCheck, AlertTriangle, Compass } from 'lucide-react';

interface KPICardsProps {
  condorEval: IronCondorEvaluation;
}

export const KPICards: React.FC<KPICardsProps> = ({ condorEval }) => {
  const isExactEVProfitable = condorEval.exactCombinedEV >= 0;

  return (
    <div className="grid-kpis">
      {/* 1. Net Credit */}
      <div className="md-card md-card--elevated">
        <div className="md-card__header" style={{ marginBottom: 8 }}>
          <span className="label-small" style={{ color: 'var(--md-sys-color-primary)' }}>TOTAL NET CREDIT</span>
          <DollarSign size={16} color="var(--md-sys-color-primary)" />
        </div>
        <div className="mono-large" style={{ color: 'var(--quant-color-gain)' }}>
          {formatCurrency(condorEval.totalCreditDollars)}
        </div>
        <div className="body-small" style={{ marginTop: 4, color: 'var(--md-sys-color-on-surface-variant)' }}>
          <span className="mono-small">{formatCurrency(condorEval.totalCreditPerShare)}</span> / share ({condorEval.callSpread.contracts} contracts)
        </div>
      </div>

      {/* 2. Probability of Profit (POP) */}
      <div className="md-card md-card--elevated">
        <div className="md-card__header" style={{ marginBottom: 8 }}>
          <span className="label-small" style={{ color: 'var(--md-sys-color-secondary)' }}>PROBABILITY OF PROFIT</span>
          <Percent size={16} color="var(--md-sys-color-secondary)" />
        </div>
        <div className="mono-large" style={{ color: 'var(--md-sys-color-on-surface)' }}>
          {formatPercent(condorEval.probMaxProfit)}
        </div>
        <div className="body-small" style={{ marginTop: 4, color: 'var(--md-sys-color-on-surface-variant)' }}>
          Breakevens: <span className="mono-small">${condorEval.breakevenLow.toFixed(2)}</span> — <span className="mono-small">${condorEval.breakevenHigh.toFixed(2)}</span>
        </div>
      </div>

      {/* 3. True Maximum Loss */}
      <div className="md-card md-card--elevated">
        <div className="md-card__header" style={{ marginBottom: 8 }}>
          <span className="label-small" style={{ color: 'var(--quant-color-loss)' }}>TRUE MAXIMUM RISK</span>
          <ShieldCheck size={16} color="var(--quant-color-loss)" />
        </div>
        <div className="mono-large" style={{ color: 'var(--quant-color-loss)' }}>
          -{formatCurrency(condorEval.maxLoss)}
        </div>
        <div className="body-small" style={{ marginTop: 4, color: 'var(--md-sys-color-on-surface-variant)' }}>
          Excel overstates by <span className="mono-small" style={{ color: 'var(--quant-color-loss)' }}>+${(condorEval.marginRequired - condorEval.maxLoss).toFixed(0)}</span>
        </div>
      </div>

      {/* 4. Exact Mathematical EV */}
      <div className="md-card md-card--elevated">
        <div className="md-card__header" style={{ marginBottom: 8 }}>
          <span className="label-small" style={{ color: 'var(--md-sys-color-tertiary)' }}>EXACT CONTINUOUS EV</span>
          <AlertTriangle size={16} color={isExactEVProfitable ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)'} />
        </div>
        <div
          className="mono-large"
          style={{ color: isExactEVProfitable ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}
        >
          {formatCurrency(condorEval.exactCombinedEV)}
        </div>
        <div className="body-small" style={{ marginTop: 4, color: 'var(--md-sys-color-on-surface-variant)' }}>
          Excel Model: <span className="mono-small" style={{ textDecoration: 'line-through' }}>{formatCurrency(condorEval.excelCombinedEV)}</span>
        </div>
      </div>

      {/* 5. Net Greeks */}
      <div className="md-card md-card--elevated">
        <div className="md-card__header" style={{ marginBottom: 8 }}>
          <span className="label-small" style={{ color: 'var(--md-sys-color-outline)' }}>NET POSITION GREEKS</span>
          <Compass size={16} color="var(--md-sys-color-outline)" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13 }}>
          <div>
            <span style={{ color: 'var(--md-sys-color-outline)' }}>Δ Delta: </span>
            <span className="mono-small">{formatDelta(condorEval.greeks.delta)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--md-sys-color-outline)' }}>Γ Gamma: </span>
            <span className="mono-small">{condorEval.greeks.gamma.toFixed(3)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--md-sys-color-outline)' }}>Θ Theta: </span>
            <span className="mono-small" style={{ color: condorEval.greeks.theta >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}>
              +{formatCurrency(condorEval.greeks.theta, 1)}/d
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--md-sys-color-outline)' }}>ν Vega: </span>
            <span className="mono-small">{formatCurrency(condorEval.greeks.vega, 1)}/%</span>
          </div>
        </div>
        <div className="body-small" style={{ marginTop: 4, color: 'var(--md-sys-color-on-surface-variant)' }}>
          RoR: <span className="mono-small">{formatPercent(condorEval.returnOnRisk)}</span> | Reward/Risk: <span className="mono-small">{formatMultiplier(condorEval.exactRewardRisk)}</span>
        </div>
      </div>
    </div>
  );
};

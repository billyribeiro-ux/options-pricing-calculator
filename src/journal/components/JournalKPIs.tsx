import React from 'react';
import { PerformanceKPIs } from '../types';
import { formatCurrency, formatPercent, formatMultiplier } from '../../utils/formatters';
import { TrendingUp, Percent, Target, Award, ArrowDownRight } from 'lucide-react';

interface JournalKPIsProps {
  kpis: PerformanceKPIs;
}

export const JournalKPIs: React.FC<JournalKPIsProps> = ({ kpis }) => {
  const isProfitable = kpis.totalNetPnL >= 0;

  return (
    <div className="grid-kpis">
      {/* 1. Cumulative Net P&L */}
      <div className="md-card md-card--elevated">
        <div className="md-card__header" style={{ marginBottom: 6 }}>
          <span className="label-small" style={{ color: 'var(--md-sys-color-primary)' }}>TOTAL REALIZED P&L</span>
          <TrendingUp size={16} color={isProfitable ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)'} />
        </div>
        <div
          className="mono-large"
          style={{ color: isProfitable ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}
        >
          {formatCurrency(kpis.totalNetPnL)}
        </div>
        <div className="body-small" style={{ marginTop: 4, color: 'var(--md-sys-color-on-surface-variant)' }}>
          Gross Wins: <span className="mono-small" style={{ color: 'var(--quant-color-gain)' }}>+{formatCurrency(kpis.grossWins, 0)}</span> | Losses: <span className="mono-small" style={{ color: 'var(--quant-color-loss)' }}>-{formatCurrency(kpis.grossLosses, 0)}</span>
        </div>
      </div>

      {/* 2. Win Rate */}
      <div className="md-card md-card--elevated">
        <div className="md-card__header" style={{ marginBottom: 6 }}>
          <span className="label-small" style={{ color: 'var(--md-sys-color-secondary)' }}>WIN RATE & COUNT</span>
          <Percent size={16} color="var(--md-sys-color-secondary)" />
        </div>
        <div className="mono-large" style={{ color: 'var(--md-sys-color-on-surface)' }}>
          {formatPercent(kpis.winRate)}
        </div>
        <div className="body-small" style={{ marginTop: 4, color: 'var(--md-sys-color-on-surface-variant)' }}>
          <span className="mono-small">{kpis.winningTrades}W</span> — <span className="mono-small">{kpis.losingTrades}L</span> ({kpis.totalTrades} total trades)
        </div>
      </div>

      {/* 3. Profit Factor & Expectancy */}
      <div className="md-card md-card--elevated">
        <div className="md-card__header" style={{ marginBottom: 6 }}>
          <span className="label-small" style={{ color: 'var(--md-sys-color-tertiary)' }}>PROFIT FACTOR</span>
          <Target size={16} color="var(--md-sys-color-tertiary)" />
        </div>
        <div className="mono-large" style={{ color: 'var(--md-sys-color-on-surface)' }}>
          {formatMultiplier(kpis.profitFactor)}
        </div>
        <div className="body-small" style={{ marginTop: 4, color: 'var(--md-sys-color-on-surface-variant)' }}>
          Expectancy: <span className="mono-small">{formatCurrency(kpis.expectancyDollars)}</span> / trade
        </div>
      </div>

      {/* 4. Maximum Drawdown */}
      <div className="md-card md-card--elevated">
        <div className="md-card__header" style={{ marginBottom: 6 }}>
          <span className="label-small" style={{ color: 'var(--quant-color-loss)' }}>MAX DRAWDOWN</span>
          <ArrowDownRight size={16} color="var(--quant-color-loss)" />
        </div>
        <div className="mono-large" style={{ color: 'var(--quant-color-loss)' }}>
          -{formatCurrency(kpis.maxDrawdownDollars)}
        </div>
        <div className="body-small" style={{ marginTop: 4, color: 'var(--md-sys-color-on-surface-variant)' }}>
          Depth: <span className="mono-small">{kpis.maxDrawdownPercent.toFixed(1)}%</span> | Sharpe: <span className="mono-small">{kpis.sharpeRatio.toFixed(2)}</span>
        </div>
      </div>

      {/* 5. Discipline & Rules Adherence */}
      <div className="md-card md-card--elevated">
        <div className="md-card__header" style={{ marginBottom: 6 }}>
          <span className="label-small" style={{ color: 'var(--quant-color-gain)' }}>DISCIPLINE SCORE</span>
          <Award size={16} color="var(--quant-color-gain)" />
        </div>
        <div className="mono-large" style={{ color: 'var(--quant-color-gain)' }}>
          {kpis.disciplineScore.toFixed(0)}%
        </div>
        <div className="body-small" style={{ marginTop: 4, color: 'var(--md-sys-color-on-surface-variant)' }}>
          Followed trading plan & risk limits
        </div>
      </div>
    </div>
  );
};

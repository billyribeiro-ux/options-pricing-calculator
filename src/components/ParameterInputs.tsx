import React from 'react';
import { UnderlyingParams, VolatilityBands } from '../quant/types';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { Activity, ShieldAlert, Zap } from 'lucide-react';

interface ParameterInputsProps {
  params: UnderlyingParams;
  volBands: VolatilityBands;
  onChangeParams: (newParams: Partial<UnderlyingParams>) => void;
}

export const ParameterInputs: React.FC<ParameterInputsProps> = ({
  params,
  volBands,
  onChangeParams
}) => {
  return (
    <div className="md-card md-card--elevated">
      <div className="md-card__header">
        <h3 className="md-card__title">
          <Activity size={18} color="var(--md-sys-color-primary)" />
          Underlying Parameters & Volatility
        </h3>
        <span className="label-small" style={{ color: 'var(--md-sys-color-outline)' }}>
          Excel Rows 8–16
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        {/* Ticker */}
        <div className="md-field-group">
          <label className="md-field-label">Stock Ticker</label>
          <div className="md-input-wrapper">
            <input
              type="text"
              className="md-input"
              value={params.symbol}
              onChange={(e) => onChangeParams({ symbol: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        {/* Spot Price */}
        <div className="md-field-group">
          <label className="md-field-label">Current Price</label>
          <div className="md-input-wrapper">
            <span className="md-input-prefix">$</span>
            <input
              type="number"
              step="1"
              className="md-input"
              value={params.spotPrice}
              onChange={(e) => onChangeParams({ spotPrice: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* ATM IV */}
        <div className="md-field-group">
          <label className="md-field-label">ATM Implied Vol</label>
          <div className="md-input-wrapper">
            <input
              type="number"
              step="0.001"
              className="md-input"
              value={params.atmIV}
              onChange={(e) => onChangeParams({ atmIV: parseFloat(e.target.value) || 0.001 })}
            />
            <span className="md-input-suffix">{(params.atmIV * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Days to Expiry */}
        <div className="md-field-group">
          <label className="md-field-label">Days 'til Expiry</label>
          <div className="md-input-wrapper">
            <input
              type="number"
              step="1"
              min="1"
              className="md-input"
              value={params.dte}
              onChange={(e) => onChangeParams({ dte: parseInt(e.target.value, 10) || 1 })}
            />
            <span className="md-input-suffix">DTE</span>
          </div>
        </div>

        {/* Contracts */}
        <div className="md-field-group">
          <label className="md-field-label">Contracts</label>
          <div className="md-input-wrapper">
            <input
              type="number"
              step="1"
              min="1"
              className="md-input"
              value={params.contracts}
              onChange={(e) => onChangeParams({ contracts: parseInt(e.target.value, 10) || 1 })}
            />
          </div>
        </div>

        {/* Strike Gap */}
        <div className="md-field-group">
          <label className="md-field-label">Strike Gaps</label>
          <div className="md-input-wrapper">
            <span className="md-input-prefix">$</span>
            <input
              type="number"
              step="1"
              min="0.5"
              className="md-input"
              value={params.strikeGap}
              onChange={(e) => onChangeParams({ strikeGap: parseFloat(e.target.value) || 1 })}
            />
          </div>
        </div>
      </div>

      {/* Volatility Bands Cards */}
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {/* 1 Std Dev */}
        <div className="md-card md-card--tonal" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="label-small" style={{ color: 'var(--md-sys-color-primary)' }}>1 STD DEV MOVE (68.3%)</span>
            <ShieldAlert size={14} color="var(--md-sys-color-primary)" />
          </div>
          <div className="mono-medium" style={{ color: 'var(--md-sys-color-on-surface)' }}>
            ±{formatCurrency(volBands.oneStdDevMove)}
          </div>
          <div className="body-small" style={{ marginTop: 2, color: 'var(--md-sys-color-on-surface-variant)' }}>
            Range: <span className="mono-small">{formatCurrency(volBands.lower1Sigma, 0)}</span> — <span className="mono-small">{formatCurrency(volBands.upper1Sigma, 0)}</span>
          </div>
        </div>

        {/* 2 Std Dev */}
        <div className="md-card md-card--tonal" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="label-small" style={{ color: 'var(--md-sys-color-secondary)' }}>2 STD DEV MOVE (95.4%)</span>
            <ShieldAlert size={14} color="var(--md-sys-color-secondary)" />
          </div>
          <div className="mono-medium" style={{ color: 'var(--md-sys-color-on-surface)' }}>
            ±{formatCurrency(volBands.twoStdDevMove)}
          </div>
          <div className="body-small" style={{ marginTop: 2, color: 'var(--md-sys-color-on-surface-variant)' }}>
            Range: <span className="mono-small">{formatCurrency(volBands.lower2Sigma, 0)}</span> — <span className="mono-small">{formatCurrency(volBands.upper2Sigma, 0)}</span>
          </div>
        </div>

        {/* Market Maker Move */}
        <div className="md-card md-card--tonal" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span className="label-small" style={{ color: 'var(--md-sys-color-tertiary)' }}>MKT MAKER MOVE</span>
            <Zap size={14} color="var(--md-sys-color-tertiary)" />
          </div>
          <div className="mono-medium" style={{ color: 'var(--md-sys-color-on-surface)' }}>
            ±{formatCurrency(volBands.marketMakerMove)}
          </div>
          <div className="body-small" style={{ marginTop: 2, color: 'var(--md-sys-color-on-surface-variant)' }}>
            Straddle: <span className="mono-small">${formatNumber(params.atmStraddleAsk ?? 6.80)}</span> × <span className="mono-small">0.85x</span>
          </div>
        </div>
      </div>
    </div>
  );
};

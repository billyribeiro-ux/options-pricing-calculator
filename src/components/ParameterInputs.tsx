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

      <div className="grid-params">
        {/* Ticker */}
        <div className="md-field-group">
          <label htmlFor="param-symbol" className="md-field-label">Stock Ticker</label>
          <div className="md-input-wrapper">
            <input
              id="param-symbol"
              name="symbol"
              type="text"
              className="md-input"
              value={params.symbol}
              onChange={(e) => onChangeParams({ symbol: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        {/* Spot Price */}
        <div className="md-field-group">
          <label htmlFor="param-spot-price" className="md-field-label">Current Price</label>
          <div className="md-input-wrapper">
            <span className="md-input-prefix">$</span>
            <input
              id="param-spot-price"
              name="spotPrice"
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
          <label htmlFor="param-atm-iv" className="md-field-label">ATM Implied Vol</label>
          <div className="md-input-wrapper">
            <input
              id="param-atm-iv"
              name="atmIV"
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
          <label htmlFor="param-dte" className="md-field-label">Days 'til Expiry</label>
          <div className="md-input-wrapper">
            <input
              id="param-dte"
              name="dte"
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
          <label htmlFor="param-contracts" className="md-field-label">Contracts</label>
          <div className="md-input-wrapper">
            <input
              id="param-contracts"
              name="contracts"
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
          <label htmlFor="param-strike-gap" className="md-field-label">Strike Gaps</label>
          <div className="md-input-wrapper">
            <span className="md-input-prefix">$</span>
            <input
              id="param-strike-gap"
              name="strikeGap"
              type="number"
              step="1"
              min="0.5"
              className="md-input"
              value={params.strikeGap}
              onChange={(e) => onChangeParams({ strikeGap: parseFloat(e.target.value) || 1 })}
            />
          </div>
        </div>

        {/* ATM Straddle Ask (Row 15) */}
        <div className="md-field-group">
          <label htmlFor="param-straddle-ask" className="md-field-label">ATM Straddle Ask</label>
          <div className="md-input-wrapper">
            <span className="md-input-prefix">$</span>
            <input
              id="param-straddle-ask"
              name="atmStraddleAsk"
              type="number"
              step="0.05"
              min="0"
              className="md-input"
              value={params.atmStraddleAsk ?? 6.80}
              onChange={(e) => onChangeParams({ atmStraddleAsk: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* Straddle Factor */}
        <div className="md-field-group">
          <label htmlFor="param-straddle-factor" className="md-field-label">Straddle Factor</label>
          <div className="md-input-wrapper">
            <input
              id="param-straddle-factor"
              name="straddleFactor"
              type="number"
              step="0.05"
              min="0.1"
              max="2.0"
              className="md-input"
              value={params.straddleFactor ?? 0.85}
              onChange={(e) => onChangeParams({ straddleFactor: parseFloat(e.target.value) || 0.85 })}
            />
            <span className="md-input-suffix">×</span>
          </div>
        </div>

        {/* Risk-Free Rate */}
        <div className="md-field-group">
          <label htmlFor="param-risk-free-rate" className="md-field-label">Risk-Free Rate (r)</label>
          <div className="md-input-wrapper">
            <input
              id="param-risk-free-rate"
              name="riskFreeRate"
              type="number"
              step="0.25"
              className="md-input"
              value={Number((params.riskFreeRate * 100).toFixed(2))}
              onChange={(e) => onChangeParams({ riskFreeRate: (parseFloat(e.target.value) || 0) / 100 })}
            />
            <span className="md-input-suffix">%</span>
          </div>
        </div>

        {/* Dividend Yield */}
        <div className="md-field-group">
          <label htmlFor="param-dividend-yield" className="md-field-label">Dividend Yield (q)</label>
          <div className="md-input-wrapper">
            <input
              id="param-dividend-yield"
              name="dividendYield"
              type="number"
              step="0.1"
              className="md-input"
              value={Number((params.dividendYield * 100).toFixed(2))}
              onChange={(e) => onChangeParams({ dividendYield: (parseFloat(e.target.value) || 0) / 100 })}
            />
            <span className="md-input-suffix">%</span>
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
            Range: <span className="mono-small">{formatCurrency(volBands.lower1Sigma, 2)}</span> — <span className="mono-small">{formatCurrency(volBands.upper1Sigma, 2)}</span>
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
            Range: <span className="mono-small">{formatCurrency(volBands.lower2Sigma, 2)}</span> — <span className="mono-small">{formatCurrency(volBands.upper2Sigma, 2)}</span>
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
            Straddle: <span className="mono-small">${formatNumber(params.atmStraddleAsk ?? 6.80)}</span> × <span className="mono-small">{(params.straddleFactor ?? 0.85).toFixed(2)}x</span> ({formatCurrency(params.spotPrice - volBands.marketMakerMove, 1)}–{formatCurrency(params.spotPrice + volBands.marketMakerMove, 1)})
          </div>
        </div>
      </div>
    </div>
  );
};

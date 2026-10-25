import React from 'react';
import { IronCondorEvaluation, UnderlyingParams } from '../quant/types';
import { formatCurrency, formatMultiplier } from '../utils/formatters';
import { Sliders, Sparkles, TrendingUp, TrendingDown, Zap } from 'lucide-react';

export type StrategyMode = 'iron-condor' | 'call-spread' | 'put-spread';

interface StrategyBuilderProps {
  mode: StrategyMode;
  onChangeMode: (mode: StrategyMode) => void;
  callShort: number;
  callLong: number;
  callCredit: number;
  putShort: number;
  putLong: number;
  putCredit: number;
  onChangeCallSpread: (short: number, long: number, credit: number) => void;
  onChangePutSpread: (short: number, long: number, credit: number) => void;
  condorEval: IronCondorEvaluation;
  params: UnderlyingParams;
  onOpenLogModal: () => void;
}

export const StrategyBuilder: React.FC<StrategyBuilderProps> = ({
  mode,
  onChangeMode,
  callShort,
  callLong,
  callCredit,
  putShort,
  putLong,
  putCredit,
  onChangeCallSpread,
  onChangePutSpread,
  condorEval,
  params,
  onOpenLogModal
}) => {
  const gap = params.strikeGap;

  const handleSolveCallFairCredit = () => {
    onChangeCallSpread(callShort, callLong, parseFloat(condorEval.callSpread.exactPrice1to1.toFixed(2)));
  };

  const handleSolvePutFairCredit = () => {
    onChangePutSpread(putShort, putLong, parseFloat(condorEval.putSpread.exactPrice1to1.toFixed(2)));
  };

  return (
    <div className="md-card md-card--elevated">
      <div className="md-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 className="md-card__title">
            <Sliders size={18} color="var(--md-sys-color-primary)" />
            Strategy Architecture
          </h3>
          <div className="md-segmented-button">
            <button
              className={`md-segmented-button__segment ${mode === 'iron-condor' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => onChangeMode('iron-condor')}
            >
              Iron Condor
            </button>
            <button
              className={`md-segmented-button__segment ${mode === 'call-spread' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => onChangeMode('call-spread')}
            >
              Call Spread
            </button>
            <button
              className={`md-segmented-button__segment ${mode === 'put-spread' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => onChangeMode('put-spread')}
            >
              Put Spread
            </button>
          </div>
        </div>

        {/* 1-Click Calculator to Journal Bridge Button */}
        <button
          className="md-button md-button--filled"
          style={{ height: 32, padding: '0 12px', fontSize: 12, backgroundColor: 'var(--quant-color-gain)' }}
          onClick={onOpenLogModal}
          title="Log this strategy directly into the Trader Journal"
        >
          <Zap size={14} />
          <span>Log to Journal</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mode === 'iron-condor' ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Call Spread Wing */}
        {(mode === 'iron-condor' || mode === 'call-spread') && (
          <div className="md-card md-card--tonal" style={{ borderLeft: '4px solid var(--quant-color-loss)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingDown size={18} color="var(--quant-color-loss)" />
                <span className="title-medium">Bear Call Spread (Short Wing)</span>
              </div>
              <button
                className="md-button md-button--text"
                onClick={handleSolveCallFairCredit}
                title="Auto-fill Credit with 1:1 EV Fair Price"
                style={{ fontSize: 11, height: 28, padding: '0 8px' }}
              >
                <Sparkles size={12} />
                <span>Fair Credit (${condorEval.callSpread.exactPrice1to1.toFixed(2)})</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div className="md-field-group">
                <label className="md-field-label">Short Call</label>
                <div className="md-input-wrapper">
                  <span className="md-input-prefix">$</span>
                  <input
                    type="number"
                    step={gap}
                    className="md-input"
                    value={callShort}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onChangeCallSpread(val, val + gap, callCredit);
                    }}
                  />
                </div>
              </div>

              <div className="md-field-group">
                <label className="md-field-label">Long Call (Hedge)</label>
                <div className="md-input-wrapper">
                  <span className="md-input-prefix">$</span>
                  <input
                    type="number"
                    step={gap}
                    className="md-input"
                    value={callLong}
                    onChange={(e) => onChangeCallSpread(callShort, parseFloat(e.target.value) || 0, callCredit)}
                  />
                </div>
              </div>

              <div className="md-field-group">
                <label className="md-field-label">Net Credit</label>
                <div className="md-input-wrapper">
                  <span className="md-input-prefix">$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="md-input"
                    value={callCredit}
                    onChange={(e) => onChangeCallSpread(callShort, callLong, parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
              <div>
                <span style={{ color: 'var(--md-sys-color-outline)' }}>P(ITM): </span>
                <span className="mono-small">{(condorEval.callSpread.probITM * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span style={{ color: 'var(--md-sys-color-outline)' }}>Exact EV: </span>
                <span
                  className="mono-small"
                  style={{ color: condorEval.callSpread.exactEV >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}
                >
                  {formatCurrency(condorEval.callSpread.exactEV)}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--md-sys-color-outline)' }}>Reward/Risk: </span>
                <span className="mono-small">{formatMultiplier(condorEval.callSpread.exactRewardRisk)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Put Spread Wing */}
        {(mode === 'iron-condor' || mode === 'put-spread') && (
          <div className="md-card md-card--tonal" style={{ borderLeft: '4px solid var(--quant-color-gain)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={18} color="var(--quant-color-gain)" />
                <span className="title-medium">Bull Put Spread (Short Wing)</span>
              </div>
              <button
                className="md-button md-button--text"
                onClick={handleSolvePutFairCredit}
                title="Auto-fill Credit with 1:1 EV Fair Price"
                style={{ fontSize: 11, height: 28, padding: '0 8px' }}
              >
                <Sparkles size={12} />
                <span>Fair Credit (${condorEval.putSpread.exactPrice1to1.toFixed(2)})</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div className="md-field-group">
                <label className="md-field-label">Short Put</label>
                <div className="md-input-wrapper">
                  <span className="md-input-prefix">$</span>
                  <input
                    type="number"
                    step={gap}
                    className="md-input"
                    value={putShort}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onChangePutSpread(val, val - gap, putCredit);
                    }}
                  />
                </div>
              </div>

              <div className="md-field-group">
                <label className="md-field-label">Long Put (Hedge)</label>
                <div className="md-input-wrapper">
                  <span className="md-input-prefix">$</span>
                  <input
                    type="number"
                    step={gap}
                    className="md-input"
                    value={putLong}
                    onChange={(e) => onChangePutSpread(putShort, parseFloat(e.target.value) || 0, putCredit)}
                  />
                </div>
              </div>

              <div className="md-field-group">
                <label className="md-field-label">Net Credit</label>
                <div className="md-input-wrapper">
                  <span className="md-input-prefix">$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="md-input"
                    value={putCredit}
                    onChange={(e) => onChangePutSpread(putShort, putLong, parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
              <div>
                <span style={{ color: 'var(--md-sys-color-outline)' }}>P(ITM): </span>
                <span className="mono-small">{(condorEval.putSpread.probITM * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span style={{ color: 'var(--md-sys-color-outline)' }}>Exact EV: </span>
                <span
                  className="mono-small"
                  style={{ color: condorEval.putSpread.exactEV >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}
                >
                  {formatCurrency(condorEval.putSpread.exactEV)}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--md-sys-color-outline)' }}>Reward/Risk: </span>
                <span className="mono-small">{formatMultiplier(condorEval.putSpread.exactRewardRisk)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

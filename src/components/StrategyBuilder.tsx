import React from 'react';
import { IronCondorEvaluation, StrategyMode, UnderlyingParams } from '../quant/types';
import { findStrikeByDelta, estimateSpreadCredit } from '../quant/blackScholes';
import { formatCurrency, formatMultiplier } from '../utils/formatters';
import { Sliders, Sparkles, TrendingUp, TrendingDown, Zap, Crosshair } from 'lucide-react';

export type { StrategyMode };

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

  const handleApplyDeltaPreset = (targetDelta: number) => {
    if (params.spotPrice <= 0) return;
    const optCallShort = findStrikeByDelta('call', targetDelta, params);
    const optPutShort = findStrikeByDelta('put', targetDelta, params);
    const nextCallLong = optCallShort + gap;
    const nextPutLong = optPutShort - gap;
    const hasWings = mode !== 'short-strangle';
    onChangeCallSpread(optCallShort, nextCallLong, estimateSpreadCredit('call', optCallShort, nextCallLong, params, hasWings));
    onChangePutSpread(optPutShort, nextPutLong, estimateSpreadCredit('put', optPutShort, nextPutLong, params, hasWings));
  };

  const handleSelectMode = (nextMode: StrategyMode) => {
    onChangeMode(nextMode);
    if (params.spotPrice <= 0) return;
    const hasWings = nextMode !== 'short-strangle';
    if (nextMode === 'iron-butterfly') {
      const atmStrike = Math.round(params.spotPrice / gap) * gap;
      const cl = atmStrike + gap * 2;
      const pl = atmStrike - gap * 2;
      onChangeCallSpread(atmStrike, cl, estimateSpreadCredit('call', atmStrike, cl, params, true));
      onChangePutSpread(atmStrike, pl, estimateSpreadCredit('put', atmStrike, pl, params, true));
    } else if (callShort > 0 && putShort > 0) {
      onChangeCallSpread(callShort, callLong, estimateSpreadCredit('call', callShort, callLong, params, hasWings));
      onChangePutSpread(putShort, putLong, estimateSpreadCredit('put', putShort, putLong, params, hasWings));
    }
  };

  const showCallWing = mode !== 'put-spread';
  const showPutWing = mode !== 'call-spread';
  const isStrangle = mode === 'short-strangle';

  return (
    <div className="md-card md-card--elevated">
      <div className="md-card__header" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 className="md-card__title">
            <Sliders size={18} color="var(--md-sys-color-primary)" />
            Strategy Architecture
          </h3>
          <div className="md-segmented-button" style={{ flexWrap: 'wrap' }}>
            <button
              className={`md-segmented-button__segment ${mode === 'iron-condor' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => handleSelectMode('iron-condor')}
            >
              Iron Condor
            </button>
            <button
              className={`md-segmented-button__segment ${mode === 'iron-butterfly' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => handleSelectMode('iron-butterfly')}
              title="ATM Short Straddle + OTM Long Wings"
            >
              Iron Butterfly
            </button>
            <button
              className={`md-segmented-button__segment ${mode === 'short-strangle' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => handleSelectMode('short-strangle')}
              title="Undefined-Risk OTM Short Call & Short Put"
            >
              Short Strangle
            </button>
            <button
              className={`md-segmented-button__segment ${mode === 'call-spread' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => handleSelectMode('call-spread')}
            >
              Call Spread
            </button>
            <button
              className={`md-segmented-button__segment ${mode === 'put-spread' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => handleSelectMode('put-spread')}
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

      {/* 1-Click Target Delta Strike Auto-Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          padding: '6px 12px',
          borderRadius: 8,
          backgroundColor: 'var(--md-sys-color-surface-container)',
          fontSize: 11
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--md-sys-color-on-surface-variant)' }}>
          <Crosshair size={13} color="var(--md-sys-color-primary)" />
          <span style={{ fontWeight: 600 }}>Auto-Position Short Strikes by Delta:</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { label: '10Δ Far OTM', delta: 0.10 },
            { label: '16Δ (1σ Standard)', delta: 0.16 },
            { label: '20Δ Balanced', delta: 0.20 },
            { label: '30Δ Aggressive', delta: 0.30 }
          ].map((preset) => (
            <button
              key={preset.delta}
              type="button"
              className="md-button md-button--tonal"
              style={{ height: 24, padding: '0 8px', fontSize: 11 }}
              onClick={() => handleApplyDeltaPreset(preset.delta)}
              title={`Automatically snap Short Call & Short Put to ${preset.delta * 100} Delta`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-wings">
        {/* Call Spread Wing */}
        {showCallWing && (
          <div className="md-card md-card--tonal" style={{ borderLeft: '2px solid rgba(255, 86, 48, 0.35)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingDown size={18} color="var(--quant-color-loss)" />
                <span className="title-medium">
                  {isStrangle ? 'Short Call Leg (Naked Wing)' : 'Bear Call Spread (Short Wing)'}
                </span>
              </div>
              <button
                type="button"
                className="md-button md-button--text"
                onClick={handleSolveCallFairCredit}
                title="Auto-fill Credit with 1:1 EV Fair Price"
                style={{ fontSize: 11, height: 28, padding: '0 8px' }}
              >
                <Sparkles size={12} />
                <span>Fair Credit (${condorEval.callSpread.exactPrice1to1.toFixed(2)})</span>
              </button>
            </div>

            <div className="grid-wing-inputs">
              <div className="md-field-group">
                <label htmlFor="strat-short-call" className="md-field-label">Short Call</label>
                <div className="md-input-wrapper">
                  <span className="md-input-prefix">$</span>
                  <input
                    id="strat-short-call"
                    name="shortCall"
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

              {!isStrangle && (
                <div className="md-field-group">
                  <label htmlFor="strat-long-call" className="md-field-label">Long Call (Hedge)</label>
                  <div className="md-input-wrapper">
                    <span className="md-input-prefix">$</span>
                    <input
                      id="strat-long-call"
                      name="longCall"
                      type="number"
                      step={gap}
                      className="md-input"
                      value={callLong}
                      onChange={(e) => onChangeCallSpread(callShort, parseFloat(e.target.value) || 0, callCredit)}
                    />
                  </div>
                </div>
              )}

              <div className="md-field-group">
                <label htmlFor="strat-call-credit" className="md-field-label">Net Credit</label>
                <div className="md-input-wrapper">
                  <span className="md-input-prefix">$</span>
                  <input
                    id="strat-call-credit"
                    name="callCredit"
                    type="number"
                    step="0.01"
                    className="md-input"
                    value={callCredit}
                    onChange={(e) => onChangeCallSpread(callShort, callLong, parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 12, fontSize: 12 }}>
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
        {showPutWing && (
          <div className="md-card md-card--tonal" style={{ borderLeft: '2px solid rgba(54, 179, 126, 0.35)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={18} color="var(--quant-color-gain)" />
                <span className="title-medium">
                  {isStrangle ? 'Short Put Leg (Naked Wing)' : 'Bull Put Spread (Short Wing)'}
                </span>
              </div>
              <button
                type="button"
                className="md-button md-button--text"
                onClick={handleSolvePutFairCredit}
                title="Auto-fill Credit with 1:1 EV Fair Price"
                style={{ fontSize: 11, height: 28, padding: '0 8px' }}
              >
                <Sparkles size={12} />
                <span>Fair Credit (${condorEval.putSpread.exactPrice1to1.toFixed(2)})</span>
              </button>
            </div>

            <div className="grid-wing-inputs">
              <div className="md-field-group">
                <label htmlFor="strat-short-put" className="md-field-label">Short Put</label>
                <div className="md-input-wrapper">
                  <span className="md-input-prefix">$</span>
                  <input
                    id="strat-short-put"
                    name="shortPut"
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

              {!isStrangle && (
                <div className="md-field-group">
                  <label htmlFor="strat-long-put" className="md-field-label">Long Put (Hedge)</label>
                  <div className="md-input-wrapper">
                    <span className="md-input-prefix">$</span>
                    <input
                      id="strat-long-put"
                      name="longPut"
                      type="number"
                      step={gap}
                      className="md-input"
                      value={putLong}
                      onChange={(e) => onChangePutSpread(putShort, parseFloat(e.target.value) || 0, putCredit)}
                    />
                  </div>
                </div>
              )}

              <div className="md-field-group">
                <label htmlFor="strat-put-credit" className="md-field-label">Net Credit</label>
                <div className="md-input-wrapper">
                  <span className="md-input-prefix">$</span>
                  <input
                    id="strat-put-credit"
                    name="putCredit"
                    type="number"
                    step="0.01"
                    className="md-input"
                    value={putCredit}
                    onChange={(e) => onChangePutSpread(putShort, putLong, parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 12, fontSize: 12 }}>
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

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { IronCondorEvaluation, UnderlyingParams } from '../quant/types';
import { runMonteCarloSimulation, MonteCarloResult, SimulationRegime } from '../quant/monteCarlo';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { Dna, RefreshCw, BarChart2, ShieldCheck } from 'lucide-react';

interface MonteCarloViewProps {
  condorEval: IronCondorEvaluation;
  params: UnderlyingParams;
}

export const MonteCarloView: React.FC<MonteCarloViewProps> = ({ condorEval, params }) => {
  const [simCount, setSimCount] = useState<number>(10000);
  const [seed, setSeed] = useState<number>(42);
  const [regime, setRegime] = useState<SimulationRegime>('gbm');
  const [takeProfitPct, setTakeProfitPct] = useState<number | null>(null);
  const [stopLossMultiple, setStopLossMultiple] = useState<number | null>(null);

  const cs = condorEval.callSpread.shortStrike;
  const cl = condorEval.callSpread.longStrike;
  const ps = condorEval.putSpread.shortStrike;
  const pl = condorEval.putSpread.longStrike;

  const includeCall = condorEval.mode !== 'put-spread';
  const includePut = condorEval.mode !== 'call-spread';

  // Run simulation with Seeded Antithetic Variates & Path-Dependent Management Rules
  const result: MonteCarloResult = useMemo(() => {
    return runMonteCarloSimulation(
      params.spotPrice,
      params.dte,
      params.atmIV,
      cs,
      cl,
      ps,
      pl,
      condorEval.totalCreditDollars,
      params.contracts,
      simCount,
      params.riskFreeRate,
      params.dividendYield,
      condorEval.mode,
      {
        seed,
        regime,
        takeProfitPct,
        stopLossMultiple
      }
    );
  }, [
    params.spotPrice,
    params.dte,
    params.atmIV,
    cs,
    cl,
    ps,
    pl,
    condorEval.totalCreditDollars,
    params.contracts,
    params.riskFreeRate,
    params.dividendYield,
    condorEval.mode,
    simCount,
    seed,
    regime,
    takeProfitPct,
    stopLossMultiple
  ]);

  // Path Canvas Ref
  const pathCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = pathCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const padLeft = 40;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Price range across sample paths
    let minP = params.spotPrice;
    let maxP = params.spotPrice;
    result.pricePathsSample.forEach((path: number[]) => {
      path.forEach((p: number) => {
        if (p < minP) minP = p;
        if (p > maxP) maxP = p;
      });
    });

    minP = Math.min(minP, pl - 5);
    maxP = Math.max(maxP, cl + 5);

    const xToPx = (stepIdx: number) => padLeft + (stepIdx / 10) * plotW;
    const yToPx = (p: number) => padTop + ((maxP - p) / (maxP - minP)) * plotH;

    // Draw Strike Boundaries with non-overlapping pill badges
    const drawBound = (strike: number, label: string, color: string, position: 'above' | 'below') => {
      const y = yToPx(strike);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.setLineDash([]);

      const text = `${label} $${strike}`;
      ctx.font = '600 10px "JetBrains Mono", monospace';
      const tw = ctx.measureText(text).width + 10;
      const th = 15;
      const bx = width - padRight - tw - 4;
      const by = position === 'above' ? Math.max(padTop, y - th - 3) : Math.min(height - padBottom - th, y + 3);

      ctx.fillStyle = 'rgba(17, 19, 24, 0.85)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, tw, th, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + tw / 2, by + th / 2 + 0.5);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    };

    if (includeCall) drawBound(cs, 'Short Call', '#ff5630', 'above');
    if (includePut) drawBound(ps, 'Short Put', '#36b37e', 'below');

    // Draw Trajectories
    result.pricePathsSample.forEach((path: number[]) => {
      ctx.beginPath();
      const endPrice = path[path.length - 1];
      const isProfitable = (!includePut || endPrice >= condorEval.breakevenLow) && (!includeCall || endPrice <= condorEval.breakevenHigh);
      ctx.strokeStyle = isProfitable ? 'rgba(54, 179, 126, 0.45)' : 'rgba(255, 86, 48, 0.45)';
      ctx.lineWidth = 1.2;

      path.forEach((p: number, idx: number) => {
        const x = xToPx(idx);
        const y = yToPx(p);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // Time Axis
    ctx.fillStyle = 'rgba(128,128,128,0.8)';
    ctx.font = '10px sans-serif';
    ctx.fillText('Day 0', padLeft, height - 10);
    ctx.fillText(`Day ${params.dte} (Expiry)`, width - padRight - 70, height - 10);
  }, [result, params.spotPrice, params.dte, cs, cl, ps, pl, includeCall, includePut, condorEval.breakevenLow, condorEval.breakevenHigh]);

  return (
    <div className="md-card md-card--elevated" style={{ gap: 20 }}>
      <div className="md-card__header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 className="md-card__title">
            <Dna size={18} color="var(--md-sys-color-primary)" />
            Monte Carlo Risk Simulation ({simCount.toLocaleString()} Paths)
          </h3>
          <div className="md-segmented-button">
            <button
              className={`md-segmented-button__segment ${regime === 'gbm' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => setRegime('gbm')}
              title="Standard Geometric Brownian Motion with Antithetic Variates"
            >
              GBM (Lognormal)
            </button>
            <button
              className={`md-segmented-button__segment ${regime === 'jump-diffusion' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => setRegime('jump-diffusion')}
              title="Merton Jump-Diffusion with Poisson Tail Crash Shocks"
            >
              Jump-Diffusion (Fat-Tail)
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor="mc-take-profit" className="label-small" style={{ color: 'var(--md-sys-color-outline)' }}>
              Take-Profit:
            </label>
            <select
              id="mc-take-profit"
              name="takeProfitPct"
              className="md-select"
              style={{ height: 32, fontSize: 12, padding: '0 8px', borderRadius: 8 }}
              value={takeProfitPct === null ? 'none' : String(takeProfitPct)}
              onChange={(e) => setTakeProfitPct(e.target.value === 'none' ? null : parseFloat(e.target.value))}
            >
              <option value="none">Hold to Expiry</option>
              <option value="0.25">25% Max Profit</option>
              <option value="0.5">50% Profit (Tasty Rule)</option>
              <option value="0.75">75% Max Profit</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor="mc-stop-loss" className="label-small" style={{ color: 'var(--md-sys-color-outline)' }}>
              Stop-Loss:
            </label>
            <select
              id="mc-stop-loss"
              name="stopLossMultiple"
              className="md-select"
              style={{ height: 32, fontSize: 12, padding: '0 8px', borderRadius: 8 }}
              value={stopLossMultiple === null ? 'none' : String(stopLossMultiple)}
              onChange={(e) => setStopLossMultiple(e.target.value === 'none' ? null : parseFloat(e.target.value))}
            >
              <option value="none">No Stop-Loss</option>
              <option value="1.5">1.5x Credit Stop</option>
              <option value="2">2.0x Credit Stop</option>
              <option value="3">3.0x Credit Stop</option>
            </select>
          </div>

          <label htmlFor="mc-sim-count" style={{ display: 'none' }}>Simulation Paths</label>
          <select
            id="mc-sim-count"
            name="simCount"
            className="md-select"
            style={{ height: 32, fontSize: 12, padding: '0 8px', borderRadius: 8 }}
            value={simCount}
            onChange={(e) => setSimCount(parseInt(e.target.value, 10))}
          >
            <option value={5000}>5,000 Paths</option>
            <option value={10000}>10,000 Paths</option>
            <option value={25000}>25,000 Paths</option>
          </select>

          <button
            className="md-button md-button--tonal"
            style={{ height: 32, padding: '0 12px', fontSize: 12 }}
            onClick={() => setSeed((prev) => prev + 1)}
            title={`Deterministic Seed #${seed} (Click to advance seed)`}
          >
            <RefreshCw size={14} />
            <span>Seed #{seed}</span>
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid-kpis">
        <div className="md-card md-card--tonal">
          <span className="label-small" style={{ color: 'var(--md-sys-color-primary)' }}>EMPIRICAL WIN RATE</span>
          <div className="mono-large" style={{ color: 'var(--quant-color-gain)', marginTop: 4 }}>
            {formatPercent(result.empiricalWinRate)}
          </div>
          <div className="body-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
            Analytical POP: <span className="mono-small">{formatPercent(condorEval.probMaxProfit)}</span> • POP50: <span className="mono-small">{formatPercent(condorEval.prob50Profit)}</span>
          </div>
        </div>

        <div className="md-card md-card--tonal">
          <span className="label-small" style={{ color: 'var(--md-sys-color-primary)' }}>MEAN EXPECTED P&L</span>
          <div
            className="mono-large"
            style={{ color: result.empiricalMeanPnL >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)', marginTop: 4 }}
          >
            {formatCurrency(result.empiricalMeanPnL)}
          </div>
          <div className="body-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
            Median: <span className="mono-small">{formatCurrency(result.empiricalMedianPnL)}</span> • Hold: <span className="mono-small">{result.avgDaysHeld.toFixed(1)}d</span>
          </div>
        </div>

        <div className="md-card md-card--tonal">
          <span className="label-small" style={{ color: 'var(--quant-color-loss)' }}>VALUE AT RISK (VaR 95%)</span>
          <div className="mono-large" style={{ color: 'var(--quant-color-loss)', marginTop: 4 }}>
            {formatCurrency(result.var95)}
          </div>
          <div className="body-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
            VaR 99%: <span className="mono-small">{formatCurrency(result.var99)}</span>
          </div>
        </div>

        <div className="md-card md-card--tonal">
          <span className="label-small" style={{ color: 'var(--quant-color-loss)' }}>EXPECTED SHORTFALL (CVaR)</span>
          <div className="mono-large" style={{ color: 'var(--quant-color-loss)', marginTop: 4 }}>
            {formatCurrency(result.cvar95)}
          </div>
          <div className="body-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
            {takeProfitPct !== null || stopLossMultiple !== null
              ? `TP Hit: ${formatPercent(result.takeProfitRate)} | SL Hit: ${formatPercent(result.stopLossRate)}`
              : 'Average tail loss beyond 95%'}
          </div>
        </div>
      </div>

      {/* Management Comparison Banner when rules are active */}
      {(takeProfitPct !== null || stopLossMultiple !== null) && (
        <div
          className="md-card md-card--outlined"
          style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            backgroundColor: 'color-mix(in srgb, var(--md-sys-color-primary-container) 30%, transparent)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <ShieldCheck size={16} color="var(--md-sys-color-primary)" />
            <span>
              <strong>Active Lifecycle Management:</strong> Early Take-Profit triggered on{' '}
              <span className="mono-small" style={{ color: 'var(--quant-color-gain)', fontWeight: 700 }}>{formatPercent(result.takeProfitRate)}</span> of paths; Stop-Loss triggered on{' '}
              <span className="mono-small" style={{ color: 'var(--quant-color-loss)', fontWeight: 700 }}>{formatPercent(result.stopLossRate)}</span>.
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--md-sys-color-on-surface-variant)' }}>
            Unmanaged Hold-to-Expiry Win Rate: <span className="mono-small">{formatPercent(result.unmanagedWinRate)}</span> (Mean P&L: <span className="mono-small">{formatCurrency(result.unmanagedMeanPnL)}</span>)
          </div>
        </div>
      )}

      {/* Visual Canvas Paths */}
      <div className="grid-analytics">
        <div className="md-card md-card--outlined" style={{ minHeight: 280 }}>
          <div className="md-card__header" style={{ marginBottom: 6 }}>
            <span className="title-small">Simulated Price Trajectories (25 Sample Paths — {regime === 'gbm' ? 'GBM' : 'Jump-Diffusion'})</span>
          </div>
          <div style={{ flex: 1, minHeight: 220, position: 'relative' }}>
            <canvas ref={pathCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
        </div>

        <div className="md-card md-card--outlined" style={{ minHeight: 280, display: 'flex', flexDirection: 'column' }}>
          <div className="md-card__header" style={{ marginBottom: 6 }}>
            <span className="title-small">Simulated Realized P&L Distribution</span>
            <BarChart2 size={16} color="var(--md-sys-color-outline)" />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4, padding: '10px 0' }}>
            {result.histogram.map((bin: { binStart: number; binEnd: number; count: number }, idx: number) => {
              const maxCount = Math.max(1, ...result.histogram.map((b: { count: number }) => b.count));
              const barHeightPct = (bin.count / maxCount) * 100;
              const isProfitBin = bin.binStart >= 0;

              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end'
                  }}
                  title={`[${formatCurrency(bin.binStart, 0)} to ${formatCurrency(bin.binEnd, 0)}]: ${bin.count.toLocaleString()} paths`}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(4, barHeightPct)}%`,
                      backgroundColor: isProfitBin ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)',
                      borderRadius: '3px 3px 0 0',
                      opacity: 0.85
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--md-sys-color-outline)' }}>
            <span>Max Loss (-${condorEval.maxLoss.toFixed(0)})</span>
            <span>$0 Break-Even</span>
            <span>Max Gain (+${condorEval.maxGain.toFixed(0)})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

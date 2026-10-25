import React, { useState, useMemo, useRef, useEffect } from 'react';
import { IronCondorEvaluation, UnderlyingParams } from '../quant/types';
import { runMonteCarloSimulation, MonteCarloResult } from '../quant/monteCarlo';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { Dna, RefreshCw, BarChart2 } from 'lucide-react';

interface MonteCarloViewProps {
  condorEval: IronCondorEvaluation;
  params: UnderlyingParams;
}

export const MonteCarloView: React.FC<MonteCarloViewProps> = ({ condorEval, params }) => {
  const [simCount, setSimCount] = useState<number>(10000);
  const [seed, setSeed] = useState<number>(1);

  const cs = condorEval.callSpread.shortStrike;
  const cl = condorEval.callSpread.longStrike;
  const ps = condorEval.putSpread.shortStrike;
  const pl = condorEval.putSpread.longStrike;

  // Run simulation
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
      params.dividendYield
    );
  }, [params.spotPrice, params.dte, params.atmIV, cs, cl, ps, pl, condorEval.totalCreditDollars, params.contracts, params.riskFreeRate, params.dividendYield, simCount, seed]);

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

    // Draw Strike Boundaries
    const drawBound = (strike: number, label: string, color: string) => {
      const y = yToPx(strike);
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      ctx.font = '10px monospace';
      ctx.fillText(`${label} $${strike}`, width - padRight - 75, y - 4);
    };

    drawBound(cs, 'Short Call', '#ff5630');
    drawBound(ps, 'Short Put', '#36b37e');

    // Draw Trajectories
    result.pricePathsSample.forEach((path: number[]) => {
      ctx.beginPath();
      const endPrice = path[path.length - 1];
      const isProfitable = endPrice >= ps && endPrice <= cs;
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
  }, [result, params.spotPrice, params.dte, cs, cl, ps, pl]);

  return (
    <div className="md-card md-card--elevated" style={{ gap: 20 }}>
      <div className="md-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 className="md-card__title">
            <Dna size={18} color="var(--md-sys-color-primary)" />
            Monte Carlo Risk Simulation ({simCount.toLocaleString()} Paths)
          </h3>
          <span className="md-chip md-chip--neutral">Geometric Brownian Motion</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            className="md-input-wrapper"
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
          >
            <RefreshCw size={14} />
            <span>Re-Simulate</span>
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
            Analytical POP: <span className="mono-small">{formatPercent(condorEval.probMaxProfit)}</span>
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
            Median: <span className="mono-small">{formatCurrency(result.empiricalMedianPnL)}</span>
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
            Average tail loss beyond 95%
          </div>
        </div>
      </div>

      {/* Visual Canvas Paths */}
      <div className="grid-analytics">
        <div className="md-card md-card--outlined" style={{ minHeight: 280 }}>
          <div className="md-card__header" style={{ marginBottom: 6 }}>
            <span className="title-small">Simulated Price Trajectories (25 Sample Paths)</span>
          </div>
          <div style={{ flex: 1, minHeight: 220, position: 'relative' }}>
            <canvas ref={pathCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
        </div>

        <div className="md-card md-card--outlined" style={{ minHeight: 280, display: 'flex', flexDirection: 'column' }}>
          <div className="md-card__header" style={{ marginBottom: 6 }}>
            <span className="title-small">Terminal Expiration P&L Histogram</span>
            <BarChart2 size={16} color="var(--md-sys-color-outline)" />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4, padding: '10px 0' }}>
            {result.histogram.map((bin: { binStart: number; binEnd: number; count: number }, idx: number) => {
              const maxCount = Math.max(...result.histogram.map((b: { count: number }) => b.count));
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

import React, { useRef, useEffect, useState } from 'react';
import { IronCondorEvaluation, UnderlyingParams } from '../quant/types';
import { blackScholes } from '../quant/blackScholes';
import { normalPdf } from '../quant/distributions';
import { formatCurrency } from '../utils/formatters';
import { LineChart } from 'lucide-react';

interface PayoffChart2DProps {
  condorEval: IronCondorEvaluation;
  params: UnderlyingParams;
}

export const PayoffChart2D: React.FC<PayoffChart2DProps> = ({ condorEval, params }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredData, setHoveredData] = useState<{ price: number; pnlExp: number; pnlNow: number } | null>(null);

  const S0 = params.spotPrice;
  const T = params.dte / 365;
  const sigma = params.atmIV;
  const contracts = params.contracts;
  const multiplier = contracts * 100;
  const totalCredit = condorEval.totalCreditDollars;

  const cs = condorEval.callSpread.shortStrike;
  const cl = condorEval.callSpread.longStrike;
  const ps = condorEval.putSpread.shortStrike;
  const pl = condorEval.putSpread.longStrike;

  // Domain range: +/- 3.5 std dev
  const range = S0 * sigma * Math.sqrt(T) * 3.5;
  const minPrice = Math.floor(S0 - range);
  const maxPrice = Math.ceil(S0 + range);

  // Expiration PnL function
  const calcPnLExpiration = (S: number): number => {
    let callLoss = 0;
    if (S > cs) {
      callLoss = Math.min(S - cs, cl - cs) * multiplier;
    }
    let putLoss = 0;
    if (S < ps) {
      putLoss = Math.min(ps - S, ps - pl) * multiplier;
    }
    return totalCredit - callLoss - putLoss;
  };

  // Today PnL function (Black-Scholes theoretical value today vs entry credit)
  const calcPnLToday = (S: number): number => {
    const sc = blackScholes('call', S, cs, T, sigma, params.riskFreeRate, params.dividendYield).price;
    const lc = blackScholes('call', S, cl, T, sigma, params.riskFreeRate, params.dividendYield).price;
    const sp = blackScholes('put', S, ps, T, sigma, params.riskFreeRate, params.dividendYield).price;
    const lp = blackScholes('put', S, pl, T, sigma, params.riskFreeRate, params.dividendYield).price;

    const currentCost = (-sc + lc - sp + lp) * multiplier;
    return totalCredit + currentCost;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Padding
    const padTop = 30;
    const padBottom = 40;
    const padLeft = 60;
    const padRight = 30;

    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    // PnL vertical limits
    const maxGain = condorEval.maxGain * 1.25;
    const maxLoss = -condorEval.maxLoss * 1.15;
    const pnlRange = maxGain - maxLoss;

    const xToPx = (p: number) => padLeft + ((p - minPrice) / (maxPrice - minPrice)) * plotWidth;
    const yToPx = (pnl: number) => padTop + ((maxGain - pnl) / pnlRange) * plotHeight;

    const zeroY = yToPx(0);

    // Grid lines & Zero Axis
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(padLeft, zeroY);
    ctx.lineTo(width - padRight, zeroY);
    ctx.stroke();

    // 1. Plot Probability Density Curve (bell curve overlay at bottom)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(76, 154, 255, 0.4)';
    ctx.fillStyle = 'rgba(76, 154, 255, 0.08)';
    ctx.lineWidth = 1.5;

    let startedPdf = false;
    const stdDev = S0 * sigma * Math.sqrt(T);

    for (let px = padLeft; px <= width - padRight; px += 3) {
      const p = minPrice + ((px - padLeft) / plotWidth) * (maxPrice - minPrice);
      const z = (p - S0) / stdDev;
      const pdf = normalPdf(z) / stdDev; // normalized
      const pdfHeight = pdf * stdDev * 80; // visual scaling
      const py = height - padBottom - pdfHeight;

      if (!startedPdf) {
        ctx.moveTo(px, height - padBottom);
        ctx.lineTo(px, py);
        startedPdf = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.lineTo(width - padRight, height - padBottom);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Plot Expiration Payoff (Fill + Line)
    ctx.beginPath();
    let started = false;
    for (let px = padLeft; px <= width - padRight; px += 2) {
      const p = minPrice + ((px - padLeft) / plotWidth) * (maxPrice - minPrice);
      const pnl = calcPnLExpiration(p);
      const py = yToPx(pnl);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.strokeStyle = '#00875a';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. Plot Today (T=0) Black-Scholes Curve
    ctx.beginPath();
    started = false;
    for (let px = padLeft; px <= width - padRight; px += 2) {
      const p = minPrice + ((px - padLeft) / plotWidth) * (maxPrice - minPrice);
      const pnl = calcPnLToday(p);
      const py = yToPx(pnl);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.strokeStyle = '#4c9aff';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Vertical Strike Markers
    const drawMarker = (price: number, label: string, color: string) => {
      const x = xToPx(price);
      if (x < padLeft || x > width - padRight) return;

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, height - padBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = color;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, padTop - 8);
      ctx.fillText(`$${price}`, x, height - padBottom + 16);
    };

    drawMarker(ps, 'Short Put', '#36b37e');
    drawMarker(pl, 'Long Put', '#00875a');
    drawMarker(cs, 'Short Call', '#ff5630');
    drawMarker(cl, 'Long Call', '#de350b');
    drawMarker(S0, 'Spot', '#4c9aff');

    // Y Axis Labels
    ctx.fillStyle = 'rgba(128, 128, 128, 0.8)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`+${formatCurrency(maxGain, 0)}`, padLeft - 8, yToPx(maxGain) + 4);
    ctx.fillText('$0', padLeft - 8, zeroY + 4);
    ctx.fillText(`${formatCurrency(maxLoss, 0)}`, padLeft - 8, yToPx(maxLoss) + 4);
  }, [condorEval, params, S0, T, sigma, minPrice, maxPrice]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const padLeft = 60;
    const padRight = 30;
    const plotWidth = canvas.clientWidth - padLeft - padRight;

    if (x >= padLeft && x <= canvas.clientWidth - padRight) {
      const price = minPrice + ((x - padLeft) / plotWidth) * (maxPrice - minPrice);
      setHoveredData({
        price,
        pnlExp: calcPnLExpiration(price),
        pnlNow: calcPnLToday(price)
      });
    } else {
      setHoveredData(null);
    }
  };

  return (
    <div className="md-card md-card--elevated" style={{ height: '100%', minHeight: 380 }}>
      <div className="md-card__header" style={{ marginBottom: 8 }}>
        <h3 className="md-card__title">
          <LineChart size={18} color="var(--md-sys-color-primary)" />
          2D Payoff & Probability Density Curves
        </h3>
        <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 3, backgroundColor: '#00875a', display: 'inline-block' }} />
            <span>At Expiration</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 3, borderTop: '2px dashed #4c9aff', display: 'inline-block' }} />
            <span>Today (T=0)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 8, backgroundColor: 'rgba(76, 154, 255, 0.25)', display: 'inline-block' }} />
            <span>Probability Density</span>
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 280 }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredData(null)}
        />

        {hoveredData && (
          <div
            className="md-card md-card--tonal"
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              padding: '8px 12px',
              fontSize: 12,
              pointerEvents: 'none',
              boxShadow: 'var(--md-sys-elevation-level2)'
            }}
          >
            <div>
              Price: <span className="mono-small">${hoveredData.price.toFixed(2)}</span>
            </div>
            <div>
              At Expiry P&L:{' '}
              <span
                className="mono-small"
                style={{ color: hoveredData.pnlExp >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}
              >
                {formatCurrency(hoveredData.pnlExp)}
              </span>
            </div>
            <div>
              Today P&L:{' '}
              <span
                className="mono-small"
                style={{ color: hoveredData.pnlNow >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}
              >
                {formatCurrency(hoveredData.pnlNow)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

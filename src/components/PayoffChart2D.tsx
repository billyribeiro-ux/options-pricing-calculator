import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { IronCondorEvaluation, UnderlyingParams } from '../quant/types';
import { blackScholes, getStrikeIV } from '../quant/blackScholes';
import { calculatePositionGreeksAtSpot } from '../quant/greeks';
import { normalPdf } from '../quant/distributions';
import { formatCurrency } from '../utils/formatters';
import { LineChart, ZoomIn, Grid, RotateCcw } from 'lucide-react';

interface PayoffChart2DProps {
  condorEval: IronCondorEvaluation;
  params: UnderlyingParams;
}

interface StrikeMarker {
  price: number;
  shortLabel: string;
  fullLabel: string;
  color: string;
  priority: number;
}

export type GreekOverlayType = 'none' | 'delta' | 'gamma' | 'theta' | 'vega' | 'charm';

export const PayoffChart2D: React.FC<PayoffChart2DProps> = ({ condorEval, params }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredData, setHoveredData] = useState<{
    price: number;
    pnlExp: number;
    pnlNow: number;
    greekVal?: number;
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [zoomMode, setZoomMode] = useState<'focus' | 'wide'>('focus');
  const [chartView, setChartView] = useState<'curve' | 'heatmap'>('curve');
  const [heatmapUnit, setHeatmapUnit] = useState<'dollar' | 'pct'>('dollar');
  const [daysElapsed, setDaysElapsed] = useState<number>(0);
  const [ivShock, setIvShock] = useState<number>(0);
  const [greekOverlay, setGreekOverlay] = useState<GreekOverlayType>('none');
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 800, height: 320 });

  // Clamp daysElapsed if params.dte changes
  const effectiveDaysElapsed = Math.min(daysElapsed, Math.max(0, params.dte - 0.25));
  const simDteRemaining = Math.max(0.1, params.dte - effectiveDaysElapsed);

  const S0 = params.spotPrice;
  const T = Math.max(0.001, params.dte / 365);
  const simT = Math.max(0.0005, simDteRemaining / 365);
  const sigma = Math.max(0.01, params.atmIV);
  const simBaseIV = Math.max(0.01, sigma + ivShock);
  const skew = params.skewSlope ?? 0;
  const contracts = params.contracts;
  const multiplier = contracts * 100;
  const totalCredit = condorEval.totalCreditDollars;

  const cs = condorEval.callSpread.shortStrike;
  const cl = condorEval.callSpread.longStrike;
  const ps = condorEval.putSpread.shortStrike;
  const pl = condorEval.putSpread.longStrike;

  const includeCall = condorEval.mode !== 'put-spread';
  const includePut = condorEval.mode !== 'call-spread';
  const hasLongWings = condorEval.mode !== 'short-strangle';

  // Adaptive domain range: 'focus' frames strikes + 1.8 std dev for spacious label separation; 'wide' frames 3.2 std dev
  const stdDev = S0 * sigma * Math.sqrt(T);
  const sigmaMult = zoomMode === 'focus' ? 1.85 : 3.25;
  const rawMin = Math.min(
    S0 - stdDev * sigmaMult,
    includePut ? Math.min(ps, hasLongWings ? pl : ps) - stdDev * 0.5 : S0
  );
  const rawMax = Math.max(
    S0 + stdDev * sigmaMult,
    includeCall ? Math.max(cs, hasLongWings ? cl : cs) + stdDev * 0.5 : S0
  );
  const minPrice = Math.floor(rawMin);
  const maxPrice = Math.ceil(rawMax);

  // Expiration PnL function
  const calcPnLExpiration = useCallback(
    (S: number): number => {
      let callLoss = 0;
      if (includeCall && S > cs) {
        callLoss = (hasLongWings ? Math.min(S - cs, Math.abs(cl - cs)) : S - cs) * multiplier;
      }
      let putLoss = 0;
      if (includePut && S < ps) {
        putLoss = (hasLongWings ? Math.min(ps - S, Math.abs(ps - pl)) : ps - S) * multiplier;
      }
      return totalCredit - callLoss - putLoss;
    },
    [includeCall, includePut, hasLongWings, cs, cl, ps, pl, multiplier, totalCredit]
  );

  // PnL at any remaining time T_rem (in years) and base IV
  const calcPnLAtHorizon = useCallback(
    (S: number, remYears: number, baseVol: number): number => {
      if (remYears <= 0.0003) return calcPnLExpiration(S);
      const scIV = getStrikeIV(cs, S, baseVol, skew);
      const lcIV = getStrikeIV(cl, S, baseVol, skew);
      const spIV = getStrikeIV(ps, S, baseVol, skew);
      const lpIV = getStrikeIV(pl, S, baseVol, skew);

      const sc = includeCall ? blackScholes('call', S, cs, remYears, scIV, params.riskFreeRate, params.dividendYield).price : 0;
      const lc = includeCall && hasLongWings ? blackScholes('call', S, cl, remYears, lcIV, params.riskFreeRate, params.dividendYield).price : 0;
      const sp = includePut ? blackScholes('put', S, ps, remYears, spIV, params.riskFreeRate, params.dividendYield).price : 0;
      const lp = includePut && hasLongWings ? blackScholes('put', S, pl, remYears, lpIV, params.riskFreeRate, params.dividendYield).price : 0;

      const currentCost = (-sc + lc - sp + lp) * multiplier;
      return totalCredit + currentCost;
    },
    [includeCall, includePut, hasLongWings, cs, cl, ps, pl, skew, params.riskFreeRate, params.dividendYield, multiplier, totalCredit, calcPnLExpiration]
  );

  // Simulated What-If Horizon PnL function
  const calcPnLToday = useCallback(
    (S: number): number => {
      return calcPnLAtHorizon(S, simT, simBaseIV);
    },
    [calcPnLAtHorizon, simT, simBaseIV]
  );

  // Greek overlay evaluation at spot S
  const evalGreekAtPrice = useCallback(
    (S: number): number => {
      if (greekOverlay === 'none') return 0;
      const g = calculatePositionGreeksAtSpot(
        S,
        simDteRemaining,
        ivShock,
        cs,
        cl,
        ps,
        pl,
        contracts,
        params,
        condorEval.mode
      );
      return g[greekOverlay];
    },
    [greekOverlay, simDteRemaining, ivShock, cs, cl, ps, pl, contracts, params, condorEval.mode]
  );

  // Observe container resize so canvas is always crisp and accurately measured
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCanvasSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvasSize.width;
    const height = Math.max(300, canvasSize.height);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Generous top padding (64px) for multi-tier non-overlapping strike pill badges,
    // and bottom padding (38px) for evenly-spaced X-axis price ticks.
    const padTop = 64;
    const padBottom = 38;
    const padLeft = 72;
    const padRight = 28;

    const plotWidth = Math.max(100, width - padLeft - padRight);
    const plotHeight = Math.max(100, height - padTop - padBottom);

    // PnL vertical limits
    const maxGainVal = Math.max(condorEval.maxGain, 100);
    const maxLossVal = Math.max(condorEval.maxLoss, 100);
    const topPnL = maxGainVal * 1.28;
    const bottomPnL = -maxLossVal * 1.18;
    const pnlRange = Math.max(1, topPnL - bottomPnL);

    const xToPx = (p: number) => padLeft + ((p - minPrice) / Math.max(1, maxPrice - minPrice)) * plotWidth;
    const yToPx = (pnl: number) => padTop + ((topPnL - pnl) / pnlRange) * plotHeight;

    const zeroY = Math.max(padTop, Math.min(height - padBottom, yToPx(0)));

    // 0. Shaded +/- 1 Std Dev Expected Move Zone
    const x1SigmaLow = Math.max(padLeft, xToPx(S0 - stdDev));
    const x1SigmaHigh = Math.min(width - padRight, xToPx(S0 + stdDev));
    if (x1SigmaHigh > x1SigmaLow) {
      ctx.fillStyle = 'rgba(76, 154, 255, 0.04)';
      ctx.fillRect(x1SigmaLow, padTop, x1SigmaHigh - x1SigmaLow, plotHeight);
    }

    // Horizontal reference grid lines (Max Gain, $0 Breakeven, Max Loss)
    const yMaxGain = yToPx(condorEval.maxGain);
    const yMaxLoss = yToPx(-condorEval.maxLoss);

    ctx.strokeStyle = 'rgba(128, 128, 128, 0.14)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    [yMaxGain, yMaxLoss].forEach((gy) => {
      if (gy >= padTop && gy <= height - padBottom) {
        ctx.beginPath();
        ctx.moveTo(padLeft, gy);
        ctx.lineTo(width - padRight, gy);
        ctx.stroke();
      }
    });
    ctx.setLineDash([]);

    // Solid Zero Axis
    ctx.strokeStyle = 'rgba(140, 150, 165, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(padLeft, zeroY);
    ctx.lineTo(width - padRight, zeroY);
    ctx.stroke();

    // 1. Plot Probability Density Curve (bell curve overlay at bottom of plot)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(76, 154, 255, 0.42)';
    ctx.fillStyle = 'rgba(76, 154, 255, 0.09)';
    ctx.lineWidth = 1.5;

    let startedPdf = false;
    for (let px = padLeft; px <= width - padRight; px += 3) {
      const p = minPrice + ((px - padLeft) / plotWidth) * (maxPrice - minPrice);
      const z = (p - S0) / stdDev;
      const pdf = normalPdf(z); // peak at z=0 is ~0.3989
      const pdfHeight = pdf * (plotHeight * 0.48);
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

    // 2. Plot Expiration Payoff (Profit/Loss shaded fill + crisp line)
    ctx.save();
    ctx.beginPath();
    for (let px = padLeft; px <= width - padRight; px += 2) {
      const p = minPrice + ((px - padLeft) / plotWidth) * (maxPrice - minPrice);
      const pnl = calcPnLExpiration(p);
      const py = yToPx(pnl);
      if (px === padLeft) {
        ctx.moveTo(px, zeroY);
        ctx.lineTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.lineTo(width - padRight, zeroY);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
    const zeroRatio = Math.max(0, Math.min(1, (zeroY - padTop) / plotHeight));
    grad.addColorStop(0, 'rgba(0, 135, 90, 0.20)');
    grad.addColorStop(zeroRatio, 'rgba(0, 135, 90, 0.04)');
    grad.addColorStop(Math.min(1, zeroRatio + 0.001), 'rgba(222, 53, 11, 0.04)');
    grad.addColorStop(1, 'rgba(222, 53, 11, 0.18)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

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
    ctx.strokeStyle = '#00a86b';
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
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3b. Optional Position Greek Sensitivity Curve Overlay (ThinkorSwim Risk Profile Style)
    if (greekOverlay !== 'none') {
      const sampleCount = 80;
      const gVals: { px: number; val: number }[] = [];
      let maxAbsG = 1e-6;
      for (let i = 0; i <= sampleCount; i++) {
        const px = padLeft + (i / sampleCount) * plotWidth;
        const p = minPrice + (i / sampleCount) * (maxPrice - minPrice);
        const val = evalGreekAtPrice(p);
        gVals.push({ px, val });
        if (Math.abs(val) > maxAbsG) maxAbsG = Math.abs(val);
      }

      const midY = padTop + plotHeight * 0.5;
      const scaleY = (plotHeight * 0.38) / maxAbsG;

      ctx.beginPath();
      gVals.forEach((pt, idx) => {
        const py = midY - pt.val * scaleY;
        if (idx === 0) ctx.moveTo(pt.px, py);
        else ctx.lineTo(pt.px, py);
      });
      ctx.strokeStyle = '#b388ff';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // 4. Collision-Free Multi-Tier Strike Marker Layout Engine
    // Collect active markers and sort left-to-right by price
    const rawMarkers: StrikeMarker[] = [];
    if (includePut) {
      if (hasLongWings) {
        rawMarkers.push({ price: pl, shortLabel: 'LP', fullLabel: 'Long Put', color: '#26a69a', priority: 2 });
      }
      rawMarkers.push({ price: ps, shortLabel: 'SP', fullLabel: 'Short Put', color: '#36b37e', priority: 1 });
    }
    rawMarkers.push({ price: S0, shortLabel: 'SPOT', fullLabel: 'Spot', color: '#4c9aff', priority: 0 });
    if (includeCall) {
      rawMarkers.push({ price: cs, shortLabel: 'SC', fullLabel: 'Short Call', color: '#ff7452', priority: 1 });
      if (hasLongWings) {
        rawMarkers.push({ price: cl, shortLabel: 'LC', fullLabel: 'Long Call', color: '#ff5630', priority: 2 });
      }
    }

    const visibleMarkers = rawMarkers
      .map((m) => ({ ...m, anchorX: xToPx(m.price) }))
      .filter((m) => m.anchorX >= padLeft - 2 && m.anchorX <= width - padRight + 2)
      .sort((a, b) => a.anchorX - b.anchorX);

    // Draw vertical dashed strike lines first
    visibleMarkers.forEach((m) => {
      ctx.beginPath();
      ctx.strokeStyle = m.color;
      ctx.lineWidth = m.shortLabel === 'SPOT' ? 1.5 : 1.1;
      ctx.setLineDash(m.shortLabel === 'SPOT' ? [4, 3] : [2, 3]);
      ctx.moveTo(m.anchorX, padTop);
      ctx.lineTo(m.anchorX, height - padBottom);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // Measure text and assign each badge to one of 3 vertical rows (y = 13, 31, 49)
    // using a two-pass per-row interval solver that guarantees >= 8px horizontal gap and >= 3px vertical gap.
    ctx.font = '600 10.5px "JetBrains Mono", monospace';
    const useCompactText = plotWidth < 620;
    const rowYCenters = [13, 31, 49];
    const rowRightEdges = [-Infinity, -Infinity, -Infinity];
    const minHorizontalGap = 8;
    const pillHeight = 15;

    interface PlacedBadge {
      anchorX: number;
      centerX: number;
      pillWidth: number;
      row: number;
      labelText: string;
      color: string;
    }

    const rowBadges: PlacedBadge[][] = [[], [], []];

    visibleMarkers.forEach((m) => {
      const labelText = useCompactText
        ? `${m.shortLabel} $${m.price}`
        : `${m.fullLabel} $${m.price}`;
      const textWidth = ctx.measureText(labelText).width;
      const pillWidth = Math.ceil(textWidth + 12);

      let centerX = Math.max(
        padLeft + pillWidth / 2,
        Math.min(width - padRight - pillWidth / 2, m.anchorX)
      );

      // Find the highest row (0, 1, or 2) where [centerX - pillWidth/2, centerX + pillWidth/2] does not collide
      let chosenRow = -1;
      for (let r = 0; r < rowYCenters.length; r++) {
        if (centerX - pillWidth / 2 >= rowRightEdges[r] + minHorizontalGap) {
          chosenRow = r;
          break;
        }
      }

      // If all 3 rows are occupied at this X, pick the row with the smallest right-edge and push right
      if (chosenRow === -1) {
        let bestRow = 0;
        for (let r = 1; r < rowYCenters.length; r++) {
          if (rowRightEdges[r] < rowRightEdges[bestRow]) {
            bestRow = r;
          }
        }
        chosenRow = bestRow;
        centerX = rowRightEdges[chosenRow] + minHorizontalGap + pillWidth / 2;
      }

      rowRightEdges[chosenRow] = centerX + pillWidth / 2;
      rowBadges[chosenRow].push({
        anchorX: m.anchorX,
        centerX,
        pillWidth,
        row: chosenRow,
        labelText,
        color: m.color
      });
    });

    // Pass 2 (Right-to-Left boundary clamp): if the rightmost badge in any row overflows (width - 6),
    // shift it left and propagate leftward while strictly preserving minHorizontalGap.
    rowBadges.forEach((badgesInRow) => {
      if (badgesInRow.length === 0) return;
      let maxRightAllowed = width - 6;
      for (let i = badgesInRow.length - 1; i >= 0; i--) {
        const b = badgesInRow[i];
        if (b.centerX + b.pillWidth / 2 > maxRightAllowed) {
          b.centerX = maxRightAllowed - b.pillWidth / 2;
        }
        maxRightAllowed = b.centerX - b.pillWidth / 2 - minHorizontalGap;
      }
    });

    // Render leader lines and non-overlapping pill badges
    rowBadges.flat().forEach((b) => {
      const centerY = rowYCenters[b.row];

      // Leader line from bottom of pill badge to top of vertical strike line at (anchorX, padTop)
      ctx.beginPath();
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 1;
      ctx.moveTo(b.centerX, centerY + pillHeight / 2);
      ctx.lineTo(b.anchorX, padTop);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Rounded pill background
      const pillX = b.centerX - b.pillWidth / 2;
      const pillY = centerY - pillHeight / 2;
      ctx.fillStyle = 'rgba(17, 19, 24, 0.90)';
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, b.pillWidth, pillHeight, 4);
      ctx.fill();
      ctx.stroke();

      // Badge text
      ctx.fillStyle = b.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.labelText, b.centerX, centerY + 0.5);
    });

    // 5. Evenly-Spaced, Non-Overlapping Bottom X-Axis Price Ticks
    const minPxBetweenXTicks = 85;
    const maxTicks = Math.max(3, Math.floor(plotWidth / minPxBetweenXTicks));
    const rawStep = (maxPrice - minPrice) / maxTicks;
    const niceSteps = [1, 2, 5, 10, 15, 20, 25, 50, 100];
    const tickStep = niceSteps.find((s) => s >= rawStep) || Math.ceil(rawStep / 10) * 10;
    const firstTick = Math.ceil(minPrice / tickStep) * tickStep;

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(150, 160, 175, 0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    let lastTickPx = -Infinity;
    for (let p = firstTick; p <= maxPrice; p += tickStep) {
      const px = xToPx(p);
      if (px >= padLeft + 15 && px <= width - padRight - 15 && px - lastTickPx >= 60) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(150, 160, 175, 0.35)';
        ctx.lineWidth = 1;
        ctx.moveTo(px, height - padBottom);
        ctx.lineTo(px, height - padBottom + 5);
        ctx.stroke();

        ctx.fillText(`$${p}`, px, height - padBottom + 8);
        lastTickPx = px;
      }
    }

    // 6. Collision-Guarded Y-Axis Labels
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yLabels: { y: number; text: string; color: string }[] = [
      { y: yMaxGain, text: `+${formatCurrency(condorEval.maxGain, 0)}`, color: '#36b37e' },
      { y: zeroY, text: '$0', color: 'rgba(160, 170, 185, 0.9)' },
      { y: yMaxLoss, text: `-${formatCurrency(condorEval.maxLoss, 0)}`, color: '#ff5630' }
    ];

    const drawnYs: number[] = [];
    yLabels.forEach((lbl) => {
      if (lbl.y < padTop - 4 || lbl.y > height - padBottom + 4) return;
      const collides = drawnYs.some((dy) => Math.abs(dy - lbl.y) < 15);
      if (!collides) {
        ctx.fillStyle = lbl.color;
        ctx.fillText(lbl.text, padLeft - 8, lbl.y);
        drawnYs.push(lbl.y);
      }
    });

    // 7. Interactive Hover Crosshair & Curve Intersection Dots
    if (hoveredData && hoveredData.mouseX >= padLeft && hoveredData.mouseX <= width - padRight) {
      const hx = hoveredData.mouseX;
      const hyExp = yToPx(hoveredData.pnlExp);
      const hyNow = yToPx(hoveredData.pnlNow);

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(hx, padTop);
      ctx.lineTo(hx, height - padBottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Expiration Curve Dot
      ctx.beginPath();
      ctx.fillStyle = hoveredData.pnlExp >= 0 ? '#00a86b' : '#ff5630';
      ctx.arc(hx, hyExp, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Today Curve Dot
      ctx.beginPath();
      ctx.fillStyle = '#4c9aff';
      ctx.arc(hx, hyNow, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [
    condorEval,
    params,
    S0,
    T,
    sigma,
    stdDev,
    minPrice,
    maxPrice,
    cs,
    cl,
    ps,
    pl,
    includeCall,
    includePut,
    hasLongWings,
    calcPnLExpiration,
    calcPnLToday,
    greekOverlay,
    evalGreekAtPrice,
    canvasSize,
    hoveredData,
    chartView
  ]);

  // OptionStrat-style Price x Date P&L Heatmap Matrix computation
  const heatmapData = useMemo(() => {
    const colCount = Math.min(10, Math.max(4, params.dte + 1));
    const dayColumns: { label: string; remYears: number; dayPassed: number }[] = [];
    for (let c = 0; c < colCount; c++) {
      const frac = c / (colCount - 1);
      const dayPassed = Math.round(frac * params.dte * 10) / 10;
      const remDte = Math.max(0, params.dte - dayPassed);
      dayColumns.push({
        label: c === 0 ? 'Today' : c === colCount - 1 ? 'Expiry' : `T+${dayPassed.toFixed(0)}d`,
        remYears: remDte / 365,
        dayPassed
      });
    }

    const rowCount = 15;
    const priceSpan = Math.max(params.strikeGap * 3, Math.round(stdDev * 1.4));
    const topPrice = Math.round((S0 + priceSpan) / (params.strikeGap / 2 || 1)) * (params.strikeGap / 2 || 1);
    const botPrice = Math.round((S0 - priceSpan) / (params.strikeGap / 2 || 1)) * (params.strikeGap / 2 || 1);
    const step = (topPrice - botPrice) / (rowCount - 1);

    const rows: {
      price: number;
      pctMove: number;
      isSpotRow: boolean;
      cells: { pnl: number; pctOfRisk: number }[];
    }[] = [];

    for (let r = 0; r < rowCount; r++) {
      const price = Math.round((topPrice - r * step) * 100) / 100;
      const pctMove = ((price - S0) / S0) * 100;
      const isSpotRow = Math.abs(price - S0) <= step * 0.55;
      const cells = dayColumns.map((col) => {
        const pnl = calcPnLAtHorizon(price, col.remYears, simBaseIV);
        const pctOfRisk = condorEval.maxLoss > 0 ? (pnl / condorEval.maxLoss) * 100 : 0;
        return { pnl, pctOfRisk };
      });
      rows.push({ price, pctMove, isSpotRow, cells });
    }

    return { dayColumns, rows };
  }, [params.dte, params.strikeGap, stdDev, S0, calcPnLAtHorizon, simBaseIV, condorEval.maxLoss]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const padLeft = 72;
    const padRight = 28;
    const plotWidth = canvas.clientWidth - padLeft - padRight;

    if (x >= padLeft && x <= canvas.clientWidth - padRight && plotWidth > 0) {
      const price = minPrice + ((x - padLeft) / plotWidth) * (maxPrice - minPrice);
      setHoveredData({
        price,
        pnlExp: calcPnLExpiration(price),
        pnlNow: calcPnLToday(price),
        greekVal: greekOverlay !== 'none' ? evalGreekAtPrice(price) : undefined,
        mouseX: x,
        mouseY: y
      });
    } else {
      setHoveredData(null);
    }
  };

  const hasWhatIfAdjustments = effectiveDaysElapsed > 0 || ivShock !== 0 || greekOverlay !== 'none';

  return (
    <div className="md-card md-card--elevated" style={{ minHeight: 430, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="md-card__header" style={{ marginBottom: 0, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 className="md-card__title">
            <LineChart size={18} color="var(--md-sys-color-primary)" />
            2D Payoff, Greeks & Time-Decay Matrix
          </h3>

          {/* Primary View Mode Switcher: 2D Curves vs OptionStrat Price x Date Heatmap */}
          <div className="md-segmented-button">
            <button
              className={`md-segmented-button__segment ${chartView === 'curve' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => setChartView('curve')}
            >
              <LineChart size={12} style={{ marginRight: 4 }} />
              Payoff & Greeks Curve
            </button>
            <button
              className={`md-segmented-button__segment ${chartView === 'heatmap' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => setChartView('heatmap')}
            >
              <Grid size={12} style={{ marginRight: 4 }} />
              Price × Date Heatmap
            </button>
          </div>

          {chartView === 'curve' && (
            <div className="md-segmented-button">
              <button
                className={`md-segmented-button__segment ${zoomMode === 'focus' ? 'md-segmented-button__segment--active' : ''}`}
                onClick={() => setZoomMode('focus')}
                title="Focus around active strikes and ±1.8σ expected move"
              >
                <ZoomIn size={12} style={{ marginRight: 4 }} />
                Focus (±1.8σ)
              </button>
              <button
                className={`md-segmented-button__segment ${zoomMode === 'wide' ? 'md-segmented-button__segment--active' : ''}`}
                onClick={() => setZoomMode('wide')}
                title="Wide tail view (±3.2σ)"
              >
                Wide (±3.2σ)
              </button>
            </div>
          )}

          {chartView === 'heatmap' && (
            <div className="md-segmented-button">
              <button
                className={`md-segmented-button__segment ${heatmapUnit === 'dollar' ? 'md-segmented-button__segment--active' : ''}`}
                onClick={() => setHeatmapUnit('dollar')}
              >
                $ P&L
              </button>
              <button
                className={`md-segmented-button__segment ${heatmapUnit === 'pct' ? 'md-segmented-button__segment--active' : ''}`}
                onClick={() => setHeatmapUnit('pct')}
              >
                % Return on Risk
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, fontSize: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 3, backgroundColor: '#00a86b', display: 'inline-block' }} />
            <span>At Expiration</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 3, borderTop: '2px dashed #4c9aff', display: 'inline-block' }} />
            <span>{effectiveDaysElapsed > 0 ? `T+${effectiveDaysElapsed.toFixed(1)}d (${simDteRemaining.toFixed(1)}d rem)` : 'Today (T=0)'}</span>
          </div>
          {greekOverlay !== 'none' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 3, backgroundColor: '#b388ff', display: 'inline-block' }} />
              <span style={{ textTransform: 'capitalize', color: '#b388ff', fontWeight: 600 }}>Net {greekOverlay}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 8, backgroundColor: 'rgba(76, 154, 255, 0.25)', display: 'inline-block' }} />
            <span>±1σ Zone</span>
          </div>
        </div>
      </div>

      {/* Interactive What-If Scenario Scrubbers (Time Decay, IV Shock & Greek Profile Selector) */}
      <div
        className="md-card md-card--tonal"
        style={{
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          fontSize: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 210px' }}>
          <label htmlFor="whatif-dte-slider" className="label-small" style={{ whiteSpace: 'nowrap', color: 'var(--md-sys-color-on-surface-variant)' }}>
            Time Scrub: <strong className="mono-small" style={{ color: 'var(--md-sys-color-primary)' }}>T+{effectiveDaysElapsed.toFixed(1)}d</strong> ({simDteRemaining.toFixed(1)} DTE)
          </label>
          <input
            id="whatif-dte-slider"
            name="daysElapsed"
            type="range"
            min="0"
            max={Math.max(0.5, params.dte - 0.25)}
            step="0.25"
            value={effectiveDaysElapsed}
            onChange={(e) => setDaysElapsed(parseFloat(e.target.value) || 0)}
            style={{ flex: 1, accentColor: 'var(--md-sys-color-primary)', cursor: 'pointer' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 210px' }}>
          <label htmlFor="whatif-iv-slider" className="label-small" style={{ whiteSpace: 'nowrap', color: 'var(--md-sys-color-on-surface-variant)' }}>
            IV Shock: <strong className="mono-small" style={{ color: ivShock >= 0 ? 'var(--md-sys-color-tertiary)' : 'var(--md-sys-color-secondary)' }}>{ivShock >= 0 ? '+' : ''}{(ivShock * 100).toFixed(0)}%</strong> ({(simBaseIV * 100).toFixed(1)}%)
          </label>
          <input
            id="whatif-iv-slider"
            name="ivShock"
            type="range"
            min="-0.15"
            max="0.25"
            step="0.01"
            value={ivShock}
            onChange={(e) => setIvShock(parseFloat(e.target.value) || 0)}
            style={{ flex: 1, accentColor: 'var(--md-sys-color-tertiary)', cursor: 'pointer' }}
          />
        </div>

        {chartView === 'curve' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="whatif-greek-overlay" className="label-small" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
              Greek Curve:
            </label>
            <select
              id="whatif-greek-overlay"
              name="greekOverlay"
              className="md-select"
              style={{ height: 28, fontSize: 11, padding: '0 8px', borderRadius: 6 }}
              value={greekOverlay}
              onChange={(e) => setGreekOverlay(e.target.value as GreekOverlayType)}
            >
              <option value="none">None (P&L Only)</option>
              <option value="delta">Δ Net Delta</option>
              <option value="gamma">Γ Net Gamma</option>
              <option value="theta">Θ Net Theta ($/d)</option>
              <option value="vega">ν Net Vega ($/%)</option>
              <option value="charm">Charm (dΔ/dDay)</option>
            </select>
          </div>
        )}

        {hasWhatIfAdjustments && (
          <button
            type="button"
            className="md-button md-button--text"
            style={{ height: 26, padding: '0 8px', fontSize: 11 }}
            onClick={() => {
              setDaysElapsed(0);
              setIvShock(0);
              setGreekOverlay('none');
            }}
          >
            <RotateCcw size={12} />
            <span>Reset What-If</span>
          </button>
        )}
      </div>

      {chartView === 'curve' ? (
        <div ref={containerRef} style={{ position: 'relative', flex: 1, minHeight: 300 }}>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredData(null)}
          />

          {hoveredData && (() => {
            const tooltipWidth = 220;
            const tooltipHeight = hoveredData.greekVal !== undefined ? 118 : 98;
            const flipX = hoveredData.mouseX + tooltipWidth + 24 > canvasSize.width;
            const left = flipX
              ? Math.max(10, hoveredData.mouseX - tooltipWidth - 14)
              : Math.min(canvasSize.width - tooltipWidth - 10, hoveredData.mouseX + 16);
            const top = Math.max(8, Math.min(canvasSize.height - tooltipHeight - 8, hoveredData.mouseY - 45));
            const diffFromSpot = hoveredData.price - S0;
            const pctFromSpot = (diffFromSpot / S0) * 100;

            return (
              <div
                className="md-card"
                style={{
                  position: 'absolute',
                  left: `${left}px`,
                  top: `${top}px`,
                  width: `${tooltipWidth}px`,
                  padding: '8px 12px',
                  fontSize: 12,
                  pointerEvents: 'none',
                  zIndex: 10,
                  backgroundColor: 'color-mix(in srgb, var(--md-sys-color-surface-container-high) 92%, transparent)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  boxShadow: 'var(--md-sys-elevation-level3)',
                  border: '1px solid var(--md-sys-color-outline-variant)',
                  borderRadius: '8px',
                  transition: 'transform 0.04s ease-out'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                  <span className="mono-small" style={{ fontSize: 13, fontWeight: 700, color: 'var(--md-sys-color-on-surface)' }}>
                    ${hoveredData.price.toFixed(2)}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: diffFromSpot >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)'
                    }}
                  >
                    {diffFromSpot >= 0 ? '+' : ''}${diffFromSpot.toFixed(2)} ({diffFromSpot >= 0 ? '+' : ''}{pctFromSpot.toFixed(2)}%)
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: hoveredData.pnlExp >= 0 ? '#00a86b' : '#ff5630', display: 'inline-block' }} />
                    At Expiration:
                  </span>
                  <span
                    className="mono-small"
                    style={{ fontWeight: 700, color: hoveredData.pnlExp >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}
                  >
                    {hoveredData.pnlExp >= 0 ? '+' : ''}{formatCurrency(hoveredData.pnlExp)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#4c9aff', display: 'inline-block' }} />
                    {effectiveDaysElapsed > 0 ? `T+${effectiveDaysElapsed.toFixed(1)}d:` : 'Today (T=0):'}
                  </span>
                  <span
                    className="mono-small"
                    style={{ fontWeight: 700, color: hoveredData.pnlNow >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}
                  >
                    {hoveredData.pnlNow >= 0 ? '+' : ''}{formatCurrency(hoveredData.pnlNow)}
                  </span>
                </div>
                {hoveredData.greekVal !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3, paddingTop: 3, borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
                    <span style={{ color: '#b388ff', fontSize: 11, textTransform: 'capitalize', fontWeight: 600 }}>
                      Net {greekOverlay}:
                    </span>
                    <span className="mono-small" style={{ fontWeight: 700, color: '#b388ff' }}>
                      {hoveredData.greekVal >= 0 ? '+' : ''}{hoveredData.greekVal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        /* OptionStrat-Style Price x Date P&L Heatmap Matrix */
        <div className="md-table-container" style={{ maxHeight: 380, overflowY: 'auto' }}>
          <table className="md-table" style={{ fontSize: 11, borderCollapse: 'separate', borderSpacing: 2 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 2, backgroundColor: 'var(--md-sys-color-surface-container)' }}>
                  Price / Move
                </th>
                {heatmapData.dayColumns.map((col, idx) => (
                  <th key={idx} style={{ textAlign: 'center', padding: '6px 8px' }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  <td
                    className="mono-small"
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      fontWeight: row.isSpotRow ? 700 : 500,
                      backgroundColor: row.isSpotRow
                        ? 'var(--md-sys-color-primary-container)'
                        : 'var(--md-sys-color-surface-container)',
                      color: row.isSpotRow
                        ? 'var(--md-sys-color-on-primary-container)'
                        : 'var(--md-sys-color-on-surface)',
                      padding: '4px 8px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    ${row.price.toFixed(1)}{' '}
                    <span style={{ fontSize: 9, opacity: 0.75 }}>
                      ({row.pctMove >= 0 ? '+' : ''}{row.pctMove.toFixed(1)}%)
                    </span>
                  </td>
                  {row.cells.map((cell, cIdx) => {
                    const isPos = cell.pnl >= 0;
                    const ratio = isPos
                      ? Math.min(1, cell.pnl / Math.max(1, condorEval.maxGain))
                      : Math.min(1, Math.abs(cell.pnl) / Math.max(1, condorEval.maxLoss));
                    const alpha = (0.12 + 0.52 * ratio).toFixed(2);
                    const bg = isPos
                      ? `rgba(0, 168, 107, ${alpha})`
                      : `rgba(255, 86, 48, ${alpha})`;

                    return (
                      <td
                        key={cIdx}
                        className="mono-small"
                        style={{
                          backgroundColor: bg,
                          color: 'var(--md-sys-color-on-surface)',
                          textAlign: 'center',
                          padding: '5px 6px',
                          borderRadius: 4,
                          fontWeight: 600,
                          fontSize: 11
                        }}
                        title={`Price: $${row.price.toFixed(2)} | ${heatmapData.dayColumns[cIdx].label}: ${formatCurrency(cell.pnl)} (${cell.pctOfRisk.toFixed(1)}% of max risk)`}
                      >
                        {heatmapUnit === 'dollar'
                          ? `${cell.pnl >= 0 ? '+' : ''}$${Math.round(cell.pnl).toLocaleString()}`
                          : `${cell.pctOfRisk >= 0 ? '+' : ''}${cell.pctOfRisk.toFixed(0)}%`}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

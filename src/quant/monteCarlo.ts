import { inverseNormalCdf } from './distributions';
import { StrategyMode } from './types';

export interface MonteCarloResult {
  simulations: number;
  empiricalWinRate: number;
  empiricalMeanPnL: number;
  empiricalMedianPnL: number;
  empiricalStdDev: number;
  var95: number;
  var99: number;
  cvar95: number;
  pricePathsSample: number[][]; // For visual rendering of sample paths
  histogram: { binStart: number; binEnd: number; count: number }[];
}

/**
 * Simulates Iron Condor or Vertical Spread expiration P&L using Geometric Brownian Motion.
 */
export function runMonteCarloSimulation(
  S0: number,
  dte: number,
  sigma: number,
  callShort: number,
  callLong: number,
  putShort: number,
  putLong: number,
  totalCreditDollars: number,
  contracts: number,
  simulations = 10000,
  r = 0,
  q = 0,
  mode: StrategyMode = 'iron-condor'
): MonteCarloResult {
  const T = dte / 365;
  const sqrtT = Math.sqrt(T);
  const drift = (r - q - 0.5 * sigma * sigma) * T;
  const vol = sigma * sqrtT;
  const multiplier = contracts * 100;

  const pnlResults = new Float64Array(simulations);
  let winCount = 0;
  let sumPnL = 0;

  // Track sample paths (e.g. 25 paths across 10 time steps)
  const sampleSteps = 10;
  const samplePathCount = 25;
  const dt = T / sampleSteps;
  const stepDrift = (r - q - 0.5 * sigma * sigma) * dt;
  const stepVol = sigma * Math.sqrt(dt);
  const samplePaths: number[][] = [];

  for (let p = 0; p < samplePathCount; p++) {
    const path = [S0];
    let currentS = S0;
    for (let step = 1; step <= sampleSteps; step++) {
      const u = Math.random();
      const z = inverseNormalCdf(Math.max(1e-7, Math.min(1 - 1e-7, u)));
      currentS = currentS * Math.exp(stepDrift + stepVol * z);
      path.push(currentS);
    }
    samplePaths.push(path);
  }

  const includeCall = mode === 'iron-condor' || mode === 'call-spread';
  const includePut = mode === 'iron-condor' || mode === 'put-spread';

  // Terminal price simulation using inverse CDF for accurate normal variates
  for (let i = 0; i < simulations; i++) {
    const u = Math.random();
    const z = inverseNormalCdf(Math.max(1e-7, Math.min(1 - 1e-7, u)));
    const ST = S0 * Math.exp(drift + vol * z);

    // Call wing liability
    let callLoss = 0;
    if (includeCall && ST > callShort) {
      callLoss = Math.min(ST - callShort, Math.abs(callLong - callShort)) * multiplier;
    }

    // Put wing liability
    let putLoss = 0;
    if (includePut && ST < putShort) {
      putLoss = Math.min(putShort - ST, Math.abs(putShort - putLong)) * multiplier;
    }

    const netPnL = totalCreditDollars - callLoss - putLoss;
    pnlResults[i] = netPnL;
    if (netPnL >= 0) winCount++;
    sumPnL += netPnL;
  }

  // Sort PnL for quantiles
  pnlResults.sort();

  const empiricalWinRate = winCount / simulations;
  const empiricalMeanPnL = sumPnL / simulations;
  const empiricalMedianPnL = pnlResults[Math.floor(simulations * 0.5)];

  // Variance & StdDev
  let sumSqDiff = 0;
  for (let i = 0; i < simulations; i++) {
    const diff = pnlResults[i] - empiricalMeanPnL;
    sumSqDiff += diff * diff;
  }
  const empiricalStdDev = Math.sqrt(sumSqDiff / simulations);

  // VaR 95% and 99%
  const idx95 = Math.floor(simulations * 0.05);
  const idx99 = Math.floor(simulations * 0.01);
  const var95 = -pnlResults[idx95];
  const var99 = -pnlResults[idx99];

  // CVaR (Expected Shortfall) at 95%
  let cvarSum = 0;
  for (let i = 0; i < idx95; i++) {
    cvarSum += pnlResults[i];
  }
  const cvar95 = -(cvarSum / idx95);

  // Build histogram
  const binCount = 20;
  const minVal = pnlResults[0];
  const maxVal = pnlResults[simulations - 1];
  const binWidth = (maxVal - minVal) / binCount;
  const histogram: { binStart: number; binEnd: number; count: number }[] = [];

  for (let b = 0; b < binCount; b++) {
    histogram.push({
      binStart: minVal + b * binWidth,
      binEnd: minVal + (b + 1) * binWidth,
      count: 0
    });
  }

  for (let i = 0; i < simulations; i++) {
    const val = pnlResults[i];
    let binIdx = Math.floor((val - minVal) / binWidth);
    if (binIdx >= binCount) binIdx = binCount - 1;
    histogram[binIdx].count++;
  }

  return {
    simulations,
    empiricalWinRate,
    empiricalMeanPnL,
    empiricalMedianPnL,
    empiricalStdDev,
    var95,
    var99,
    cvar95,
    pricePathsSample: samplePaths,
    histogram
  };
}

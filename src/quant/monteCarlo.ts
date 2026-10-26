import { inverseNormalCdf } from './distributions';
import { blackScholes } from './blackScholes';
import { StrategyMode } from './types';

export type SimulationRegime = 'gbm' | 'jump-diffusion';

export interface MonteCarloConfig {
  seed?: number;
  regime?: SimulationRegime;
  takeProfitPct?: number | null; // e.g., 0.50 for 50% max profit early exit
  stopLossMultiple?: number | null; // e.g., 2.0 for 2x credit loss stop
}

export interface MonteCarloResult {
  simulations: number;
  empiricalWinRate: number;
  empiricalMeanPnL: number;
  empiricalMedianPnL: number;
  empiricalStdDev: number;
  var95: number;
  var99: number;
  cvar95: number;
  takeProfitRate: number;
  stopLossRate: number;
  avgDaysHeld: number;
  unmanagedWinRate: number;
  unmanagedMeanPnL: number;
  pricePathsSample: number[][]; // For visual rendering of sample paths
  histogram: { binStart: number; binEnd: number; count: number }[];
}

/**
 * Deterministic Mulberry32 PRNG for reproducible institutional audit simulations
 */
export function createSeededPRNG(seed: number): () => number {
  let a = (seed ^ 0xdeadbeef) >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Simulates multi-leg strategy P&L using Antithetic Variates, optional Merton Jump-Diffusion,
 * and path-dependent early management rules (Take-Profit % & Stop-Loss Multiple).
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
  mode: StrategyMode = 'iron-condor',
  config: MonteCarloConfig = {}
): MonteCarloResult {
  const seed = config.seed ?? 42;
  const regime = config.regime ?? 'gbm';
  const takeProfitPct = config.takeProfitPct ?? null;
  const stopLossMultiple = config.stopLossMultiple ?? null;
  const hasManagementRules = takeProfitPct !== null || stopLossMultiple !== null;

  const rng = createSeededPRNG(seed * 9973 + simulations);
  const T = Math.max(1, dte) / 365;
  const multiplier = contracts * 100;

  const includeCall = mode !== 'put-spread';
  const includePut = mode !== 'call-spread';
  const hasLongWings = mode !== 'short-strangle';

  // Jump-Diffusion parameters (Merton model: crash/gap shocks)
  const lambdaJump = regime === 'jump-diffusion' ? 3.5 : 0; // 3.5 jump events/year
  const muJump = -0.025; // -2.5% mean jump size
  const sigmaJump = 0.045; // 4.5% jump volatility
  const kJump = Math.exp(muJump + 0.5 * sigmaJump * sigmaJump) - 1;

  const calcTerminalPnL = (ST: number): number => {
    let callLoss = 0;
    if (includeCall && ST > callShort) {
      const rawCallLoss = ST - callShort;
      callLoss = (hasLongWings ? Math.min(rawCallLoss, Math.abs(callLong - callShort)) : rawCallLoss) * multiplier;
    }
    let putLoss = 0;
    if (includePut && ST < putShort) {
      const rawPutLoss = putShort - ST;
      putLoss = (hasLongWings ? Math.min(rawPutLoss, Math.abs(putShort - putLong)) : rawPutLoss) * multiplier;
    }
    return totalCreditDollars - callLoss - putLoss;
  };

  const calcInterimPnL = (St: number, remT: number): number => {
    if (remT <= 0.0001) return calcTerminalPnL(St);
    let debitToClose = 0;
    if (includeCall) {
      const sc = blackScholes('call', St, callShort, remT, sigma, r, q).price;
      const lc = hasLongWings ? blackScholes('call', St, callLong, remT, sigma, r, q).price : 0;
      debitToClose += Math.max(0, sc - lc) * multiplier;
    }
    if (includePut) {
      const sp = blackScholes('put', St, putShort, remT, sigma, r, q).price;
      const lp = hasLongWings ? blackScholes('put', St, putLong, remT, sigma, r, q).price : 0;
      debitToClose += Math.max(0, sp - lp) * multiplier;
    }
    return totalCreditDollars - debitToClose;
  };

  // Track 25 visual sample paths across 10 steps
  const sampleSteps = 10;
  const samplePathCount = 25;
  const dtSample = T / sampleSteps;
  const stepDriftSample = (r - q - 0.5 * sigma * sigma - lambdaJump * kJump) * dtSample;
  const stepVolSample = sigma * Math.sqrt(dtSample);
  const samplePaths: number[][] = [];

  for (let p = 0; p < samplePathCount; p++) {
    const path = [S0];
    let currentS = S0;
    for (let step = 1; step <= sampleSteps; step++) {
      const u = Math.max(1e-7, Math.min(1 - 1e-7, rng()));
      const z = inverseNormalCdf(u);
      let jumpLog = 0;
      if (regime === 'jump-diffusion' && rng() < lambdaJump * dtSample) {
        const uj = Math.max(1e-7, Math.min(1 - 1e-7, rng()));
        jumpLog = muJump + sigmaJump * inverseNormalCdf(uj);
      }
      currentS = currentS * Math.exp(stepDriftSample + stepVolSample * z + jumpLog);
      path.push(currentS);
    }
    samplePaths.push(path);
  }

  const pnlResults = new Float64Array(simulations);
  let winCount = 0;
  let sumPnL = 0;
  let unmanagedWins = 0;
  let unmanagedSumPnL = 0;
  let takeProfitHits = 0;
  let stopLossHits = 0;
  let totalDaysHeld = 0;

  const takeProfitTarget = takeProfitPct !== null ? totalCreditDollars * takeProfitPct : Infinity;
  const stopLossLimit = stopLossMultiple !== null ? -totalCreditDollars * stopLossMultiple : -Infinity;

  const pathSteps = hasManagementRules ? Math.max(4, Math.min(10, dte)) : 1;
  const dt = T / pathSteps;
  const stepDrift = (r - q - 0.5 * sigma * sigma - lambdaJump * kJump) * dt;
  const stepVol = sigma * Math.sqrt(dt);

  // Antithetic Variates simulation loop (pairs +z and -z for variance reduction)
  const halfSims = Math.floor(simulations / 2);

  for (let i = 0; i < halfSims; i++) {
    for (let sign = 1; sign >= -1; sign -= 2) {
      const idx = sign === 1 ? i * 2 : i * 2 + 1;
      if (idx >= simulations) break;

      if (!hasManagementRules && regime === 'gbm') {
        // Fast single-step terminal evaluation with antithetic pairing
        const u = sign === 1 ? Math.max(1e-7, Math.min(1 - 1e-7, rng())) : 0.5;
        // Store z from sign === 1
        const z = sign === 1 ? inverseNormalCdf(u) : -lastZ;
        if (sign === 1) lastZ = z;

        const ST = S0 * Math.exp((r - q - 0.5 * sigma * sigma) * T + sigma * Math.sqrt(T) * z);
        const netPnL = calcTerminalPnL(ST);
        pnlResults[idx] = netPnL;
        if (netPnL >= 0) {
          winCount++;
          unmanagedWins++;
        }
        sumPnL += netPnL;
        unmanagedSumPnL += netPnL;
        totalDaysHeld += dte;
      } else {
        // Multi-step path simulation for Jump-Diffusion or Early Management Rules
        let currentS = S0;
        let closedEarly = false;
        let realizedPnL = 0;
        let daysHeld = dte;

        for (let step = 1; step <= pathSteps; step++) {
          const u = Math.max(1e-7, Math.min(1 - 1e-7, rng()));
          const z = inverseNormalCdf(u) * sign;
          let jumpLog = 0;
          if (regime === 'jump-diffusion' && rng() < lambdaJump * dt) {
            const uj = Math.max(1e-7, Math.min(1 - 1e-7, rng()));
            jumpLog = muJump + sigmaJump * inverseNormalCdf(uj);
          }
          currentS = currentS * Math.exp(stepDrift + stepVol * z + jumpLog);

          if (hasManagementRules && !closedEarly && step < pathSteps) {
            const remT = T - step * dt;
            const interimPnL = calcInterimPnL(currentS, remT);
            if (takeProfitPct !== null && interimPnL >= takeProfitTarget) {
              realizedPnL = takeProfitTarget;
              closedEarly = true;
              takeProfitHits++;
              daysHeld = (step / pathSteps) * dte;
            } else if (stopLossMultiple !== null && interimPnL <= stopLossLimit) {
              realizedPnL = Math.max(-totalCreditDollars * 10, interimPnL);
              closedEarly = true;
              stopLossHits++;
              daysHeld = (step / pathSteps) * dte;
            }
          }
        }

        const terminalPnL = calcTerminalPnL(currentS);
        if (terminalPnL >= 0) unmanagedWins++;
        unmanagedSumPnL += terminalPnL;

        const finalPnL = closedEarly ? realizedPnL : terminalPnL;
        pnlResults[idx] = finalPnL;
        if (finalPnL >= 0) winCount++;
        sumPnL += finalPnL;
        totalDaysHeld += daysHeld;
      }
    }
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
  const idx95 = Math.max(1, Math.floor(simulations * 0.05));
  const idx99 = Math.max(1, Math.floor(simulations * 0.01));
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
  const span = Math.max(1, maxVal - minVal);
  const binWidth = span / binCount;
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
    if (binIdx < 0) binIdx = 0;
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
    takeProfitRate: takeProfitHits / simulations,
    stopLossRate: stopLossHits / simulations,
    avgDaysHeld: totalDaysHeld / simulations,
    unmanagedWinRate: unmanagedWins / simulations,
    unmanagedMeanPnL: unmanagedSumPnL / simulations,
    pricePathsSample: samplePaths,
    histogram
  };
}

let lastZ = 0;

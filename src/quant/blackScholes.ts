import { normalPdf, normalCdf } from './distributions';
import { OptionType, UnderlyingParams } from './types';

export interface BSResult {
  price: number;
  delta: number;
  gamma: number;
  theta: number; // per calendar day
  vega: number;  // per 1% IV shift (0.01)
  rho: number;   // per 1% rate shift (0.01)
  vanna: number; // dDelta / dVol per 1% IV shift
  volga: number; // dVega / dVol per 1% IV shift
  charm: number; // dDelta / dTime per calendar day
  speed: number; // dGamma / dSpot
  color: number; // dGamma / dTime per calendar day
  d1: number;
  d2: number;
  intrinsicValue: number;
  extrinsicValue: number;
}

/**
 * Evaluates strike-specific implied volatility under parametric SVI equity smirk.
 * When skewSlope = 0 (default), returns flat atmIV for 100% Excel parity.
 * When skewSlope > 0, OTM puts exhibit elevated IV and OTM calls exhibit curvature smile.
 */
export function getStrikeIV(
  strike: number,
  S0: number,
  atmIV: number,
  skewSlope = 0
): number {
  if (!skewSlope || skewSlope === 0 || S0 <= 0) {
    return atmIV;
  }
  const moneyness = (strike - S0) / S0; // negative for OTM puts, positive for OTM calls
  const skewAdj = -skewSlope * moneyness + 0.65 * skewSlope * moneyness * moneyness;
  return Math.max(0.02, atmIV + skewAdj);
}

/**
 * Calculates d1 and d2 in Black-Scholes-Merton model
 * S: spot price
 * K: strike price
 * T: time to maturity in years
 * r: risk-free rate
 * q: continuous dividend yield
 * sigma: volatility
 */
export function calculateD1D2(
  S: number,
  K: number,
  T: number,
  r: number,
  q: number,
  sigma: number
): { d1: number; d2: number } {
  if (T <= 0 || sigma <= 0) {
    const d1 = S > K ? Infinity : -Infinity;
    return { d1, d2: d1 };
  }
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  return { d1, d2 };
}

/**
 * Full Black-Scholes-Merton option pricing and analytical 1st, 2nd, and 3rd-order Greeks
 */
export function blackScholes(
  type: OptionType,
  S: number,
  K: number,
  T: number, // in years (e.g. 10/365)
  sigma: number,
  r = 0,
  q = 0
): BSResult {
  if (!Number.isFinite(S) || !Number.isFinite(K) || S <= 0 || K <= 0) {
    return {
      price: 0,
      delta: 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      vanna: 0,
      volga: 0,
      charm: 0,
      speed: 0,
      color: 0,
      d1: 0,
      d2: 0,
      intrinsicValue: 0,
      extrinsicValue: 0
    };
  }

  if (T <= 0 || sigma <= 0) {
    const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return {
      price: intrinsic,
      delta: type === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
      vanna: 0,
      volga: 0,
      charm: 0,
      speed: 0,
      color: 0,
      d1: 0,
      d2: 0,
      intrinsicValue: intrinsic,
      extrinsicValue: 0
    };
  }

  const { d1, d2 } = calculateD1D2(S, K, T, r, q, sigma);
  const sqrtT = Math.sqrt(T);
  const eqT = Math.exp(-q * T);
  const erT = Math.exp(-r * T);

  let price: number;
  let delta: number;
  let intrinsicValue: number;

  if (type === 'call') {
    intrinsicValue = Math.max(0, S - K);
    price = S * eqT * normalCdf(d1) - K * erT * normalCdf(d2);
    delta = eqT * normalCdf(d1);
  } else {
    intrinsicValue = Math.max(0, K - S);
    price = K * erT * normalCdf(-d2) - S * eqT * normalCdf(-d1);
    delta = -eqT * normalCdf(-d1);
  }

  // Price cannot be less than intrinsic
  price = Math.max(price, intrinsicValue);
  const extrinsicValue = Math.max(0, price - intrinsicValue);

  // Common Greeks
  const pdfD1 = normalPdf(d1);
  const gamma = (eqT * pdfD1) / (S * sigma * sqrtT);
  const vegaTotal = S * eqT * sqrtT * pdfD1;
  const vega = vegaTotal * 0.01; // Scaled to 1% change

  // Second-order Volatility Greeks (Vanna & Volga/Vomma)
  const vanna = sigma > 0 ? (-eqT * pdfD1 * (d2 / sigma)) * 0.01 : 0;
  const volga = sigma > 0 ? vega * ((d1 * d2) / sigma) * 0.01 : 0;

  // Higher-Order Time & Spot Greeks (Charm, Speed, Color)
  const driftRatio = (2 * (r - q) * T - d2 * sigma * sqrtT) / (2 * T * sigma * sqrtT);
  const charmAnnual =
    type === 'call'
      ? -q * eqT * normalCdf(d1) + eqT * pdfD1 * driftRatio
      : q * eqT * normalCdf(-d1) + eqT * pdfD1 * driftRatio;
  // Daily delta change as 1 calendar day passes (-dDelta/dT / 365)
  const charm = -charmAnnual / 365;

  // Speed: dGamma / dSpot
  const speed = S > 0 && sigma > 0 ? -(gamma / S) * (d1 / (sigma * sqrtT) + 1) : 0;

  // Color: dGamma / dTime per calendar day
  const colorAnnual =
    S > 0 && sigma > 0
      ? (-eqT * pdfD1 / (2 * S * T * sigma * sqrtT)) *
        (2 * q * T + 1 + ((2 * (r - q) * T - d2 * sigma * sqrtT) / (sigma * sqrtT)) * d1)
      : 0;
  const color = -colorAnnual / 365;

  let thetaAnnual: number;
  let rhoTotal: number;

  const term1 = -(S * sigma * eqT * pdfD1) / (2 * sqrtT);
  if (type === 'call') {
    thetaAnnual = term1 - r * K * erT * normalCdf(d2) + q * S * eqT * normalCdf(d1);
    rhoTotal = K * T * erT * normalCdf(d2);
  } else {
    thetaAnnual = term1 + r * K * erT * normalCdf(-d2) - q * S * eqT * normalCdf(-d1);
    rhoTotal = -K * T * erT * normalCdf(-d2);
  }

  const theta = thetaAnnual / 365; // Scaled to 1 calendar day
  const rho = rhoTotal * 0.01; // Scaled to 1% interest rate shift

  return {
    price,
    delta,
    gamma,
    theta,
    vega,
    rho,
    vanna,
    volga,
    charm,
    speed,
    color,
    d1,
    d2,
    intrinsicValue,
    extrinsicValue
  };
}

/**
 * Finds the optimal OTM strike matching a target absolute Delta (e.g. 0.10, 0.16, 0.20, 0.30),
 * snapped to the nearest strike step or $1 increment.
 */
export function findStrikeByDelta(
  type: OptionType,
  targetAbsDelta: number,
  params: UnderlyingParams
): number {
  const S0 = params.spotPrice;
  const T = Math.max(0.001, params.dte / 365);
  const step = params.strikeGap >= 1 ? Math.min(params.strikeGap, 5) : params.strikeGap || 1;
  const anchor = Math.round(S0 / step) * step;

  let bestStrike = type === 'call' ? anchor + step : anchor - step;
  let minDiff = Infinity;

  for (let i = 1; i <= 40; i++) {
    const candidate = type === 'call' ? anchor + i * step : anchor - i * step;
    if (candidate <= 0) continue;
    const sigma = getStrikeIV(candidate, S0, params.atmIV, params.skewSlope);
    const bs = blackScholes(type, S0, candidate, T, sigma, params.riskFreeRate, params.dividendYield);
    const absDelta = Math.abs(bs.delta);
    const diff = Math.abs(absDelta - targetAbsDelta);
    if (diff < minDiff) {
      minDiff = diff;
      bestStrike = candidate;
    }
  }

  return bestStrike;
}

/**
 * Computes theoretical Black-Scholes net credit ($/share) for a vertical spread or single short leg.
 */
export function estimateSpreadCredit(
  type: OptionType,
  shortStrike: number,
  longStrike: number,
  params: UnderlyingParams,
  hasLongWing = true
): number {
  const S0 = params.spotPrice;
  if (S0 <= 0 || shortStrike <= 0 || params.dte <= 0 || params.atmIV <= 0) {
    return 0;
  }
  const T = Math.max(0.001, params.dte / 365);
  const skew = params.skewSlope ?? 0;
  const shortIV = getStrikeIV(shortStrike, S0, params.atmIV, skew);
  const shortPrice = blackScholes(type, S0, shortStrike, T, shortIV, params.riskFreeRate, params.dividendYield).price;

  if (!hasLongWing || longStrike <= 0) {
    return Math.max(0.05, Number(shortPrice.toFixed(2)));
  }

  const longIV = getStrikeIV(longStrike, S0, params.atmIV, skew);
  const longPrice = blackScholes(type, S0, longStrike, T, longIV, params.riskFreeRate, params.dividendYield).price;
  return Math.max(0.05, Number(Math.max(0, shortPrice - longPrice).toFixed(2)));
}

/**
 * Solve for implied volatility given market price using Brent's method
 */
export function impliedVolatility(
  targetPrice: number,
  type: OptionType,
  S: number,
  K: number,
  T: number,
  r = 0,
  q = 0
): number {
  const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  if (targetPrice <= intrinsic) return 0.0001;

  let low = 0.0001;
  let high = 5.0; // 500% IV
  const maxIter = 100;
  const tol = 1e-6;

  for (let i = 0; i < maxIter; i++) {
    const mid = (low + high) / 2;
    const estPrice = blackScholes(type, S, K, T, mid, r, q).price;
    const diff = estPrice - targetPrice;

    if (Math.abs(diff) < tol || (high - low) / 2 < tol) {
      return mid;
    }

    if (diff > 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}

import { normalPdf, normalCdf } from './distributions';
import { OptionType } from './types';

export interface BSResult {
  price: number;
  delta: number;
  gamma: number;
  theta: number; // per calendar day
  vega: number;  // per 1% IV shift (0.01)
  rho: number;   // per 1% rate shift (0.01)
  d1: number;
  d2: number;
  intrinsicValue: number;
  extrinsicValue: number;
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
 * Full Black-Scholes-Merton option pricing and analytical Greeks
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
  if (T <= 0) {
    const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return {
      price: intrinsic,
      delta: type === 'call' ? (S > K ? 1 : 0) : (S < K ? -1 : 0),
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0,
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
  const gamma = (eqT * normalPdf(d1)) / (S * sigma * sqrtT);
  const vegaTotal = S * eqT * sqrtT * normalPdf(d1);
  const vega = vegaTotal * 0.01; // Scaled to 1% change

  let thetaAnnual: number;
  let rhoTotal: number;

  const term1 = -(S * sigma * eqT * normalPdf(d1)) / (2 * sqrtT);
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
    d1,
    d2,
    intrinsicValue,
    extrinsicValue
  };
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

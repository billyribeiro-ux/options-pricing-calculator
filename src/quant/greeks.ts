import { blackScholes } from './blackScholes';
import { GreeksResult, StrategyMode, UnderlyingParams } from './types';

/**
 * Calculates net Greeks for an Iron Condor, Bear Call Spread, or Bull Put Spread.
 */
export function calculateIronCondorGreeks(
  callShort: number,
  callLong: number,
  putShort: number,
  putLong: number,
  contracts: number,
  params: UnderlyingParams,
  mode: StrategyMode = 'iron-condor'
): GreeksResult {
  const S0 = params.spotPrice;
  const T = params.dte / 365;
  const sigma = params.atmIV;
  const r = params.riskFreeRate;
  const q = params.dividendYield;
  const multiplier = contracts * 100;

  // Short Call (sell 1)
  const sc = blackScholes('call', S0, callShort, T, sigma, r, q);
  // Long Call (buy 1)
  const lc = blackScholes('call', S0, callLong, T, sigma, r, q);
  // Short Put (sell 1)
  const sp = blackScholes('put', S0, putShort, T, sigma, r, q);
  // Long Put (buy 1)
  const lp = blackScholes('put', S0, putLong, T, sigma, r, q);

  const includeCall = mode === 'iron-condor' || mode === 'call-spread' ? 1 : 0;
  const includePut = mode === 'iron-condor' || mode === 'put-spread' ? 1 : 0;

  const delta = (includeCall * (-sc.delta + lc.delta) + includePut * (-sp.delta + lp.delta)) * multiplier;
  const gamma = (includeCall * (-sc.gamma + lc.gamma) + includePut * (-sp.gamma + lp.gamma)) * multiplier;
  const theta = (includeCall * (-sc.theta + lc.theta) + includePut * (-sp.theta + lp.theta)) * multiplier;
  const vega = (includeCall * (-sc.vega + lc.vega) + includePut * (-sp.vega + lp.vega)) * multiplier;
  const rho = (includeCall * (-sc.rho + lc.rho) + includePut * (-sp.rho + lp.rho)) * multiplier;
  const vanna = (includeCall * (-sc.vanna + lc.vanna) + includePut * (-sp.vanna + lp.vanna)) * multiplier;
  const volga = (includeCall * (-sc.volga + lc.volga) + includePut * (-sp.volga + lp.volga)) * multiplier;

  return { delta, gamma, theta, vega, rho, vanna, volga };
}

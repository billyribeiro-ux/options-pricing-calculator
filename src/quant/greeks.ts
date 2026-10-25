import { blackScholes } from './blackScholes';
import { GreeksResult, UnderlyingParams } from './types';

/**
 * Calculates net Greeks for an Iron Condor or custom spread.
 */
export function calculateIronCondorGreeks(
  callShort: number,
  callLong: number,
  putShort: number,
  putLong: number,
  contracts: number,
  params: UnderlyingParams
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

  // Net position: -ShortCall + LongCall - ShortPut + LongPut
  const delta = (-sc.delta + lc.delta - sp.delta + lp.delta) * multiplier;
  const gamma = (-sc.gamma + lc.gamma - sp.gamma + lp.gamma) * multiplier;
  const theta = (-sc.theta + lc.theta - sp.theta + lp.theta) * multiplier;
  const vega = (-sc.vega + lc.vega - sp.vega + lp.vega) * multiplier;
  const rho = (-sc.rho + lc.rho - sp.rho + lp.rho) * multiplier;

  return { delta, gamma, theta, vega, rho };
}

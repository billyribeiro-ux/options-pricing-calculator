import { blackScholes, getStrikeIV } from './blackScholes';
import { GreeksResult, StrategyMode, UnderlyingParams } from './types';

/**
 * Calculates net Greeks for an Iron Condor, Iron Butterfly, Short Strangle, Bear Call Spread, or Bull Put Spread
 * at any target spot price, remaining DTE, and IV shift.
 */
export function calculatePositionGreeksAtSpot(
  spot: number,
  dteRemaining: number,
  ivShift: number,
  callShort: number,
  callLong: number,
  putShort: number,
  putLong: number,
  contracts: number,
  params: UnderlyingParams,
  mode: StrategyMode = 'iron-condor'
): GreeksResult {
  const T = Math.max(0.0001, dteRemaining / 365);
  const baseIV = Math.max(0.01, params.atmIV + ivShift);
  const skew = params.skewSlope ?? 0;
  const r = params.riskFreeRate;
  const q = params.dividendYield;
  const multiplier = contracts * 100;

  const scIV = getStrikeIV(callShort, spot, baseIV, skew);
  const lcIV = getStrikeIV(callLong, spot, baseIV, skew);
  const spIV = getStrikeIV(putShort, spot, baseIV, skew);
  const lpIV = getStrikeIV(putLong, spot, baseIV, skew);

  // Short Call (sell 1)
  const sc = blackScholes('call', spot, callShort, T, scIV, r, q);
  // Long Call (buy 1)
  const lc = blackScholes('call', spot, callLong, T, lcIV, r, q);
  // Short Put (sell 1)
  const sp = blackScholes('put', spot, putShort, T, spIV, r, q);
  // Long Put (buy 1)
  const lp = blackScholes('put', spot, putLong, T, lpIV, r, q);

  const includeCall = mode !== 'put-spread' ? 1 : 0;
  const includePut = mode !== 'call-spread' ? 1 : 0;
  const hasLongWings = mode !== 'short-strangle' ? 1 : 0;

  const net = (scVal: number, lcVal: number, spVal: number, lpVal: number) =>
    (includeCall * (-scVal + hasLongWings * lcVal) + includePut * (-spVal + hasLongWings * lpVal)) * multiplier;

  return {
    delta: net(sc.delta, lc.delta, sp.delta, lp.delta),
    gamma: net(sc.gamma, lc.gamma, sp.gamma, lp.gamma),
    theta: net(sc.theta, lc.theta, sp.theta, lp.theta),
    vega: net(sc.vega, lc.vega, sp.vega, lp.vega),
    rho: net(sc.rho, lc.rho, sp.rho, lp.rho),
    vanna: net(sc.vanna, lc.vanna, sp.vanna, lp.vanna),
    volga: net(sc.volga, lc.volga, sp.volga, lp.volga),
    charm: net(sc.charm, lc.charm, sp.charm, lp.charm),
    speed: net(sc.speed, lc.speed, sp.speed, lp.speed),
    color: net(sc.color, lc.color, sp.color, lp.color)
  };
}

/**
 * Calculates net Greeks at current spot price and DTE.
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
  return calculatePositionGreeksAtSpot(
    params.spotPrice,
    params.dte,
    0,
    callShort,
    callLong,
    putShort,
    putLong,
    contracts,
    params,
    mode
  );
}

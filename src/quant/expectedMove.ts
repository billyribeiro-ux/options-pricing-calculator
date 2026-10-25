import { VolatilityBands, UnderlyingParams } from './types';
import { blackScholes } from './blackScholes';

/**
 * Calculates standard deviation volatility bands and market maker move.
 * Directly matches and expands upon Option Pricing.xlsx rows 8-16.
 */
export function calculateVolatilityBands(params: UnderlyingParams): VolatilityBands {
  const S = params.spotPrice;
  const sigma = params.atmIV;
  const T = params.dte / 365;
  const sqrtT = Math.sqrt(T);

  // 1 Std Dev Move = S * sigma * sqrt(T) (Row 8, Column I)
  const oneStdDevMove = S * sigma * sqrtT;
  const upper1Sigma = S + oneStdDevMove;
  const lower1Sigma = S - oneStdDevMove;

  // 2 Std Dev Move = 2 * oneStdDev (Row 9, Column I)
  const twoStdDevMove = oneStdDevMove * 2;
  const upper2Sigma = S + twoStdDevMove;
  const lower2Sigma = S - twoStdDevMove;

  // Market Maker Move from Straddle
  let straddlePrice = params.atmStraddleAsk;
  if (straddlePrice === undefined || straddlePrice <= 0) {
    // Calculate synthetic ATM straddle if not supplied
    const callATM = blackScholes('call', S, S, T, sigma, params.riskFreeRate, params.dividendYield).price;
    const putATM = blackScholes('put', S, S, T, sigma, params.riskFreeRate, params.dividendYield).price;
    straddlePrice = callATM + putATM;
  }

  const factor = params.straddleFactor ?? 0.85;
  const marketMakerMove = straddlePrice * factor;

  return {
    oneStdDevMove,
    upper1Sigma,
    lower1Sigma,
    twoStdDevMove,
    upper2Sigma,
    lower2Sigma,
    marketMakerMove
  };
}

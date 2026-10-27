import { IronCondorEvaluation, StrategyMode, UnderlyingParams } from './types';
import { evaluateSpread, probITMDriftless } from './expectations';
import { calculateIronCondorGreeks } from './greeks';
import { getStrikeIV } from './blackScholes';

export function evaluateIronCondor(
  callShort: number,
  callLong: number,
  callCredit: number,
  putShort: number,
  putLong: number,
  putCredit: number,
  params: UnderlyingParams,
  mode: StrategyMode = 'iron-condor'
): IronCondorEvaluation {
  const contracts = params.contracts;
  const multiplier = contracts * 100;

  // For Short Strangle, long hedge wings are effectively synthetic wide wings (20% OTM) for BPR/risk bounding
  const effectiveCallLong = mode === 'short-strangle' ? Math.round(params.spotPrice * 1.2) : callLong;
  const effectivePutLong = mode === 'short-strangle' ? Math.round(params.spotPrice * 0.8) : putLong;

  const callSpread = evaluateSpread('call', callShort, effectiveCallLong, callCredit, params);
  const putSpread = evaluateSpread('put', putShort, effectivePutLong, putCredit, params);

  if (
    params.spotPrice <= 0 ||
    params.contracts <= 0 ||
    params.dte <= 0 ||
    params.atmIV <= 0 ||
    (callShort <= 0 && putShort <= 0)
  ) {
    return {
      mode,
      callSpread,
      putSpread,
      totalCreditPerShare: 0,
      totalCreditDollars: 0,
      marginRequired: 0,
      maxGain: 0,
      maxLoss: 0,
      breakevenLow: 0,
      breakevenHigh: 0,
      returnOnRisk: 0,
      returnOnMargin: 0,
      kellyFraction: 0,
      probMaxProfit: 0,
      prob50Profit: 0,
      probAnyLoss: 0,
      excelCombinedEV: 0,
      exactCombinedEV: 0,
      exactRewardRisk: 0,
      greeks: {
        delta: 0,
        gamma: 0,
        theta: 0,
        vega: 0,
        rho: 0,
        vanna: 0,
        volga: 0,
        charm: 0,
        speed: 0,
        color: 0
      }
    };
  }

  const callWidth = Math.abs(effectiveCallLong - callShort);
  const putWidth = Math.abs(effectivePutLong - putShort);

  let totalCreditPerShare: number;
  let totalCreditDollars: number;
  let marginRequired: number;
  let maxGain: number;
  let maxLoss: number;
  let breakevenLow: number;
  let breakevenHigh: number;
  let probMaxProfit: number;
  let excelCombinedEV: number;
  let exactCombinedEV: number;
  let exactRewardRisk: number;

  if (mode === 'call-spread') {
    totalCreditPerShare = callCredit;
    totalCreditDollars = callSpread.totalCredit;
    marginRequired = callWidth * multiplier;
    maxGain = callSpread.trueMaxGain;
    maxLoss = callSpread.trueMaxLoss;
    breakevenLow = 0;
    breakevenHigh = callShort + callCredit;
    probMaxProfit = callSpread.probMaxProfit;
    excelCombinedEV = callSpread.excelEV;
    exactCombinedEV = callSpread.exactEV;
    exactRewardRisk = callSpread.exactRewardRisk;
  } else if (mode === 'put-spread') {
    totalCreditPerShare = putCredit;
    totalCreditDollars = putSpread.totalCredit;
    marginRequired = putWidth * multiplier;
    maxGain = putSpread.trueMaxGain;
    maxLoss = putSpread.trueMaxLoss;
    breakevenLow = putShort - putCredit;
    breakevenHigh = Infinity;
    probMaxProfit = putSpread.probMaxProfit;
    excelCombinedEV = putSpread.excelEV;
    exactCombinedEV = putSpread.exactEV;
    exactRewardRisk = putSpread.exactRewardRisk;
  } else {
    // Iron Condor, Iron Butterfly, or Short Strangle
    totalCreditPerShare = callCredit + putCredit;
    totalCreditDollars = totalCreditPerShare * multiplier;
    const maxSpreadWidth = Math.max(callWidth, putWidth);

    // In an Iron Condor / Iron Butterfly, only one side can be at maximum loss at expiration.
    // The credit collected from BOTH wings reduces the loss.
    marginRequired =
      mode === 'short-strangle'
        ? Math.round(params.spotPrice * 0.2 * multiplier) // Reg-T ~20% naked strangle BPR
        : maxSpreadWidth * multiplier;
    maxGain = totalCreditDollars;
    maxLoss =
      mode === 'short-strangle'
        ? Math.max(0, (maxSpreadWidth - totalCreditPerShare) * multiplier)
        : Math.max(0, (maxSpreadWidth - totalCreditPerShare) * multiplier);

    breakevenLow = putShort - totalCreditPerShare;
    breakevenHigh = callShort + totalCreditPerShare;

    // For Iron Butterfly (where putShort === callShort), probability of finishing inside breakevens is used for POP
    if (callShort <= putShort) {
      const skew = params.skewSlope ?? 0;
      const beHighIV = getStrikeIV(breakevenHigh, params.spotPrice, params.atmIV, skew);
      const beLowIV = getStrikeIV(breakevenLow, params.spotPrice, params.atmIV, skew);
      const pAboveHigh = probITMDriftless('call', params.spotPrice, breakevenHigh, beHighIV, params.dte);
      const pBelowLow = probITMDriftless('put', params.spotPrice, breakevenLow, beLowIV, params.dte);
      probMaxProfit = Math.max(0, 1 - pAboveHigh - pBelowLow);
    } else {
      // Probability of full profit: stock finishes between putShort and callShort
      probMaxProfit = Math.max(0, 1 - callSpread.probITM - putSpread.probITM);
    }

    // Combined Excel Model EV (isolated sums matching row 16)
    excelCombinedEV = callSpread.excelEV + putSpread.excelEV;

    // Exact Combined Quantitative EV
    exactCombinedEV = totalCreditDollars - callSpread.exactExpectedLoss - putSpread.exactExpectedLoss;
    const exactTotalExpectedLoss = callSpread.exactExpectedLoss + putSpread.exactExpectedLoss;
    exactRewardRisk = exactTotalExpectedLoss > 0 ? totalCreditDollars / exactTotalExpectedLoss : 0;
  }

  const returnOnRisk = maxLoss > 0 ? maxGain / maxLoss : 0;
  const returnOnMargin = marginRequired > 0 ? maxGain / marginRequired : 0;
  const probAnyLoss = probMaxProfit > 0 ? 1 - probMaxProfit : 0;

  // POP50: Probability of reaching 50% max profit prior to expiration via barrier reflection scaling
  const prob50Profit =
    probMaxProfit > 0 ? Math.min(0.995, 1 - Math.pow(Math.max(0.005, 1 - probMaxProfit), 1.65)) : 0;

  // Risk-adjusted Kelly Criterion fraction based on continuous expected value:
  // If EV > 0, optimal risk allocation scales with edge over max potential loss
  const kellyFraction = maxGain > 0 ? Math.max(0, Math.min(1, exactCombinedEV / maxGain)) : 0;

  // Complete Greeks across active legs
  const greeks = calculateIronCondorGreeks(callShort, effectiveCallLong, putShort, effectivePutLong, contracts, params, mode);

  return {
    mode,
    callSpread,
    putSpread,
    totalCreditPerShare,
    totalCreditDollars,
    marginRequired,
    maxGain,
    maxLoss,
    breakevenLow,
    breakevenHigh,
    returnOnRisk,
    returnOnMargin,
    kellyFraction,
    probMaxProfit,
    prob50Profit,
    probAnyLoss,
    excelCombinedEV,
    exactCombinedEV,
    exactRewardRisk,
    greeks
  };
}

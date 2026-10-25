import { IronCondorEvaluation, StrategyMode, UnderlyingParams } from './types';
import { evaluateSpread } from './expectations';
import { calculateIronCondorGreeks } from './greeks';

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

  const callSpread = evaluateSpread('call', callShort, callLong, callCredit, params);
  const putSpread = evaluateSpread('put', putShort, putLong, putCredit, params);

  const callWidth = Math.abs(callLong - callShort);
  const putWidth = Math.abs(putLong - putShort);

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
    totalCreditPerShare = callCredit + putCredit;
    totalCreditDollars = totalCreditPerShare * multiplier;
    const maxSpreadWidth = Math.max(callWidth, putWidth);

    // In an Iron Condor, only one side can be at maximum loss at expiration.
    // The credit collected from BOTH wings reduces the loss.
    marginRequired = maxSpreadWidth * multiplier;
    maxGain = totalCreditDollars;
    maxLoss = Math.max(0, (maxSpreadWidth - totalCreditPerShare) * multiplier);

    breakevenLow = putShort - totalCreditPerShare;
    breakevenHigh = callShort + totalCreditPerShare;

    // Probability of full profit: stock finishes between putShort and callShort
    probMaxProfit = Math.max(0, 1 - callSpread.probITM - putSpread.probITM);

    // Combined Excel Model EV (isolated sums matching row 16)
    excelCombinedEV = callSpread.excelEV + putSpread.excelEV;

    // Exact Combined Quantitative EV
    exactCombinedEV = totalCreditDollars - callSpread.exactExpectedLoss - putSpread.exactExpectedLoss;
    const exactTotalExpectedLoss = callSpread.exactExpectedLoss + putSpread.exactExpectedLoss;
    exactRewardRisk = exactTotalExpectedLoss > 0 ? totalCreditDollars / exactTotalExpectedLoss : Infinity;
  }

  const returnOnRisk = maxLoss > 0 ? maxGain / maxLoss : Infinity;
  const returnOnMargin = marginRequired > 0 ? maxGain / marginRequired : Infinity;
  const probAnyLoss = 1 - probMaxProfit;

  // Risk-adjusted Kelly Criterion fraction based on continuous expected value:
  // If EV > 0, optimal risk allocation scales with edge over max potential loss
  const kellyFraction = maxGain > 0 ? Math.max(0, Math.min(1, exactCombinedEV / maxGain)) : 0;

  // Complete Greeks across active legs
  const greeks = calculateIronCondorGreeks(callShort, callLong, putShort, putLong, contracts, params, mode);

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
    probAnyLoss,
    excelCombinedEV,
    exactCombinedEV,
    exactRewardRisk,
    greeks
  };
}

import { IronCondorEvaluation, UnderlyingParams } from './types';
import { evaluateSpread } from './expectations';
import { calculateIronCondorGreeks } from './greeks';

export function evaluateIronCondor(
  callShort: number,
  callLong: number,
  callCredit: number,
  putShort: number,
  putLong: number,
  putCredit: number,
  params: UnderlyingParams
): IronCondorEvaluation {
  const contracts = params.contracts;
  const multiplier = contracts * 100;

  const callSpread = evaluateSpread('call', callShort, callLong, callCredit, params);
  const putSpread = evaluateSpread('put', putShort, putLong, putCredit, params);

  const totalCreditPerShare = callCredit + putCredit;
  const totalCreditDollars = totalCreditPerShare * multiplier;

  const callWidth = Math.abs(callLong - callShort);
  const putWidth = Math.abs(putLong - putShort);
  const maxSpreadWidth = Math.max(callWidth, putWidth);

  // In an Iron Condor, only one side can be at maximum loss at expiration.
  // The credit collected from BOTH wings reduces the loss.
  const marginRequired = maxSpreadWidth * multiplier;
  const maxGain = totalCreditDollars;
  const maxLoss = Math.max(0, (maxSpreadWidth - totalCreditPerShare) * multiplier);

  const breakevenLow = putShort - totalCreditPerShare;
  const breakevenHigh = callShort + totalCreditPerShare;

  const returnOnRisk = maxLoss > 0 ? maxGain / maxLoss : Infinity;
  const returnOnMargin = marginRequired > 0 ? maxGain / marginRequired : Infinity;

  // Probability of full profit: stock finishes between putShort and callShort
  // P(putShort <= ST <= callShort) = 1 - P(ST > callShort) - P(ST < putShort)
  const probMaxProfit = Math.max(0, 1 - callSpread.probITM - putSpread.probITM);
  const probAnyLoss = 1 - probMaxProfit;

  // Combined Excel Model EV (isolated sums matching row 16)
  const excelCombinedEV = callSpread.excelEV + putSpread.excelEV;

  // Exact Combined Quantitative EV
  // Both credits received minus exact expected payouts
  const exactCombinedEV = totalCreditDollars - callSpread.exactExpectedLoss - putSpread.exactExpectedLoss;
  const exactTotalExpectedLoss = callSpread.exactExpectedLoss + putSpread.exactExpectedLoss;
  const exactRewardRisk = exactTotalExpectedLoss > 0 ? totalCreditDollars / exactTotalExpectedLoss : Infinity;

  // Complete Greeks across the 4 legs
  const greeks = calculateIronCondorGreeks(callShort, callLong, putShort, putLong, contracts, params);

  return {
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
    probMaxProfit,
    probAnyLoss,
    excelCombinedEV,
    exactCombinedEV,
    exactRewardRisk,
    greeks
  };
}

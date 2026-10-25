import { normalCdf } from './distributions';
import { blackScholes } from './blackScholes';
import { OptionType, SpreadEvaluation, StrikeMatrixRow, UnderlyingParams } from './types';

/**
 * Probability of expiring ITM under driftless lognormal model (matching Excel NORMSDIST)
 * Calls: P(ST > K) = 1 - Phi(ln(K/S0) / (sigma * sqrt(T)))
 * Puts:  P(ST < K) = Phi(ln(K/S0) / (sigma * sqrt(T)))
 */
export function probITMDriftless(
  type: OptionType,
  S0: number,
  K: number,
  sigma: number,
  dte: number
): number {
  const T = dte / 365;
  const denom = sigma * Math.sqrt(T);
  if (denom <= 0) return type === 'call' ? (S0 > K ? 1 : 0) : (S0 < K ? 1 : 0);
  const z = Math.log(K / S0) / denom;
  return type === 'call' ? 1 - normalCdf(z) : normalCdf(z);
}

/**
 * Evaluates a single vertical credit spread (Bear Call or Bull Put)
 * Computes both the Legacy Excel formulation and the Exact Continuous Mathematical Expectation.
 */
export function evaluateSpread(
  type: OptionType,
  shortStrike: number,
  longStrike: number,
  netCredit: number,
  params: UnderlyingParams
): SpreadEvaluation {
  const S0 = params.spotPrice;
  const sigma = params.atmIV;
  const dte = params.dte;
  const T = dte / 365;
  const contracts = params.contracts;
  const multiplier = contracts * 100;

  const spreadWidth = Math.abs(longStrike - shortStrike);
  const totalCredit = netCredit * multiplier;
  const trueMaxGain = totalCredit;
  const trueMaxLoss = (spreadWidth - netCredit) * multiplier;

  // Probabilities using Excel's driftless formula
  const probITM = probITMDriftless(type, S0, shortStrike, sigma, dte);
  const probFullLoss = probITMDriftless(type, S0, longStrike, sigma, dte);
  const probMaxProfit = 1 - probITM;

  // --- 1. LEGACY EXCEL SPREADSHEET FORMULAS ---
  // Row 25 & 39: Max Expected Gain = NetCredit * (1 - probITM) * contracts * 100
  const excelMaxGain = netCredit * (1 - probITM) * multiplier;
  
  // Row 26 & 40: Max Expected Pain = -SpreadWidth * probITM * contracts * 100
  // Note: Excel uses (short - long) for calls which is -5, and (long - short) for puts which is -5
  const excelMaxPain = -spreadWidth * probITM * multiplier;
  
  // Row 28 & 42: Expected Value = Gain + Pain
  const excelEV = excelMaxGain + excelMaxPain;
  
  // Row 29 & 43: Reward / Risk Ratio = Gain / -Pain
  const excelRewardRisk = excelMaxPain !== 0 ? excelMaxGain / -excelMaxPain : 0;
  
  // Row 31 & 45: Price for 1:1 Ratio = SpreadWidth * P / (1 - P)
  const excelPrice1to1 = (1 - probITM) > 0 ? (spreadWidth * probITM) / (1 - probITM) : 0;

  // --- 2. EXACT CONTINUOUS QUANTITATIVE MODEL ---
  // Exact expected loss takes into account partial loss in [K_short, K_long] and max loss beyond.
  // Using Black-Scholes risk-neutral expectation:
  // Expected liability at expiry = e^(rT) * (Option_short - Option_long)
  const bsShort = blackScholes(type, S0, shortStrike, T, sigma, params.riskFreeRate, params.dividendYield);
  const bsLong = blackScholes(type, S0, longStrike, T, sigma, params.riskFreeRate, params.dividendYield);

  // Undiscounted expected payout of the short vertical spread at expiration
  const expectedPayoutPerShare = Math.exp(params.riskFreeRate * T) * Math.max(0, bsShort.price - bsLong.price);
  const exactExpectedLossTotal = expectedPayoutPerShare * multiplier;
  
  // Exact Net Expected Value = Total Credit Received - Expected Payout
  const exactEV = totalCredit - exactExpectedLossTotal;
  
  // Exact Reward / Risk Ratio
  const exactRewardRisk = exactExpectedLossTotal > 0 ? totalCredit / exactExpectedLossTotal : Infinity;
  
  // Exact Fair Price for break-even expected value: Credit needed = expected payout
  const exactPrice1to1 = expectedPayoutPerShare;

  return {
    type,
    shortStrike,
    longStrike,
    spreadWidth,
    netCredit,
    contracts,
    totalCredit,
    trueMaxGain,
    trueMaxLoss,
    probITM,
    probFullLoss,
    probMaxProfit,
    excelMaxPain,
    excelEV,
    excelRewardRisk,
    excelPrice1to1,
    exactExpectedLoss: exactExpectedLossTotal,
    exactEV,
    exactRewardRisk,
    exactPrice1to1
  };
}

/**
 * Builds the dynamic Strike Matrix (matching rows 21-31 for Calls, and rows 35-45 for Puts)
 */
export function buildStrikeMatrix(
  type: OptionType,
  selectedShortStrike: number,
  selectedLongStrike: number,
  netCredit: number,
  params: UnderlyingParams,
  count = 10
): StrikeMatrixRow[] {
  const S0 = params.spotPrice;
  const gap = params.strikeGap;
  const rows: StrikeMatrixRow[] = [];

  // Anchor around spot price or selected strike
  const anchorStrike = type === 'call'
    ? Math.round(S0 / gap) * gap
    : Math.round(S0 / gap) * gap;

  for (let i = 0; i < count; i++) {
    const strike = type === 'call'
      ? anchorStrike + i * gap
      : anchorStrike - i * gap;

    const probITM = probITMDriftless(type, S0, strike, params.atmIV, params.dte);
    const probTouch = Math.min(1, 2 * probITM);

    const isSelected = strike === selectedShortStrike;
    let excelGain: number | null = null;
    let excelPain: number | null = null;
    let excelEV: number | null = null;
    let excelRewardRisk: number | null = null;
    let excelPrice1to1: number | null = null;
    let exactEV: number | null = null;
    let exactPrice1to1: number | null = null;

    if (isSelected) {
      const evalResult = evaluateSpread(type, selectedShortStrike, selectedLongStrike, netCredit, params);
      excelGain = evalResult.trueMaxGain * (1 - probITM);
      excelPain = evalResult.excelMaxPain;
      excelEV = evalResult.excelEV;
      excelRewardRisk = evalResult.excelRewardRisk;
      excelPrice1to1 = evalResult.excelPrice1to1;
      exactEV = evalResult.exactEV;
      exactPrice1to1 = evalResult.exactPrice1to1;
    }

    rows.push({
      strike,
      probITM,
      probTouch,
      excelGain,
      excelPain,
      excelEV,
      excelRewardRisk,
      excelPrice1to1,
      exactEV,
      exactPrice1to1
    });
  }

  return rows;
}

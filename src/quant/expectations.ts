import { normalCdf } from './distributions';
import { blackScholes, getStrikeIV } from './blackScholes';
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
  if (S0 <= 0 || K <= 0 || sigma <= 0 || dte <= 0) return 0;
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
  const dte = params.dte;
  const contracts = params.contracts;

  if (S0 <= 0 || shortStrike <= 0 || contracts <= 0 || dte <= 0 || params.atmIV <= 0) {
    return {
      type,
      shortStrike: Math.max(0, shortStrike),
      longStrike: Math.max(0, longStrike),
      spreadWidth: 0,
      netCredit: 0,
      contracts: Math.max(0, contracts),
      totalCredit: 0,
      trueMaxGain: 0,
      trueMaxLoss: 0,
      probITM: 0,
      probFullLoss: 0,
      probMaxProfit: 0,
      excelMaxPain: 0,
      excelEV: 0,
      excelRewardRisk: 0,
      excelPrice1to1: 0,
      exactExpectedLoss: 0,
      exactEV: 0,
      exactRewardRisk: 0,
      exactPrice1to1: 0
    };
  }

  const skew = params.skewSlope ?? 0;
  const shortIV = getStrikeIV(shortStrike, S0, params.atmIV, skew);
  const longIV = getStrikeIV(longStrike, S0, params.atmIV, skew);
  const T = dte / 365;
  const multiplier = contracts * 100;

  const spreadWidth = Math.abs(longStrike - shortStrike);
  const totalCredit = netCredit * multiplier;
  const trueMaxGain = totalCredit;
  const trueMaxLoss = Math.max(0, (spreadWidth - netCredit) * multiplier);

  // Probabilities using Excel's driftless formula (with strike-specific IV when skew is active)
  const probITM = probITMDriftless(type, S0, shortStrike, shortIV, dte);
  const probFullLoss = probITMDriftless(type, S0, longStrike, longIV, dte);
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
  const bsShort = blackScholes(type, S0, shortStrike, T, shortIV, params.riskFreeRate, params.dividendYield);
  const bsLong = blackScholes(type, S0, longStrike, T, longIV, params.riskFreeRate, params.dividendYield);

  // Undiscounted expected payout of the short vertical spread at expiration
  const expectedPayoutPerShare = Math.exp(params.riskFreeRate * T) * Math.max(0, bsShort.price - bsLong.price);
  const exactExpectedLossTotal = expectedPayoutPerShare * multiplier;
  
  // Exact Net Expected Value = Total Credit Received - Expected Payout
  const exactEV = totalCredit - exactExpectedLossTotal;
  
  // Exact Reward / Risk Ratio
  const exactRewardRisk = exactExpectedLossTotal > 0 ? totalCredit / exactExpectedLossTotal : 0;
  
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
 * Evaluates full spread metrics across all candidate strikes while marking the active selected strike.
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
  const gap = params.strikeGap || 5;
  if (S0 <= 0 || params.dte <= 0 || params.atmIV <= 0) {
    return [];
  }
  const T = Math.max(0.001, params.dte / 365);
  const skew = params.skewSlope ?? 0;
  const spreadWidth = Math.abs(selectedLongStrike - selectedShortStrike) || gap;
  const rows: StrikeMatrixRow[] = [];

  // Anchor around spot price rounded to nearest strike gap
  const anchorStrike = Math.round(S0 / gap) * gap;

  for (let i = 0; i < count; i++) {
    const strike = type === 'call'
      ? anchorStrike + i * gap
      : anchorStrike - i * gap;

    const isSelected = strike === selectedShortStrike;
    const rowLongStrike = isSelected
      ? selectedLongStrike
      : type === 'call'
        ? strike + spreadWidth
        : strike - spreadWidth;

    const strikeIV = getStrikeIV(strike, S0, params.atmIV, skew);
    const bsShort = blackScholes(type, S0, strike, T, strikeIV, params.riskFreeRate, params.dividendYield);
    const probITM = probITMDriftless(type, S0, strike, strikeIV, params.dte);
    const probTouch = Math.min(1, 2 * probITM);

    const evalResult = evaluateSpread(type, strike, rowLongStrike, netCredit, params);

    rows.push({
      strike,
      longStrike: rowLongStrike,
      isSelected,
      probITM,
      probTouch,
      strikeIV,
      shortDelta: bsShort.delta,
      excelGain: evalResult.trueMaxGain * (1 - probITM),
      excelPain: evalResult.excelMaxPain,
      excelEV: evalResult.excelEV,
      excelRewardRisk: evalResult.excelRewardRisk,
      excelPrice1to1: evalResult.excelPrice1to1,
      exactEV: evalResult.exactEV,
      exactRewardRisk: evalResult.exactRewardRisk,
      exactPrice1to1: evalResult.exactPrice1to1
    });
  }

  return rows;
}

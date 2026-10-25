export type OptionType = 'call' | 'put';
export type Position = 'buy' | 'sell';

export interface OptionLeg {
  id: string;
  type: OptionType;
  position: Position;
  strike: number;
  premium: number; // Price per share
  contracts: number;
  iv?: number; // Specific implied volatility for this strike (skew)
}

export interface UnderlyingParams {
  symbol: string;
  spotPrice: number;
  atmIV: number; // e.g. 0.174 for 17.4%
  dte: number; // Days to expiration, e.g. 10
  riskFreeRate: number; // e.g. 0.045 for 4.5%
  dividendYield: number; // e.g. 0.005 for 0.5%
  contracts: number; // Default contract count, e.g. 10
  strikeGap: number; // Default strike gap, e.g. 5
  atmStraddleAsk?: number; // Optional ATM straddle ask side, e.g. 6.80
  straddleFactor?: number; // Default 0.85
}

export interface VolatilityBands {
  oneStdDevMove: number;
  upper1Sigma: number;
  lower1Sigma: number;
  twoStdDevMove: number;
  upper2Sigma: number;
  lower2Sigma: number;
  marketMakerMove: number;
}

export interface GreeksResult {
  delta: number;
  gamma: number;
  theta: number; // Per calendar day
  vega: number;  // Per 1% IV change
  rho: number;   // Per 1% interest rate change
  vanna?: number;
  volga?: number;
}

export interface SpreadEvaluation {
  type: OptionType;
  shortStrike: number;
  longStrike: number;
  spreadWidth: number;
  netCredit: number; // per share
  contracts: number;
  totalCredit: number; // netCredit * contracts * 100
  trueMaxGain: number;
  trueMaxLoss: number; // (spreadWidth - netCredit) * contracts * 100
  
  // Probabilities
  probITM: number; // Probability of crossing short strike
  probFullLoss: number; // Probability of crossing long strike
  probMaxProfit: number; // 1 - probITM
  
  // Excel legacy model
  excelMaxPain: number;
  excelEV: number;
  excelRewardRisk: number;
  excelPrice1to1: number;
  
  // Exact Continuous Quantitative Model
  exactExpectedLoss: number;
  exactEV: number;
  exactRewardRisk: number;
  exactPrice1to1: number;
}

export interface IronCondorEvaluation {
  callSpread: SpreadEvaluation;
  putSpread: SpreadEvaluation;
  totalCreditPerShare: number;
  totalCreditDollars: number;
  marginRequired: number;
  maxGain: number;
  maxLoss: number;
  breakevenLow: number;
  breakevenHigh: number;
  returnOnRisk: number; // maxGain / maxLoss
  returnOnMargin: number;
  
  // Probability metrics
  probMaxProfit: number; // Stock finishes between put short & call short
  probAnyLoss: number;
  
  // Expected values
  excelCombinedEV: number;
  exactCombinedEV: number;
  exactRewardRisk: number;
  greeks: GreeksResult;
}

export interface StrikeMatrixRow {
  strike: number;
  probITM: number; // P(S > K) for calls, P(S < K) for puts
  probTouch: number; // 2 * probITM
  excelGain: number | null;
  excelPain: number | null;
  excelEV: number | null;
  excelRewardRisk: number | null;
  excelPrice1to1: number | null;
  exactEV: number | null;
  exactPrice1to1: number | null;
}

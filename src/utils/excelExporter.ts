import * as XLSX from 'xlsx';
import { UnderlyingParams, IronCondorEvaluation } from '../quant/types';

/**
 * Generates an Excel (.xlsx) file that replicates the formulas and structure
 * of Option Pricing.xlsx, populated with the user's current live calculations.
 */
export function exportCurrentTradeToExcel(
  params: UnderlyingParams,
  callShort: number,
  callLong: number,
  callCredit: number,
  putShort: number,
  putLong: number,
  putCredit: number,
  condorEval: IronCondorEvaluation
): void {
  const wb = XLSX.utils.book_new();

  // Create worksheet data matching Option Pricing.xlsx layout
  const wsData: any[][] = [];

  // Pad top rows (rows 1-4 empty)
  for (let r = 0; r < 4; r++) wsData.push([]);

  // Row 5 (index 4)
  const row5 = new Array(15).fill('');
  row5[10] = 'Iron Condors'; // K5
  wsData.push(row5);

  // Row 6 (index 5)
  const row6 = new Array(15).fill('');
  row6[3] = 'Option Data'; // D6
  row6[10] = 'Calls'; // K6
  row6[11] = 'Puts'; // L6
  wsData.push(row6);

  // Row 7 (index 6) empty
  wsData.push(new Array(15).fill(''));

  // Row 8 (index 7)
  const row8 = new Array(15).fill('');
  row8[3] = 'Stock'; // D8
  row8[4] = params.symbol.toLowerCase(); // E8
  row8[6] = '1 Std Dev. Move +/-'; // G8
  row8[8] = { t: 'n', v: params.spotPrice * params.atmIV * Math.sqrt(params.dte / 365), f: 'E9*E10*(E11/365)^0.5' }; // I8
  row8[10] = { t: 'n', v: params.spotPrice + (params.spotPrice * params.atmIV * Math.sqrt(params.dte / 365)), f: '+E9+I8' }; // K8
  row8[11] = { t: 'n', v: params.spotPrice - (params.spotPrice * params.atmIV * Math.sqrt(params.dte / 365)), f: '+E9-I8' }; // L8
  wsData.push(row8);

  // Row 9 (index 8)
  const row9 = new Array(15).fill('');
  row9[3] = 'Current Price'; // D9
  row9[4] = params.spotPrice; // E9
  row9[6] = '2 Std Dev. Move +/-'; // G9
  row9[8] = { t: 'n', v: (params.spotPrice * params.atmIV * Math.sqrt(params.dte / 365)) * 2, f: '+I8*2' }; // I9
  row9[10] = { t: 'n', v: params.spotPrice + (params.spotPrice * params.atmIV * Math.sqrt(params.dte / 365)) * 2, f: '+E9+I9' }; // K9
  row9[11] = { t: 'n', v: params.spotPrice - (params.spotPrice * params.atmIV * Math.sqrt(params.dte / 365)) * 2, f: '+E9-I9' }; // L9
  wsData.push(row9);

  // Row 10 (index 9)
  const row10 = new Array(15).fill('');
  row10[3] = 'Implied Volatility ATM'; // D10
  row10[4] = params.atmIV; // E10
  wsData.push(row10);

  // Row 11 (index 10)
  const row11 = new Array(15).fill('');
  row11[3] = "Days 'til expiry"; // D11
  row11[4] = params.dte; // E11
  row11[7] = 'Call'; // H11
  row11[8] = 'Put'; // I11
  wsData.push(row11);

  // Row 12 (index 11)
  const row12 = new Array(15).fill('');
  row12[3] = 'Number of Contracts'; // D12
  row12[4] = params.contracts; // E12
  row12[6] = 'Short  '; // G12
  row12[7] = callShort; // H12
  row12[8] = putShort; // I12
  wsData.push(row12);

  // Row 13 (index 12)
  const row13 = new Array(15).fill('');
  row13[3] = 'Strike Price Gaps'; // D13
  row13[4] = params.strikeGap; // E13
  row13[6] = 'Long  '; // G13
  row13[7] = callLong; // H13
  row13[8] = putLong; // I13
  row13[11] = 'ATM Straddle (ask-side)  '; // L13
  row13[12] = params.atmStraddleAsk ?? 6.80; // M13
  wsData.push(row13);

  // Row 14 (index 13)
  const row14 = new Array(15).fill('');
  row14[6] = 'Net Credit  '; // G14
  row14[7] = callCredit; // H14
  row14[8] = putCredit; // I14
  row14[11] = 'Factor  '; // L14
  row14[12] = params.straddleFactor ?? 0.85; // M14
  wsData.push(row14);

  // Row 15 (index 14) empty
  wsData.push(new Array(15).fill(''));

  // Row 16 (index 15)
  const row16 = new Array(15).fill('');
  row16[6] = 'Expectation Value  '; // G16
  row16[7] = { t: 'n', v: condorEval.callSpread.excelEV, f: 'IF(H12>0,SUM($E28:$N28)," ")' }; // H16
  row16[8] = { t: 'n', v: condorEval.putSpread.excelEV, f: 'IF(I12>0,SUM($E42:$N42)," ")' }; // I16
  row16[11] = 'Mkt Maker Move  '; // L16
  row16[12] = { t: 'n', v: (params.atmStraddleAsk ?? 6.80) * (params.straddleFactor ?? 0.85), f: '+M13*M14' }; // M16
  wsData.push(row16);

  // Row 17 (index 16)
  const row17 = new Array(15).fill('');
  row17[6] = 'Reward / Risk Ratio  '; // G17
  row17[7] = { t: 'n', v: condorEval.callSpread.excelRewardRisk, f: 'IF(H12>0,SUM($E29:$N29)," ")' }; // H17
  row17[8] = { t: 'n', v: condorEval.putSpread.excelRewardRisk, f: 'IF(I12>0,SUM($E43:$N43)," ")' }; // I17
  wsData.push(row17);

  // Rows 18-20 empty
  for (let r = 0; r < 3; r++) wsData.push(new Array(15).fill(''));

  // Anchor strike for Call Table
  const anchorCall = Math.round(params.spotPrice / params.strikeGap) * params.strikeGap;
  const colLetters = ['E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];

  // Row 21 (Call Strike Price)
  const row21 = new Array(15).fill('');
  row21[3] = 'Call Strike Price';
  row21[4] = anchorCall; // E21
  for (let i = 1; i < 10; i++) {
    const prevCol = colLetters[i - 1];
    row21[4 + i] = { t: 'n', v: anchorCall + i * params.strikeGap, f: `+${prevCol}21+$E13` };
  }
  wsData.push(row21);

  // Row 22 (Probability > Strike $)
  const row22 = new Array(15).fill('');
  row22[3] = 'Probability > Strike $';
  for (let i = 0; i < 10; i++) {
    const col = colLetters[i];
    row22[4 + i] = { f: `1-NORMSDIST(LN(${col}21/$E$9)/($E$10*SQRT($E$11/365)))` };
  }
  wsData.push(row22);

  // Rows 23-24 empty
  for (let r = 0; r < 2; r++) wsData.push(new Array(15).fill(''));

  // Row 25 (Max Expected Gain)
  const row25 = new Array(15).fill('');
  row25[3] = 'Max Expected Gain';
  for (let i = 0; i < 10; i++) {
    const col = colLetters[i];
    row25[4 + i] = { f: `IF(${col}21=$H12,$H14*(1-${col}22)*$E12*100," ")` };
  }
  wsData.push(row25);

  // Row 26 (Max Expected Pain)
  const row26 = new Array(15).fill('');
  row26[3] = 'Max Expected Pain';
  for (let i = 0; i < 10; i++) {
    const col = colLetters[i];
    row26[4 + i] = { f: `IF(${col}21=$H12,($H12-$H13)*${col}22*$E12*100," ")` };
  }
  wsData.push(row26);

  // Row 27 empty
  wsData.push(new Array(15).fill(''));

  // Row 28 (Expected Value)
  const row28 = new Array(15).fill('');
  row28[3] = 'Expected Value';
  for (let i = 0; i < 10; i++) {
    const col = colLetters[i];
    row28[4 + i] = { f: `IF(${col}25=" "," ",+${col}25+${col}26)` };
  }
  wsData.push(row28);

  // Row 29 (Reward / Profit Ratio)
  const row29 = new Array(15).fill('');
  row29[3] = 'Reward / Profit Ratio';
  for (let i = 0; i < 10; i++) {
    const col = colLetters[i];
    row29[4 + i] = { f: `IF(${col}25=" "," ",+${col}25/-${col}26)` };
  }
  wsData.push(row29);

  // Row 30 empty
  wsData.push(new Array(15).fill(''));

  // Row 31 (Price for 1:1 Ratio)
  const row31 = new Array(15).fill('');
  row31[3] = 'Price for 1:1 Ratio';
  for (let i = 0; i < 10; i++) {
    const col = colLetters[i];
    row31[4 + i] = { f: `IF(${col}25=" "," ",($H13-$H12)*${col}22/(1-${col}22))` };
  }
  wsData.push(row31);

  // Rows 32-34 empty
  for (let r = 0; r < 3; r++) wsData.push(new Array(15).fill(''));

  // Row 35 (Put Strike Price)
  const row35 = new Array(15).fill('');
  row35[3] = 'Put Strike Price';
  row35[4] = { t: 'n', v: anchorCall, f: '+E21' }; // E35 = +E21
  for (let i = 1; i < 10; i++) {
    const prevCol = colLetters[i - 1];
    row35[4 + i] = { t: 'n', v: anchorCall - i * params.strikeGap, f: `+${prevCol}35-$E13` };
  }
  wsData.push(row35);

  // Row 36 (Probability < Strike $)
  const row36 = new Array(15).fill('');
  row36[3] = 'Probability < Strike $';
  for (let i = 0; i < 10; i++) {
    const col = colLetters[i];
    row36[4 + i] = { f: `NORMSDIST(LN(${col}35/$E$9)/($E$10*SQRT($E$11/365)))` };
  }
  wsData.push(row36);

  // Rows 37-38 empty
  for (let r = 0; r < 2; r++) wsData.push(new Array(15).fill(''));

  // Row 39 (Max Expected Gain)
  const row39 = new Array(15).fill('');
  row39[3] = 'Max Expected Gain';
  for (let i = 0; i < 10; i++) {
    const col = colLetters[i];
    row39[4 + i] = { f: `IF(${col}35=$I12,$I14*(1-${col}36)*$E12*100," ")` };
  }
  wsData.push(row39);

  // Row 40 (Max Expected Pain)
  const row40 = new Array(15).fill('');
  row40[3] = 'Max Expected Pain';
  for (let i = 0; i < 10; i++) {
    const col = colLetters[i];
    row40[4 + i] = { f: `IF(${col}35=$I$12,($I$13-$I$12)*${col}36*$E$12*100," ")` };
  }
  wsData.push(row40);

  // Row 41 empty
  wsData.push(new Array(15).fill(''));

  // Row 42 (Expected Value)
  const row42 = new Array(15).fill('');
  row42[3] = 'Expected Value';
  for (let i = 0; i < 10; i++) {
    const col = colLetters[i];
    row42[4 + i] = { f: `IF(${col}39=" "," ",+${col}39+${col}40)` };
  }
  wsData.push(row42);

  // Row 43 (Reward / Profit Ratio)
  const row43 = new Array(15).fill('');
  row43[3] = 'Reward / Profit Ratio';
  for (let i = 0; i < 10; i++) {
    const col = colLetters[i];
    row43[4 + i] = { f: `IF(${col}39=" "," ",+${col}39/-${col}40)` };
  }
  wsData.push(row43);

  // Row 44 empty
  wsData.push(new Array(15).fill(''));

  // Row 45 (Price for 1:1 Ratio)
  const row45 = new Array(15).fill('');
  row45[3] = 'Price for 1:1 Ratio';
  for (let i = 0; i < 10; i++) {
    const col = colLetters[i];
    row45[4 + i] = { f: `IF(${col}39=" "," ",-($I13-$I12)*${col}36/(1-${col}36))` };
  }
  wsData.push(row45);

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Option Pricing');

  // Sheet 2: OptionsQuant Institutional Exact Model
  const quantData = [
    ['OptionsQuant Institutional Analytics & Exact Model Breakdown'],
    ['Symbol', params.symbol],
    ['Spot Price', params.spotPrice],
    ['ATM Implied Volatility', params.atmIV],
    ['Days to Expiry', params.dte],
    ['Total Net Credit ($)', condorEval.totalCreditDollars],
    ['Total Net Credit (/sh)', condorEval.totalCreditPerShare],
    ['True Maximum Risk ($)', condorEval.maxLoss],
    ['Exact Continuous Expected Value ($)', condorEval.exactCombinedEV],
    ['Probability of Max Profit', condorEval.probMaxProfit],
    ['Breakeven Range', `${condorEval.breakevenLow.toFixed(2)} - ${condorEval.breakevenHigh.toFixed(2)}`],
    ['Return on Risk', condorEval.returnOnRisk],
    ['Return on Margin', condorEval.returnOnMargin],
    [],
    ['Net Greeks'],
    ['Delta', condorEval.greeks.delta],
    ['Gamma', condorEval.greeks.gamma],
    ['Theta (Daily)', condorEval.greeks.theta],
    ['Vega (per 1% IV)', condorEval.greeks.vega],
    ['Rho', condorEval.greeks.rho]
  ];

  const wsQuant = XLSX.utils.aoa_to_sheet(quantData);
  XLSX.utils.book_append_sheet(wb, wsQuant, 'OptionsQuant Exact Model');

  // Write and trigger download
  const filename = `${params.symbol}_Option_Pricing_Calculated.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Downloads the pristine original Option Pricing.xlsx file
 */
export function downloadOriginalExcelFile(): void {
  const link = document.createElement('a');
  link.href = '/Option%20Pricing.xlsx';
  link.download = 'Option Pricing.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

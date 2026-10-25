import * as XLSX from 'xlsx';
import { UnderlyingParams } from '../quant/types';

export interface ParsedSpreadsheetData {
  params: UnderlyingParams;
  callShort: number;
  callLong: number;
  callCredit: number;
  putShort: number;
  putLong: number;
  putCredit: number;
  excelReportedCallEV?: number;
  excelReportedPutEV?: number;
}

/**
 * Parses an Excel (.xlsx) file matching the Option Pricing.xlsx structure
 */
export async function parseOptionsExcelFile(file: File | ArrayBuffer): Promise<ParsedSpreadsheetData> {
  let data: ArrayBuffer;
  if (file instanceof File) {
    data = await file.arrayBuffer();
  } else {
    data = file;
  }

  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Helper to get cell value safely
  const getVal = (cellRef: string, defaultVal: any = 0) => {
    const cell = sheet[cellRef];
    return cell ? cell.v : defaultVal;
  };

  const symbol = String(getVal('E8', 'AAPL')).toUpperCase();
  const spotPrice = Number(getVal('E9', 698));
  const atmIV = Number(getVal('E10', 0.174));
  const dte = Number(getVal('E11', 10));
  const contracts = Number(getVal('E12', 10));
  const strikeGap = Number(getVal('E13', 5));

  const callShort = Number(getVal('H12', 705));
  const callLong = Number(getVal('H13', 710));
  const callCredit = Number(getVal('H14', 0.45));

  const putShort = Number(getVal('I12', 690));
  const putLong = Number(getVal('I13', 685));
  const putCredit = Number(getVal('I14', 0.32));

  const atmStraddleAsk = Number(getVal('M13', 6.80));
  const straddleFactor = Number(getVal('M14', 0.85));

  const excelReportedCallEV = Number(getVal('H16', -1536.49));
  const excelReportedPutEV = Number(getVal('I16', -1512.66));

  const params: UnderlyingParams = {
    symbol,
    spotPrice,
    atmIV,
    dte,
    riskFreeRate: 0.045, // default 4.5% modern risk-free rate
    dividendYield: 0.005, // default 0.5%
    contracts,
    strikeGap,
    atmStraddleAsk,
    straddleFactor
  };

  return {
    params,
    callShort,
    callLong,
    callCredit,
    putShort,
    putLong,
    putCredit,
    excelReportedCallEV,
    excelReportedPutEV
  };
}

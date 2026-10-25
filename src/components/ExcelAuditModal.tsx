import React, { useState } from 'react';
import { parseOptionsExcelFile, ParsedSpreadsheetData } from '../utils/xlsxParser';
import { exportCurrentTradeToExcel, downloadOriginalExcelFile } from '../utils/excelExporter';
import { IronCondorEvaluation, UnderlyingParams } from '../quant/types';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { FileSpreadsheet, UploadCloud, Download, ExternalLink, X } from 'lucide-react';

interface ExcelAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  condorEval: IronCondorEvaluation;
  params: UnderlyingParams;
  callShort: number;
  callLong: number;
  callCredit: number;
  putShort: number;
  putLong: number;
  putCredit: number;
  onApplyParsedData: (data: ParsedSpreadsheetData) => void;
}

export const ExcelAuditModal: React.FC<ExcelAuditModalProps> = ({
  isOpen,
  onClose,
  condorEval,
  params,
  callShort,
  callLong,
  callCredit,
  putShort,
  putLong,
  putCredit,
  onApplyParsedData
}) => {
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [loadStatus, setLoadStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    try {
      setLoadStatus('Parsing spreadsheet...');
      const parsed = await parseOptionsExcelFile(file);
      onApplyParsedData(parsed);
      setLoadStatus(`Successfully loaded ${file.name}!`);
    } catch (err: any) {
      setLoadStatus(`Error loading Excel file: ${err.message}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleLoadProjectSample = () => {
    const sample: ParsedSpreadsheetData = {
      params: {
        symbol: 'AAPL',
        spotPrice: 698,
        atmIV: 0.174,
        dte: 10,
        riskFreeRate: 0.045,
        dividendYield: 0.005,
        contracts: 10,
        strikeGap: 5,
        atmStraddleAsk: 6.80,
        straddleFactor: 0.85
      },
      callShort: 705,
      callLong: 710,
      callCredit: 0.45,
      putShort: 690,
      putLong: 685,
      putCredit: 0.32,
      excelReportedCallEV: -1536.49,
      excelReportedPutEV: -1512.66
    };
    onApplyParsedData(sample);
    setLoadStatus('Loaded baseline values from Option Pricing.xlsx');
  };

  const handleExportToExcel = () => {
    exportCurrentTradeToExcel(
      params,
      callShort,
      callLong,
      callCredit,
      putShort,
      putLong,
      putCredit,
      condorEval
    );
    setLoadStatus(`Exported ${params.symbol}_Option_Pricing_Calculated.xlsx ready to open in Microsoft Excel!`);
  };

  return (
    <div className="md-dialog-backdrop" onClick={onClose}>
      <div className="md-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="md-dialog__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={24} color="var(--md-sys-color-primary)" />
            <div>
              <h2 className="md-dialog__title">Spreadsheet Bridge & Microsoft Excel Export</h2>
              <span className="body-small" style={{ color: 'var(--md-sys-color-outline)' }}>
                Import, audit, or export directly to Microsoft Excel (.xlsx) with all formulas intact
              </span>
            </div>
          </div>
          <button className="md-icon-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Action Bar: Export & Download */}
        <div className="md-card md-card--tonal" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div className="title-small" style={{ color: 'var(--md-sys-color-primary)' }}>
                Open / Export in Microsoft Excel
              </div>
              <div className="body-small" style={{ color: 'var(--md-sys-color-outline)' }}>
                Generates a live .xlsx file with NORMSDIST, SUM, IF formulas matching Option Pricing.xlsx
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="md-button md-button--filled" onClick={handleExportToExcel}>
                <ExternalLink size={14} />
                <span>Export Current Trade to Excel (.xlsx)</span>
              </button>

              <button className="md-button md-button--outlined" onClick={downloadOriginalExcelFile}>
                <Download size={14} />
                <span>Download Original Option Pricing.xlsx</span>
              </button>
            </div>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-outline-variant)'}`,
            borderRadius: 16,
            padding: 20,
            textAlign: 'center',
            backgroundColor: dragOver ? 'var(--md-sys-color-primary-container)' : 'var(--md-sys-color-surface-container)',
            transition: 'all 150ms ease'
          }}
        >
          <UploadCloud size={32} color="var(--md-sys-color-primary)" style={{ margin: '0 auto 6px' }} />
          <div className="title-medium">Import Any Options Spreadsheet (.xlsx)</div>
          <div className="body-small" style={{ color: 'var(--md-sys-color-outline)', marginTop: 2 }}>
            Drag & drop your file or click Browse. Instantly parses E9 (Spot), E10 (IV), E11 (DTE), E12 (Contracts), H12/I12 (Strikes).
          </div>

          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 10 }}>
            <label htmlFor="excel-file-import" className="md-button md-button--tonal" style={{ cursor: 'pointer', height: 32, fontSize: 12 }}>
              <span>Browse Spreadsheet</span>
              <input
                id="excel-file-import"
                name="excelFile"
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files && e.target.files[0] && handleFileUpload(e.target.files[0])}
              />
            </label>

            <button className="md-button md-button--outlined" style={{ height: 32, fontSize: 12 }} onClick={handleLoadProjectSample}>
              Reset to Option Pricing.xlsx Sample
            </button>
          </div>

          {loadStatus && (
            <div className="label-small" style={{ marginTop: 8, color: 'var(--md-sys-color-primary)' }}>
              {loadStatus}
            </div>
          )}
        </div>

        {/* Side-by-side Audit Table */}
        <div>
          <div className="title-medium" style={{ marginBottom: 8 }}>Model Audit: Spreadsheet vs. Exact Quantitative Reality</div>
          <div className="md-table-container">
            <table className="md-table">
              <thead>
                <tr>
                  <th>Metric / Dimension</th>
                  <th>Option Pricing.xlsx (Original)</th>
                  <th>OptionsQuant (Exact Model)</th>
                  <th>Root Cause & Audit Analysis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>Call Spread EV</td>
                  <td style={{ color: 'var(--quant-color-loss)' }}>-$1,536.49</td>
                  <td style={{ color: condorEval.callSpread.exactEV >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)', fontWeight: 700 }}>
                    {formatCurrency(condorEval.callSpread.exactEV)}
                  </td>
                  <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Spreadsheet assumed 100% loss at 705. Exact model calculates partial linear loss in [705, 710].
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Put Spread EV</td>
                  <td style={{ color: 'var(--quant-color-loss)' }}>-$1,512.66</td>
                  <td style={{ color: condorEval.putSpread.exactEV >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)', fontWeight: 700 }}>
                    {formatCurrency(condorEval.putSpread.exactEV)}
                  </td>
                  <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Spreadsheet assumed 100% loss at 690. Exact model calculates partial linear loss in [685, 690].
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Combined Iron Condor EV</td>
                  <td style={{ color: 'var(--quant-color-loss)' }}>-$3,049.15 (sum of silos)</td>
                  <td style={{ color: condorEval.exactCombinedEV >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)', fontWeight: 700 }}>
                    {formatCurrency(condorEval.exactCombinedEV)}
                  </td>
                  <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Spreadsheet ignored that stock cannot breach both sides at once. Total credit ($770) offsets single losing wing.
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Maximum Risk</td>
                  <td style={{ color: 'var(--quant-color-loss)' }}>$5,000 per spread ($10,000 total)</td>
                  <td style={{ color: 'var(--quant-color-loss)', fontWeight: 700 }}>
                    {formatCurrency(condorEval.maxLoss)}
                  </td>
                  <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)' }}>
                    True max risk = Width ($5) - Total Credit ($0.77) = $4.23/sh ($4,230 total).
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Probability of Max Profit</td>
                  <td>Not computed in Excel</td>
                  <td style={{ color: 'var(--quant-color-gain)', fontWeight: 700 }}>
                    {formatPercent(condorEval.probMaxProfit)}
                  </td>
                  <td style={{ textAlign: 'left', fontSize: 11, color: 'var(--md-sys-color-on-surface-variant)' }}>
                    Risk-neutral probability of remaining between 690 Put and 705 Call.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="md-dialog__actions">
          <button className="md-button md-button--filled" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

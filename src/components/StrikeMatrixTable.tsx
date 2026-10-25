import React, { useState } from 'react';
import { StrikeMatrixRow, UnderlyingParams, OptionType } from '../quant/types';
import { buildStrikeMatrix } from '../quant/expectations';
import { formatCurrency, formatPercent, formatMultiplier } from '../utils/formatters';
import { Table, CheckCircle2 } from 'lucide-react';

interface StrikeMatrixTableProps {
  callShort: number;
  callLong: number;
  callCredit: number;
  putShort: number;
  putLong: number;
  putCredit: number;
  params: UnderlyingParams;
  onSelectCallShort: (strike: number) => void;
  onSelectPutShort: (strike: number) => void;
}

export const StrikeMatrixTable: React.FC<StrikeMatrixTableProps> = ({
  callShort,
  callLong,
  callCredit,
  putShort,
  putLong,
  putCredit,
  params,
  onSelectCallShort,
  onSelectPutShort
}) => {
  const [activeTab, setActiveTab] = useState<'call' | 'put' | 'both'>('call');

  const callRows = buildStrikeMatrix('call', callShort, callLong, callCredit, params, 10);
  const putRows = buildStrikeMatrix('put', putShort, putLong, putCredit, params, 10);

  const renderTable = (type: OptionType, rows: StrikeMatrixRow[], selectedShort: number) => (
    <div className="md-table-container">
      <table className="md-table">
        <thead>
          <tr>
            <th>Spread Strikes</th>
            <th>Status</th>
            <th>P({type === 'call' ? 'S > Short' : 'S < Short'})</th>
            <th>P(Touch)</th>
            <th>Expected Gain</th>
            <th>Expected Pain (Excel)</th>
            <th>EV (Excel Model)</th>
            <th>EV (Exact Continuous)</th>
            <th>Reward / Risk</th>
            <th>Excel 1:1 Price</th>
            <th>Exact 1:1 Fair Credit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row: StrikeMatrixRow) => {
            const isSelected = row.strike === selectedShort;
            const probClass = row.probITM > 0.4
              ? 'md-chip md-chip--loss'
              : row.probITM > 0.2
              ? 'md-chip md-chip--neutral'
              : 'md-chip md-chip--gain';

            return (
              <tr
                key={row.strike}
                className={isSelected ? 'md-table__row--selected' : ''}
                onClick={() => type === 'call' ? onSelectCallShort(row.strike) : onSelectPutShort(row.strike)}
                style={{ cursor: 'pointer' }}
              >
                <td style={{ fontWeight: isSelected ? 700 : 500 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isSelected && <CheckCircle2 size={14} color="var(--md-sys-color-primary)" />}
                    <span>${row.strike.toFixed(0)} / ${row.longStrike.toFixed(0)}</span>
                  </div>
                </td>
                <td>
                  {isSelected ? (
                    <span className="md-chip md-chip--neutral" style={{ fontSize: 10 }}>ACTIVE SHORT (x)</span>
                  ) : (
                    <span style={{ color: 'var(--md-sys-color-outline)', fontSize: 11 }}>Candidate</span>
                  )}
                </td>
                <td>
                  <span className={probClass} style={{ fontSize: 11 }}>
                    {formatPercent(row.probITM)}
                  </span>
                </td>
                <td style={{ color: 'var(--md-sys-color-on-surface-variant)' }}>
                  {formatPercent(row.probTouch)}
                </td>
                <td style={{ color: 'var(--quant-color-gain)', fontWeight: isSelected ? 700 : 400 }}>
                  {formatCurrency(row.excelGain)}
                </td>
                <td style={{ color: 'var(--quant-color-loss)', fontWeight: isSelected ? 700 : 400 }}>
                  {formatCurrency(row.excelPain)}
                </td>
                <td>
                  <span style={{ color: row.excelEV >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)', fontWeight: isSelected ? 700 : 400 }}>
                    {formatCurrency(row.excelEV)}
                  </span>
                </td>
                <td>
                  <span
                    className="md-chip"
                    style={{
                      backgroundColor: row.exactEV >= 0 ? 'var(--quant-color-gain-container)' : 'var(--quant-color-loss-container)',
                      color: row.exactEV >= 0 ? 'var(--quant-color-on-gain-container)' : 'var(--quant-color-on-loss-container)',
                      fontWeight: isSelected ? 700 : 500
                    }}
                  >
                    {formatCurrency(row.exactEV)}
                  </span>
                </td>
                <td style={{ fontWeight: isSelected ? 700 : 400 }}>
                  {formatMultiplier(row.excelRewardRisk)} <span style={{ color: 'var(--md-sys-color-outline)', fontSize: 11 }}>({formatMultiplier(row.exactRewardRisk)})</span>
                </td>
                <td style={{ fontWeight: isSelected ? 700 : 400, color: 'var(--md-sys-color-on-surface-variant)' }}>
                  {formatCurrency(row.excelPrice1to1)}
                </td>
                <td style={{ fontWeight: isSelected ? 700 : 500, color: 'var(--md-sys-color-primary)' }}>
                  {formatCurrency(row.exactPrice1to1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="md-card md-card--elevated">
      <div className="md-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3 className="md-card__title">
            <Table size={18} color="var(--md-sys-color-primary)" />
            Probability & Expected Value Strike Ladder
          </h3>
          <div className="md-segmented-button">
            <button
              className={`md-segmented-button__segment ${activeTab === 'call' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => setActiveTab('call')}
            >
              Call Strikes (Rows 21–31)
            </button>
            <button
              className={`md-segmented-button__segment ${activeTab === 'put' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => setActiveTab('put')}
            >
              Put Strikes (Rows 35–45)
            </button>
            <button
              className={`md-segmented-button__segment ${activeTab === 'both' ? 'md-segmented-button__segment--active' : ''}`}
              onClick={() => setActiveTab('both')}
            >
              Both Wings
            </button>
          </div>
        </div>
        <span className="label-small" style={{ color: 'var(--md-sys-color-outline)' }}>
          Click any row to set as Active Short Strike ("x")
        </span>
      </div>

      {activeTab === 'call' && renderTable('call', callRows, callShort)}
      {activeTab === 'put' && renderTable('put', putRows, putShort)}
      {activeTab === 'both' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div className="label-medium" style={{ marginBottom: 8, color: 'var(--quant-color-loss)' }}>
              Bear Call Spread Ladder (Excel Rows 21–31) — Active Credit: ${callCredit.toFixed(2)}
            </div>
            {renderTable('call', callRows, callShort)}
          </div>
          <div>
            <div className="label-medium" style={{ marginBottom: 8, color: 'var(--quant-color-gain)' }}>
              Bull Put Spread Ladder (Excel Rows 35–45) — Active Credit: ${putCredit.toFixed(2)}
            </div>
            {renderTable('put', putRows, putShort)}
          </div>
        </div>
      )}
    </div>
  );
};

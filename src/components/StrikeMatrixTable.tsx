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
  const [activeTab, setActiveTab] = useState<OptionType>('call');

  const callRows = buildStrikeMatrix('call', callShort, callLong, callCredit, params, 10);
  const putRows = buildStrikeMatrix('put', putShort, putLong, putCredit, params, 10);

  const activeRows = activeTab === 'call' ? callRows : putRows;
  const selectedShort = activeTab === 'call' ? callShort : putShort;

  return (
    <div className="md-card md-card--elevated">
      <div className="md-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 className="md-card__title">
            <Table size={18} color="var(--md-sys-color-primary)" />
            Probability & Expected Value Matrix
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
          </div>
        </div>
        <span className="label-small" style={{ color: 'var(--md-sys-color-outline)' }}>
          Click any row to set as Short Strike
        </span>
      </div>

      <div className="md-table-container">
        <table className="md-table">
          <thead>
            <tr>
              <th>Strike</th>
              <th>Status</th>
              <th>P({activeTab === 'call' ? 'S > Strike' : 'S < Strike'})</th>
              <th>P(Touch)</th>
              <th>Expected Gain</th>
              <th>Expected Pain (Excel)</th>
              <th>EV (Excel Model)</th>
              <th>EV (Exact Model)</th>
              <th>Reward / Risk</th>
              <th>1:1 EV Fair Price</th>
            </tr>
          </thead>
          <tbody>
            {activeRows.map((row: StrikeMatrixRow) => {
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
                  onClick={() => activeTab === 'call' ? onSelectCallShort(row.strike) : onSelectPutShort(row.strike)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isSelected && <CheckCircle2 size={14} color="var(--md-sys-color-primary)" />}
                      <span>${row.strike.toFixed(0)}</span>
                    </div>
                  </td>
                  <td>
                    {isSelected ? (
                      <span className="md-chip md-chip--neutral" style={{ fontSize: 10 }}>ACTIVE SHORT</span>
                    ) : (
                      <span style={{ color: 'var(--md-sys-color-outline)', fontSize: 11 }}>OTM</span>
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
                  <td style={{ color: isSelected ? 'var(--quant-color-gain)' : 'var(--md-sys-color-outline)' }}>
                    {isSelected && row.excelGain !== null ? formatCurrency(row.excelGain) : '—'}
                  </td>
                  <td style={{ color: isSelected ? 'var(--quant-color-loss)' : 'var(--md-sys-color-outline)' }}>
                    {isSelected && row.excelPain !== null ? formatCurrency(row.excelPain) : '—'}
                  </td>
                  <td>
                    {isSelected && row.excelEV !== null ? (
                      <span style={{ color: row.excelEV >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)' }}>
                        {formatCurrency(row.excelEV)}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {isSelected && row.exactEV !== null ? (
                      <span
                        className="md-chip"
                        style={{
                          backgroundColor: row.exactEV >= 0 ? 'var(--quant-color-gain-container)' : 'var(--quant-color-loss-container)',
                          color: row.exactEV >= 0 ? 'var(--quant-color-on-gain-container)' : 'var(--quant-color-on-loss-container)'
                        }}
                      >
                        {formatCurrency(row.exactEV)}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {isSelected && row.excelRewardRisk !== null ? formatMultiplier(row.excelRewardRisk) : '—'}
                  </td>
                  <td style={{ fontWeight: isSelected ? 700 : 400, color: 'var(--md-sys-color-primary)' }}>
                    {isSelected && row.excelPrice1to1 !== null ? formatCurrency(row.excelPrice1to1) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { JournalEntry, StrategyType, TradeStatus, ExecutionGrade, TradeLeg } from '../types';
import { exportJournalJSON, importJournalJSON, saveJournalEntry } from '../storage';
import { Upload, Download, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';

/**
 * RFC-4180 compliant CSV row parser supporting quoted strings with embedded commas
 */
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Decodes standard OCC option symbol (e.g. "SPY 261030P00575000" or "AAPL261120C00705000")
 */
function parseOCCSymbol(raw: string): {
  underlying: string;
  expirationDate: string;
  type: 'call' | 'put';
  strike: number;
} | null {
  const cleaned = raw.replace(/\s+/g, '').toUpperCase();
  const match = cleaned.match(/^([A-Z]{1,6})(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/);
  if (!match) return null;
  const [, underlying, yy, mm, dd, cp, strikeDigits] = match;
  return {
    underlying,
    expirationDate: `20${yy}-${mm}-${dd}`,
    type: cp === 'C' ? 'call' : 'put',
    strike: parseInt(strikeDigits, 10) / 1000
  };
}

interface BrokerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  onReloadEntries: () => void;
}

export const BrokerImportModal: React.FC<BrokerImportModalProps> = ({
  isOpen,
  onClose,
  entries,
  onReloadEntries
}) => {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const jsonStr = exportJournalJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optionsquant_journal_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Journal exported successfully to JSON!');
    setIsError(false);
  };

  const handleExportCSV = () => {
    // Generate CSV
    const headers = ['ID', 'Date', 'Symbol', 'Strategy', 'Status', 'Realized PnL', 'Net Credit', 'Max Risk', 'Grade', 'Rules Followed', 'Notes'];
    const rows = entries.map((e) => [
      e.id,
      e.entryDate,
      e.symbol,
      e.strategyType,
      e.status,
      e.realizedPnL || 0,
      e.netCreditOrDebitPerShare,
      e.maxRiskDollars,
      e.psychology.executionGrade,
      e.psychology.rulesFollowed ? 'YES' : 'NO',
      `"${(e.thesisNotes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optionsquant_trades_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Trades exported successfully to CSV!');
    setIsError(false);
  };

  const handleFileImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (file.name.endsWith('.json')) {
        const res = importJournalJSON(text);
        if (res.success) {
          setStatusMessage(`Imported ${res.count} trades successfully from JSON!`);
          setIsError(false);
          onReloadEntries();
        } else {
          setStatusMessage(`Import failed: ${res.error}`);
          setIsError(true);
        }
      } else {
        // Parse CSV rows (supports OptionsQuant CSV, ThinkorSwim, tastytrade, IBKR, and OCC symbols)
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setStatusMessage('CSV file contains no data rows.');
          setIsError(true);
          return;
        }
        const headers = parseCSVRow(lines[0]).map((h) => h.toLowerCase());
        const groupedEntries = new Map<string, JournalEntry>();
        let importedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVRow(lines[i]);
          if (cols.length < 3) continue;

          const getCol = (names: string[], fallbackIdx = -1) => {
            const idx = headers.findIndex((h) => names.some((n) => h.includes(n)));
            if (idx >= 0 && cols[idx] !== undefined) return cols[idx];
            return fallbackIdx >= 0 && cols[fallbackIdx] !== undefined ? cols[fallbackIdx] : '';
          };

          const rawSymField = getCol(['symbol', 'ticker', 'underlying', 'instrument'], 2).toUpperCase() || 'SPY';
          const occ = parseOCCSymbol(rawSymField);
          const rawSym = occ ? occ.underlying : rawSymField.split(/\s+/)[0];
          const rawDate = (getCol(['date', 'entry', 'time'], 1) || new Date().toISOString().split('T')[0]).split('T')[0];
          const rawStrat = getCol(['strategy', 'spread'], 3).toLowerCase().replace(/\s+/g, '-') as StrategyType;
          const rawStatus = getCol(['status'], 4).toLowerCase() as TradeStatus;
          const rawPnL = parseFloat(getCol(['pnl', 'profit', 'realized', 'net'], 5).replace(/[$,]/g, '')) || 0;
          const rawCredit = parseFloat(getCol(['credit', 'price', 'premium', 'fill'], 6).replace(/[$,]/g, '')) || 0.75;
          const rawRisk = parseFloat(getCol(['risk', 'margin', 'max risk'], 7).replace(/[$,]/g, '')) || 425;
          const rawGrade = (getCol(['grade'], 8).toUpperCase() || 'A') as ExecutionGrade;
          const rawRules = getCol(['rules'], 9).toUpperCase() !== 'NO';
          const rawNotes = getCol(['notes', 'thesis', 'description'], 10) || `Imported from ${file.name}`;

          // Extract leg-level details if present
          const rawStrike = occ ? occ.strike : parseFloat(getCol(['strike']).replace(/[$,]/g, '')) || 500;
          const rawOptType = occ
            ? occ.type
            : getCol(['call/put', 'option type', 'right', 'put/call']).toLowerCase().includes('call')
              ? 'call'
              : 'put';
          const rawSide = getCol(['side', 'position', 'action']).toLowerCase();
          const legPos: 'buy' | 'sell' = rawSide.includes('buy') || rawSide.includes('bto') || rawSide.includes('btc') ? 'buy' : 'sell';
          const rawContracts = Math.max(1, Math.abs(parseInt(getCol(['qty', 'quantity', 'contracts']), 10) || 5));

          const leg: TradeLeg = {
            id: `csv-leg-${Date.now()}-${i}`,
            type: rawOptType,
            position: legPos,
            strike: rawStrike,
            expirationDate: occ?.expirationDate,
            entryPrice: Math.abs(rawCredit),
            contracts: rawContracts,
            status: rawStatus === 'open' ? 'open' : 'closed'
          };

          // Group multi-leg broker fills that share the same Date + Symbol when no explicit ID is given
          const explicitId = getCol(['id'], 0);
          const groupKey = explicitId && explicitId.startsWith('trade-') ? explicitId : `${rawDate}_${rawSym}_${i}`;
          const brokerMultiLegKey = !explicitId ? `${rawDate}_${rawSym}` : groupKey;

          if (!explicitId && groupedEntries.has(brokerMultiLegKey)) {
            const existing = groupedEntries.get(brokerMultiLegKey)!;
            existing.legs.push(leg);
            const signedLegPrem = (legPos === 'sell' ? 1 : -1) * Math.abs(rawCredit);
            existing.netCreditOrDebitPerShare = Number((existing.netCreditOrDebitPerShare + signedLegPrem).toFixed(2));
            existing.totalPremiumDollars = existing.netCreditOrDebitPerShare * rawContracts * 100;
            if (existing.realizedPnL !== undefined) {
              existing.realizedPnL += rawPnL;
            }
            // Auto-infer strategy type from grouped leg count
            const hasCalls = existing.legs.some((l) => l.type === 'call');
            const hasPuts = existing.legs.some((l) => l.type === 'put');
            if (existing.legs.length >= 4 && hasCalls && hasPuts) {
              existing.strategyType = 'iron-condor';
            } else if (existing.legs.length === 2 && hasCalls && hasPuts) {
              existing.strategyType = 'strangle';
            } else if (existing.legs.length === 2 && hasCalls) {
              existing.strategyType = 'bear-call-spread';
            } else if (existing.legs.length === 2 && hasPuts) {
              existing.strategyType = 'bull-put-spread';
            }
          } else {
            const validStrats: StrategyType[] = [
              'iron-condor', 'bull-put-spread', 'bear-call-spread', 'iron-butterfly',
              'calendar-spread', 'diagonal-spread', 'straddle', 'strangle',
              'covered-call', 'cash-secured-put', 'long-call', 'long-put', 'equity', 'custom'
            ];
            const resolvedStrat: StrategyType = validStrats.includes(rawStrat) ? rawStrat : 'iron-condor';

            const entry: JournalEntry = {
              id: `csv-${Date.now()}-${i}`,
              entryDate: rawDate,
              exitDate: rawStatus === 'open' ? undefined : rawDate,
              symbol: rawSym,
              strategyType: resolvedStrat,
              status: rawStatus === 'open' ? 'open' : 'closed',
              legs: [leg],
              adjustments: [],
              netCreditOrDebitPerShare: rawCredit,
              totalPremiumDollars: rawCredit * rawContracts * 100,
              feesAndCommissions: Number((rawContracts * 0.65).toFixed(2)),
              realizedPnL: rawStatus === 'open' ? undefined : rawPnL,
              maxRiskDollars: rawRisk,
              returnOnRisk: rawRisk > 0 ? rawPnL / rawRisk : 0,
              psychology: {
                confidence: 8,
                mindsetTags: ['disciplined'],
                rulesFollowed: rawRules,
                planAdherenceScore: rawRules ? 100 : 70,
                executionGrade: ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'].includes(rawGrade) ? rawGrade : 'A'
              },
              thesisNotes: rawNotes,
              tags: ['csv-import']
            };
            groupedEntries.set(brokerMultiLegKey, entry);
          }
        }

        groupedEntries.forEach((entry) => {
          saveJournalEntry(entry);
          importedCount++;
        });

        onReloadEntries();
        setStatusMessage(`Imported ${importedCount} trade(s) from ${file.name} into journal!`);
        setIsError(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="md-dialog-backdrop" onClick={onClose}>
      <div className="md-dialog" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div className="md-dialog__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Upload size={22} color="var(--md-sys-color-primary)" />
            <h2 className="md-dialog__title">Broker Import & Data Studio</h2>
          </div>
          <button className="md-icon-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Import Box */}
        <div
          style={{
            border: '2px dashed var(--md-sys-color-outline-variant)',
            borderRadius: 14,
            padding: 24,
            textAlign: 'center',
            backgroundColor: 'var(--md-sys-color-surface-container)'
          }}
        >
          <FileText size={36} color="var(--md-sys-color-primary)" style={{ margin: '0 auto 8px' }} />
          <div className="title-medium">Import Broker CSV or JSON Backup</div>
          <div className="body-small" style={{ color: 'var(--md-sys-color-outline)', marginTop: 4 }}>
            Supports ThinkorSwim, Charles Schwab, Tastytrade, Interactive Brokers (IBKR), Robinhood, and OptionsQuant backups.
          </div>

          <div style={{ marginTop: 14 }}>
            <label htmlFor="broker-file-import" className="md-button md-button--filled" style={{ cursor: 'pointer' }}>
              <span>Select File (.csv, .json)</span>
              <input
                id="broker-file-import"
                name="brokerFile"
                type="file"
                accept=".csv,.json,.txt"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files && e.target.files[0] && handleFileImport(e.target.files[0])}
              />
            </label>
          </div>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backgroundColor: isError ? 'var(--quant-color-loss-container)' : 'var(--quant-color-gain-container)',
              color: isError ? 'var(--quant-color-on-loss-container)' : 'var(--quant-color-on-gain-container)'
            }}
          >
            {isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Export Options */}
        <div className="md-card md-card--tonal" style={{ padding: 16 }}>
          <div className="title-small" style={{ marginBottom: 10 }}>Export & Backup Studio</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="md-button md-button--outlined" onClick={handleExportCSV}>
              <Download size={14} />
              <span>Export as Spreadsheet (CSV)</span>
            </button>
            <button className="md-button md-button--outlined" onClick={handleExportJSON}>
              <Download size={14} />
              <span>Full Encrypted Backup (JSON)</span>
            </button>
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

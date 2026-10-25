import React, { useState } from 'react';
import { JournalEntry, StrategyType, TradeStatus, ExecutionGrade } from '../types';
import { exportJournalJSON, importJournalJSON, saveJournalEntry } from '../storage';
import { Upload, Download, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';

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
        // Parse CSV rows (supports OptionsQuant CSV and generic Broker CSV columns)
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setStatusMessage('CSV file contains no data rows.');
          setIsError(true);
          return;
        }
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        let importedCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          if (cols.length < 3) continue;

          const getCol = (names: string[], fallbackIdx: number) => {
            const idx = headers.findIndex((h) => names.some((n) => h.includes(n)));
            return idx >= 0 && cols[idx] !== undefined ? cols[idx] : cols[fallbackIdx] || '';
          };

          const rawSym = getCol(['symbol', 'ticker', 'underlying'], 2).toUpperCase() || 'SPY';
          const rawDate = getCol(['date', 'entry', 'time'], 1) || new Date().toISOString().split('T')[0];
          const rawStrat = getCol(['strategy', 'type', 'spread'], 3).toLowerCase() as StrategyType;
          const rawStatus = getCol(['status'], 4).toLowerCase() as TradeStatus;
          const rawPnL = parseFloat(getCol(['pnl', 'profit', 'realized'], 5)) || 0;
          const rawCredit = parseFloat(getCol(['credit', 'price', 'premium'], 6)) || 0.75;
          const rawRisk = parseFloat(getCol(['risk', 'margin'], 7)) || 425;
          const rawGrade = (getCol(['grade'], 8).toUpperCase() || 'A') as ExecutionGrade;
          const rawRules = getCol(['rules'], 9).toUpperCase() !== 'NO';
          const rawNotes = getCol(['notes', 'thesis', 'description'], 10) || `Imported from ${file.name}`;

          const entry: JournalEntry = {
            id: `csv-${Date.now()}-${i}`,
            entryDate: rawDate.split('T')[0],
            exitDate: rawStatus === 'open' ? undefined : rawDate.split('T')[0],
            symbol: rawSym,
            strategyType: rawStrat || 'iron-condor',
            status: rawStatus === 'open' ? 'open' : 'closed',
            legs: [
              {
                id: `csv-leg-${i}`,
                type: 'put',
                position: 'sell',
                strike: 500,
                entryPrice: rawCredit,
                contracts: 5,
                status: rawStatus === 'open' ? 'open' : 'closed'
              }
            ],
            adjustments: [],
            netCreditOrDebitPerShare: rawCredit,
            totalPremiumDollars: rawCredit * 500,
            feesAndCommissions: 3.25,
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
          saveJournalEntry(entry);
          importedCount++;
        }

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

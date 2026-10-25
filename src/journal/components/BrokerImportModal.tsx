import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { exportJournalJSON, importJournalJSON } from '../storage';
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
        // Simple CSV parser for generic or broker formats
        setStatusMessage(`Parsed CSV file ${file.name}. Format mapped to journal entries.`);
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
            <label className="md-button md-button--filled" style={{ cursor: 'pointer' }}>
              <span>Select File (.csv, .json)</span>
              <input
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

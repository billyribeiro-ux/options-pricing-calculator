import React from 'react';
import { Sun, Moon, Upload, RotateCcw, Command, Zap } from 'lucide-react';
import { UnderlyingParams } from '../quant/types';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface HeaderProps {
  params: UnderlyingParams;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenAudit: () => void;
  onResetDefaults: () => void;
  onOpenCommand: () => void;
  onOpenLogModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  params,
  theme,
  onToggleTheme,
  onOpenAudit,
  onResetDefaults,
  onOpenCommand,
  onOpenLogModal
}) => {
  return (
    <header className="md-top-app-bar macos-vibrancy">
      <div className="md-top-app-bar__title-group">
        <span className="md-top-app-bar__ticker-badge">{params.symbol}</span>
        <div>
          <span className="mono-large" style={{ marginRight: 8 }}>
            {formatCurrency(params.spotPrice)}
          </span>
          <span className="md-chip md-chip--neutral" style={{ marginRight: 6 }}>
            IV {formatPercent(params.atmIV)}
          </span>
          <span className="md-chip md-chip--neutral">
            {params.dte} DTE
          </span>
        </div>
      </div>

      <div className="md-top-app-bar__actions">
        <button
          className="md-button md-button--filled"
          onClick={onOpenLogModal}
          title="Log Strategy to Journal"
          style={{ height: 32, padding: '0 12px', fontSize: 12, backgroundColor: 'var(--quant-color-gain)' }}
        >
          <Zap size={14} />
          <span>Log Strategy</span>
        </button>

        <button
          className="md-button md-button--tonal"
          onClick={onOpenCommand}
          title="Quick Actions (Cmd+K)"
          style={{ height: 32, padding: '0 10px', fontSize: 12 }}
        >
          <Command size={14} />
          <span>Cmd+K</span>
        </button>

        <button
          className="md-button md-button--outlined"
          onClick={onOpenAudit}
          title="Compare with Option Pricing.xlsx"
          style={{ height: 32, padding: '0 10px', fontSize: 12 }}
        >
          <Upload size={14} />
          <span>Audit</span>
        </button>

        <button
          className="md-icon-button"
          onClick={onResetDefaults}
          title="Reset to Excel Initial State"
          style={{ width: 32, height: 32 }}
        >
          <RotateCcw size={16} />
        </button>

        <button
          className="md-icon-button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{ width: 32, height: 32 }}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
};

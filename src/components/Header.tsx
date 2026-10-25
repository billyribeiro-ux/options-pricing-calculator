import React from 'react';
import { Sun, Moon, Upload, RotateCcw, Command } from 'lucide-react';
import { UnderlyingParams } from '../quant/types';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface HeaderProps {
  params: UnderlyingParams;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenAudit: () => void;
  onResetDefaults: () => void;
  onOpenCommand: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  params,
  theme,
  onToggleTheme,
  onOpenAudit,
  onResetDefaults,
  onOpenCommand
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
          className="md-button md-button--tonal"
          onClick={onOpenCommand}
          title="Quick Actions (Cmd+K)"
        >
          <Command size={16} />
          <span>Cmd+K</span>
        </button>

        <button
          className="md-button md-button--outlined"
          onClick={onOpenAudit}
          title="Compare with Option Pricing.xlsx"
        >
          <Upload size={16} />
          <span>Excel Audit</span>
        </button>

        <button
          className="md-icon-button"
          onClick={onResetDefaults}
          title="Reset to Excel Initial State"
        >
          <RotateCcw size={18} />
        </button>

        <button
          className="md-icon-button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};

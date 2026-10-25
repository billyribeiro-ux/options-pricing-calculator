import React, { useEffect, useState } from 'react';
import { Search, LayoutDashboard, Box, Dna, FileSpreadsheet, Sun, Moon, ArrowRight } from 'lucide-react';
import { NavView } from './NavRail';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: NavView) => void;
  onSelectTicker: (ticker: string, price: number, iv: number) => void;
  onToggleTheme: () => void;
  theme: 'light' | 'dark';
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectView,
  onSelectTicker,
  onToggleTheme,
  theme
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or toggle
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: 'view-dash', label: 'Go to Strategy & Strike Matrix', icon: LayoutDashboard, action: () => onSelectView('dashboard') },
    { id: 'view-3d', label: 'Go to 3D Volatility & Payoff Visualizer', icon: Box, action: () => onSelectView('3d-surface') },
    { id: 'view-mc', label: 'Run Monte Carlo Risk Simulation (10,000 Paths)', icon: Dna, action: () => onSelectView('monte-carlo') },
    { id: 'view-audit', label: 'Open Excel Audit Bridge (Option Pricing.xlsx)', icon: FileSpreadsheet, action: () => onSelectView('audit') },
    { id: 'ticker-aapl', label: 'Load AAPL ($698.00, IV 17.4%) — Original Excel Preset', icon: ArrowRight, action: () => onSelectTicker('AAPL', 698, 0.174) },
    { id: 'ticker-spy', label: 'Load SPY ($580.00, IV 13.5%) — S&P 500 Index ETF', icon: ArrowRight, action: () => onSelectTicker('SPY', 580, 0.135) },
    { id: 'ticker-qqq', label: 'Load QQQ ($495.00, IV 16.2%) — Nasdaq 100 ETF', icon: ArrowRight, action: () => onSelectTicker('QQQ', 495, 0.162) },
    { id: 'ticker-nvda', label: 'Load NVDA ($140.00, IV 45.0%) — High Volatility Tech', icon: ArrowRight, action: () => onSelectTicker('NVDA', 140, 0.45) },
    { id: 'theme', label: `Toggle Theme (Currently ${theme === 'dark' ? 'Dark' : 'Light'})`, icon: theme === 'dark' ? Sun : Moon, action: onToggleTheme },
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="md-dialog-backdrop" onClick={onClose}>
      <div
        className="md-dialog"
        style={{ maxWidth: 540, padding: 16, gap: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px' }}>
          <Search size={18} color="var(--md-sys-color-outline)" />
          <input
            type="text"
            className="md-input"
            placeholder="Type a command or search ticker (AAPL, SPY, NVDA)..."
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="label-small" style={{ color: 'var(--md-sys-color-outline)' }}>ESC</span>
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--md-sys-color-outline-variant)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 320, overflowY: 'auto' }}>
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className="md-button md-button--text"
                style={{
                  justifyContent: 'flex-start',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  height: 'auto'
                }}
                onClick={() => {
                  item.action();
                  onClose();
                }}
              >
                <Icon size={16} color="var(--md-sys-color-primary)" />
                <span style={{ color: 'var(--md-sys-color-on-surface)' }}>{item.label}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--md-sys-color-outline)', fontSize: 13 }}>
              No commands matching "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

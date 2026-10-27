import React, { useEffect, useState } from 'react';
import { Search, LayoutDashboard, BookOpen, Box, Dna, FileSpreadsheet, Sun, Moon, ArrowRight, Zap, Share2, Sliders } from 'lucide-react';
import { NavView } from './NavRail';
import { StrategyMode } from '../quant/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectView: (view: NavView) => void;
  onSelectTicker: (ticker: string, price: number, iv: number) => void;
  onSelectMode?: (mode: StrategyMode) => void;
  onShareSetup?: () => void;
  onToggleSkew?: () => void;
  onToggleTheme: () => void;
  onOpenLogModal: () => void;
  theme: 'light' | 'dark';
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectView,
  onSelectTicker,
  onSelectMode,
  onShareSetup,
  onToggleSkew,
  onToggleTheme,
  onOpenLogModal,
  theme
}) => {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);

  const actions = [
    { id: 'log-strat', label: 'Log Current Calculator Strategy to Journal', icon: Zap, action: onOpenLogModal },
    ...(onShareSetup ? [{ id: 'share-link', label: 'Copy Shareable Setup Permalink URL', icon: Share2, action: onShareSetup }] : []),
    { id: 'view-dash', label: 'Go to Strategy & Strike Matrix', icon: LayoutDashboard, action: () => onSelectView('dashboard') },
    { id: 'view-journal', label: 'Go to Trader Journal & Calendar Heatmap', icon: BookOpen, action: () => onSelectView('journal') },
    { id: 'view-3d', label: 'Go to 3D Volatility & Payoff Visualizer', icon: Box, action: () => onSelectView('3d-surface') },
    { id: 'view-mc', label: 'Run Monte Carlo Risk Simulation (10,000 Paths)', icon: Dna, action: () => onSelectView('monte-carlo') },
    { id: 'view-audit', label: 'Open Excel Audit Bridge (Option Pricing.xlsx)', icon: FileSpreadsheet, action: () => onSelectView('audit') },
    ...(onSelectMode ? [
      { id: 'mode-ic', label: 'Strategy Mode: Iron Condor (4-Leg Defined Risk)', icon: Sliders, action: () => { onSelectMode('iron-condor'); onSelectView('dashboard'); } },
      { id: 'mode-ib', label: 'Strategy Mode: Iron Butterfly (ATM Pinning)', icon: Sliders, action: () => { onSelectMode('iron-butterfly'); onSelectView('dashboard'); } },
      { id: 'mode-ss', label: 'Strategy Mode: Short Strangle (Undefined Risk)', icon: Sliders, action: () => { onSelectMode('short-strangle'); onSelectView('dashboard'); } },
    ] : []),
    ...(onToggleSkew ? [{ id: 'skew-toggle', label: 'Toggle Equity Volatility Skew (0.15 Smirk vs Flat IV)', icon: Sliders, action: onToggleSkew }] : []),
    { id: 'ticker-aapl', label: 'Load AAPL ($698.00, IV 17.4%) — Original Excel Preset', icon: ArrowRight, action: () => onSelectTicker('AAPL', 698, 0.174) },
    { id: 'ticker-spy', label: 'Load SPY ($580.00, IV 13.5%) — S&P 500 Index ETF', icon: ArrowRight, action: () => onSelectTicker('SPY', 580, 0.135) },
    { id: 'ticker-qqq', label: 'Load QQQ ($495.00, IV 16.2%) — Nasdaq 100 ETF', icon: ArrowRight, action: () => onSelectTicker('QQQ', 495, 0.162) },
    { id: 'ticker-nvda', label: 'Load NVDA ($140.00, IV 45.0%) — High Volatility Tech', icon: ArrowRight, action: () => onSelectTicker('NVDA', 140, 0.45) },
    { id: 'theme', label: `Toggle Theme (Currently ${theme === 'dark' ? 'Dark' : 'Light'})`, icon: theme === 'dark' ? Sun : Moon, action: onToggleTheme },
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIdx(0);
  }, [query, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx((prev) => (filtered.length > 0 ? (prev + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx((prev) => (filtered.length > 0 ? (prev - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === 'Enter' && filtered[selectedIdx]) {
        e.preventDefault();
        filtered[selectedIdx].action();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filtered, selectedIdx]);

  if (!isOpen) return null;

  return (
    <div className="md-dialog-backdrop" onClick={onClose}>
      <div
        className="md-dialog"
        style={{ maxWidth: 540, padding: 16, gap: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px' }}>
          <label htmlFor="command-palette-search" style={{ display: 'none' }}>Search commands and navigation</label>
          <Search size={18} color="var(--md-sys-color-outline)" />
          <input
            id="command-palette-search"
            name="commandSearch"
            type="text"
            className="md-input"
            placeholder="Type a command (Journal, Matrix, Log, AAPL, SPY)..."
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="label-small" style={{ color: 'var(--md-sys-color-outline)' }}>ESC</span>
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--md-sys-color-outline-variant)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 340, overflowY: 'auto' }}>
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === selectedIdx;
            return (
              <button
                key={item.id}
                className="md-button md-button--text"
                onMouseEnter={() => setSelectedIdx(idx)}
                style={{
                  justifyContent: 'flex-start',
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  height: 'auto',
                  backgroundColor: isSelected ? 'var(--md-sys-color-surface-container-high)' : 'transparent'
                }}
                onClick={() => {
                  item.action();
                  onClose();
                }}
              >
                <Icon size={16} color="var(--md-sys-color-primary)" />
                <span style={{ color: 'var(--md-sys-color-on-surface)', fontWeight: isSelected ? 600 : 400 }}>{item.label}</span>
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

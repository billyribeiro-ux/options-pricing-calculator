import React from 'react';
import { LayoutDashboard, BookOpen, Box, Dna, FileSpreadsheet, Settings } from 'lucide-react';

export type NavView = 'dashboard' | 'journal' | '3d-surface' | 'monte-carlo' | 'audit';

interface NavRailProps {
  activeView: NavView;
  onSelectView: (view: NavView) => void;
  onOpenSettings: () => void;
}

export const NavRail: React.FC<NavRailProps> = ({
  activeView,
  onSelectView,
  onOpenSettings
}) => {
  return (
    <nav className="md-nav-rail macos-vibrancy">
      <div className="md-nav-rail__header">
        <div className="md-nav-rail__logo">OQ</div>
      </div>

      <button
        className={`md-nav-rail__item ${activeView === 'dashboard' ? 'md-nav-rail__item--active' : ''}`}
        onClick={() => onSelectView('dashboard')}
        title="Dashboard & Strategy Matrix"
      >
        <div className="md-nav-rail__icon-container">
          <LayoutDashboard size={20} />
        </div>
        <span className="md-nav-rail__label">Matrix</span>
      </button>

      <button
        className={`md-nav-rail__item ${activeView === 'journal' ? 'md-nav-rail__item--active' : ''}`}
        onClick={() => onSelectView('journal')}
        title="Trader Journal & Calendar Heatmap"
      >
        <div className="md-nav-rail__icon-container">
          <BookOpen size={20} />
        </div>
        <span className="md-nav-rail__label">Journal</span>
      </button>

      <button
        className={`md-nav-rail__item ${activeView === '3d-surface' ? 'md-nav-rail__item--active' : ''}`}
        onClick={() => onSelectView('3d-surface')}
        title="Interactive 3D Visualizer"
      >
        <div className="md-nav-rail__icon-container">
          <Box size={20} />
        </div>
        <span className="md-nav-rail__label">3D View</span>
      </button>

      <button
        className={`md-nav-rail__item ${activeView === 'monte-carlo' ? 'md-nav-rail__item--active' : ''}`}
        onClick={() => onSelectView('monte-carlo')}
        title="Monte Carlo Risk Simulation"
      >
        <div className="md-nav-rail__icon-container">
          <Dna size={20} />
        </div>
        <span className="md-nav-rail__label">Simulate</span>
      </button>

      <button
        className={`md-nav-rail__item ${activeView === 'audit' ? 'md-nav-rail__item--active' : ''}`}
        onClick={() => onSelectView('audit')}
        title="Excel Model Audit Bridge"
      >
        <div className="md-nav-rail__icon-container">
          <FileSpreadsheet size={20} />
        </div>
        <span className="md-nav-rail__label">Audit</span>
      </button>

      <div className="md-nav-rail__footer">
        <button
          className="md-icon-button"
          onClick={onOpenSettings}
          title="App Settings"
        >
          <Settings size={20} />
        </button>
      </div>
    </nav>
  );
};

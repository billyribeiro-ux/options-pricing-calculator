import React, { useState, useMemo, useEffect } from 'react';
import { NavRail, NavView } from './components/NavRail';
import { Header } from './components/Header';
import { ParameterInputs } from './components/ParameterInputs';
import { StrategyBuilder, StrategyMode } from './components/StrategyBuilder';
import { KPICards } from './components/KPICards';
import { StrikeMatrixTable } from './components/StrikeMatrixTable';
import { PayoffChart2D } from './components/PayoffChart2D';
import { SceneContainer } from './components/Visualizer3D/SceneContainer';
import { MonteCarloView } from './components/MonteCarloView';
import { ExcelAuditModal } from './components/ExcelAuditModal';
import { CommandPalette } from './components/CommandPalette';

import { UnderlyingParams } from './quant/types';
import { calculateVolatilityBands } from './quant/expectedMove';
import { evaluateIronCondor } from './quant/ironCondor';
import { ParsedSpreadsheetData } from './utils/xlsxParser';

export const App: React.FC = () => {
  // Navigation & Theme
  const [activeView, setActiveView] = useState<NavView>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [strategyMode, setStrategyMode] = useState<StrategyMode>('iron-condor');

  // Baseline state initialized directly from Option Pricing.xlsx
  const [params, setParams] = useState<UnderlyingParams>({
    symbol: 'AAPL',
    spotPrice: 698,
    atmIV: 0.174,
    dte: 10,
    riskFreeRate: 0.045,
    dividendYield: 0.005,
    contracts: 10,
    strikeGap: 5,
    atmStraddleAsk: 6.80,
    straddleFactor: 0.85
  });

  const [callShort, setCallShort] = useState<number>(705);
  const [callLong, setCallLong] = useState<number>(710);
  const [callCredit, setCallCredit] = useState<number>(0.45);

  const [putShort, setPutShort] = useState<number>(690);
  const [putLong, setPutLong] = useState<number>(685);
  const [putCredit, setPutCredit] = useState<number>(0.32);

  // Sync theme attribute to HTML root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Global Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleResetDefaults = () => {
    setParams({
      symbol: 'AAPL',
      spotPrice: 698,
      atmIV: 0.174,
      dte: 10,
      riskFreeRate: 0.045,
      dividendYield: 0.005,
      contracts: 10,
      strikeGap: 5,
      atmStraddleAsk: 6.80,
      straddleFactor: 0.85
    });
    setCallShort(705);
    setCallLong(710);
    setCallCredit(0.45);
    setPutShort(690);
    setPutLong(685);
    setPutCredit(0.32);
    setStrategyMode('iron-condor');
  };

  const handleApplyParsedData = (data: ParsedSpreadsheetData) => {
    setParams(data.params);
    setCallShort(data.callShort);
    setCallLong(data.callLong);
    setCallCredit(data.callCredit);
    setPutShort(data.putShort);
    setPutLong(data.putLong);
    setPutCredit(data.putCredit);
  };

  // Calculations
  const volBands = useMemo(() => calculateVolatilityBands(params), [params]);

  const condorEval = useMemo(() => {
    return evaluateIronCondor(
      callShort,
      callLong,
      callCredit,
      putShort,
      putLong,
      putCredit,
      params
    );
  }, [callShort, callLong, callCredit, putShort, putLong, putCredit, params]);

  return (
    <div className="app-shell">
      {/* 1. Navigation Rail */}
      <NavRail
        activeView={activeView}
        onSelectView={(v) => {
          if (v === 'audit') setIsAuditOpen(true);
          else setActiveView(v);
        }}
        onOpenSettings={() => setIsCommandOpen(true)}
      />

      {/* 2. Main Workspace */}
      <div className="app-main">
        {/* Top App Bar */}
        <Header
          params={params}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenAudit={() => setIsAuditOpen(true)}
          onResetDefaults={handleResetDefaults}
          onOpenCommand={() => setIsCommandOpen(true)}
        />

        {/* Dynamic View Content */}
        <div className="app-content">
          {/* Always display KPI Summary Cards */}
          <KPICards condorEval={condorEval} />

          {activeView === 'dashboard' && (
            <>
              {/* Parameter Inputs & Strategy Architecture */}
              <div className="grid-analytics">
                <ParameterInputs
                  params={params}
                  volBands={volBands}
                  onChangeParams={(newP) => setParams((prev) => ({ ...prev, ...newP }))}
                />
                <StrategyBuilder
                  mode={strategyMode}
                  onChangeMode={setStrategyMode}
                  callShort={callShort}
                  callLong={callLong}
                  callCredit={callCredit}
                  putShort={putShort}
                  putLong={putLong}
                  putCredit={putCredit}
                  onChangeCallSpread={(s, l, c) => {
                    setCallShort(s);
                    setCallLong(l);
                    setCallCredit(c);
                  }}
                  onChangePutSpread={(s, l, c) => {
                    setPutShort(s);
                    setPutLong(l);
                    setPutCredit(c);
                  }}
                  condorEval={condorEval}
                  params={params}
                />
              </div>

              {/* 2D Payoff & Probability Chart */}
              <PayoffChart2D condorEval={condorEval} params={params} />

              {/* Dynamic Strike Matrix Table */}
              <StrikeMatrixTable
                callShort={callShort}
                callLong={callLong}
                callCredit={callCredit}
                putShort={putShort}
                putLong={putLong}
                putCredit={putCredit}
                params={params}
                onSelectCallShort={(s) => {
                  setCallShort(s);
                  setCallLong(s + params.strikeGap);
                }}
                onSelectPutShort={(s) => {
                  setPutShort(s);
                  setPutLong(s - params.strikeGap);
                }}
              />
            </>
          )}

          {activeView === '3d-surface' && (
            <SceneContainer condorEval={condorEval} params={params} />
          )}

          {activeView === 'monte-carlo' && (
            <MonteCarloView condorEval={condorEval} params={params} />
          )}
        </div>
      </div>

      {/* 3. Excel Audit Bridge Modal */}
      <ExcelAuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        condorEval={condorEval}
        params={params}
        onApplyParsedData={handleApplyParsedData}
      />

      {/* 4. Quick Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        onSelectView={(v) => {
          if (v === 'audit') setIsAuditOpen(true);
          else setActiveView(v);
        }}
        onSelectTicker={(ticker, price, iv) => {
          const gap = price > 300 ? 5 : price > 100 ? 2.5 : 1;
          const nearest = Math.round(price / gap) * gap;
          setParams((prev) => ({
            ...prev,
            symbol: ticker,
            spotPrice: price,
            atmIV: iv,
            strikeGap: gap
          }));
          setCallShort(nearest + gap);
          setCallLong(nearest + gap * 2);
          setPutShort(nearest - gap);
          setPutLong(nearest - gap * 2);
        }}
        onToggleTheme={handleToggleTheme}
        theme={theme}
      />
    </div>
  );
};
export default App;

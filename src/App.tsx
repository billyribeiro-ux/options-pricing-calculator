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
import { JournalView } from './journal/JournalView';
import { LogCalculatorTradeModal } from './journal/components/LogCalculatorTradeModal';
import { saveJournalEntry } from './journal/storage';

import { UnderlyingParams } from './quant/types';
import { calculateVolatilityBands } from './quant/expectedMove';
import { evaluateIronCondor } from './quant/ironCondor';
import { ParsedSpreadsheetData } from './utils/xlsxParser';
import { JournalEntry } from './journal/types';

const CALC_STORAGE_KEY = 'optionsquant_calc_state_v1';

const DEFAULT_PARAMS: UnderlyingParams = {
  symbol: 'AAPL',
  spotPrice: 698,
  atmIV: 0.174,
  dte: 10,
  riskFreeRate: 0.045,
  dividendYield: 0.005,
  contracts: 10,
  strikeGap: 5,
  atmStraddleAsk: 6.80,
  straddleFactor: 0.85,
  skewSlope: 0
};

function loadInitialCalcState() {
  if (typeof window !== 'undefined') {
    const sp = new URLSearchParams(window.location.search);
    if (sp.has('sym') && sp.has('s0')) {
      return {
        params: {
          ...DEFAULT_PARAMS,
          symbol: (sp.get('sym') || 'AAPL').toUpperCase(),
          spotPrice: parseFloat(sp.get('s0') || '698') || 698,
          atmIV: parseFloat(sp.get('iv') || '0.174') || 0.174,
          dte: parseInt(sp.get('dte') || '10', 10) || 10,
          contracts: parseInt(sp.get('qty') || '10', 10) || 10,
          strikeGap: parseFloat(sp.get('gap') || '5') || 5,
          skewSlope: parseFloat(sp.get('skew') || '0') || 0
        },
        strategyMode: (sp.get('mode') as StrategyMode) || 'iron-condor',
        callShort: parseFloat(sp.get('cs') || '705') || 705,
        callLong: parseFloat(sp.get('cl') || '710') || 710,
        callCredit: parseFloat(sp.get('cc') || '0.45') || 0.45,
        putShort: parseFloat(sp.get('ps') || '690') || 690,
        putLong: parseFloat(sp.get('pl') || '685') || 685,
        putCredit: parseFloat(sp.get('pc') || '0.32') || 0.32
      };
    }
    try {
      const raw = localStorage.getItem(CALC_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.params && parsed.params.symbol) {
          return {
            params: { ...DEFAULT_PARAMS, ...parsed.params },
            strategyMode: (parsed.strategyMode as StrategyMode) || 'iron-condor',
            callShort: parsed.callShort ?? 705,
            callLong: parsed.callLong ?? 710,
            callCredit: parsed.callCredit ?? 0.45,
            putShort: parsed.putShort ?? 690,
            putLong: parsed.putLong ?? 685,
            putCredit: parsed.putCredit ?? 0.32
          };
        }
      }
    } catch {
      // Fallback to default Excel state
    }
  }
  return {
    params: DEFAULT_PARAMS,
    strategyMode: 'iron-condor' as StrategyMode,
    callShort: 705,
    callLong: 710,
    callCredit: 0.45,
    putShort: 690,
    putLong: 685,
    putCredit: 0.32
  };
}

export const App: React.FC = () => {
  const initial = useMemo(() => loadInitialCalcState(), []);

  // Navigation & Theme
  const [activeView, setActiveView] = useState<NavView>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);
  const [isCommandOpen, setIsCommandOpen] = useState<boolean>(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [strategyMode, setStrategyMode] = useState<StrategyMode>(initial.strategyMode);

  // Baseline state initialized from URL permalink, LocalStorage, or Option Pricing.xlsx
  const [params, setParams] = useState<UnderlyingParams>(initial.params);

  const [callShort, setCallShort] = useState<number>(initial.callShort);
  const [callLong, setCallLong] = useState<number>(initial.callLong);
  const [callCredit, setCallCredit] = useState<number>(initial.callCredit);

  const [putShort, setPutShort] = useState<number>(initial.putShort);
  const [putLong, setPutLong] = useState<number>(initial.putLong);
  const [putCredit, setPutCredit] = useState<number>(initial.putCredit);

  // Persist calculator state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        CALC_STORAGE_KEY,
        JSON.stringify({
          params,
          strategyMode,
          callShort,
          callLong,
          callCredit,
          putShort,
          putLong,
          putCredit
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [params, strategyMode, callShort, callLong, callCredit, putShort, putLong, putCredit]);

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
    setParams(DEFAULT_PARAMS);
    setCallShort(705);
    setCallLong(710);
    setCallCredit(0.45);
    setPutShort(690);
    setPutLong(685);
    setPutCredit(0.32);
    setStrategyMode('iron-condor');
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleShareSetup = () => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams({
      sym: params.symbol,
      s0: String(params.spotPrice),
      iv: String(params.atmIV),
      dte: String(params.dte),
      qty: String(params.contracts),
      gap: String(params.strikeGap),
      skew: String(params.skewSlope ?? 0),
      mode: strategyMode,
      cs: String(callShort),
      cl: String(callLong),
      cc: String(callCredit),
      ps: String(putShort),
      pl: String(putLong),
      pc: String(putCredit)
    });
    const shareUrl = `${window.location.origin}${window.location.pathname}?${sp.toString()}`;
    window.history.replaceState({}, '', `?${sp.toString()}`);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
  };

  const handleLoadJournalTradeIntoCalculator = (trade: JournalEntry) => {
    const snap = trade.snapshotAtEntry;
    const sellCall = trade.legs.find((l) => l.type === 'call' && l.position === 'sell');
    const buyCall = trade.legs.find((l) => l.type === 'call' && l.position === 'buy');
    const sellPut = trade.legs.find((l) => l.type === 'put' && l.position === 'sell');
    const buyPut = trade.legs.find((l) => l.type === 'put' && l.position === 'buy');
    const inferredSpot =
      snap?.spotPrice ||
      (sellCall?.strike && sellPut?.strike
        ? Math.round((sellCall.strike + sellPut.strike) / 2)
        : sellCall?.strike || sellPut?.strike || 580);
    const gap = inferredSpot > 300 ? 5 : 2.5;

    setParams((prev) => ({
      ...prev,
      symbol: trade.symbol,
      spotPrice: inferredSpot,
      atmIV: snap?.atmIV || prev.atmIV,
      dte: snap?.dte || prev.dte,
      contracts: trade.legs[0]?.contracts || prev.contracts,
      strikeGap: gap
    }));

    if (sellCall?.strike) setCallShort(sellCall.strike);
    if (buyCall?.strike) setCallLong(buyCall.strike);
    else if (sellCall?.strike) setCallLong(sellCall.strike + gap);

    if (sellPut?.strike) setPutShort(sellPut.strike);
    if (buyPut?.strike) setPutLong(buyPut.strike);
    else if (sellPut?.strike) setPutLong(sellPut.strike - gap);

    if (trade.strategyType === 'iron-butterfly') setStrategyMode('iron-butterfly');
    else if (trade.strategyType === 'strangle') setStrategyMode('short-strangle');
    else if (trade.strategyType === 'bear-call-spread') setStrategyMode('call-spread');
    else if (trade.strategyType === 'bull-put-spread') setStrategyMode('put-spread');
    else setStrategyMode('iron-condor');

    setActiveView('dashboard');
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

  const handleSaveLoggedTrade = (entry: JournalEntry) => {
    saveJournalEntry(entry);
    setActiveView('journal'); // Automatically jump to journal to see logged trade!
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
      params,
      strategyMode
    );
  }, [callShort, callLong, callCredit, putShort, putLong, putCredit, params, strategyMode]);

  return (
    <div className="app-shell">
      {/* 1. Navigation Rail / Bottom Nav Bar */}
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
          onOpenLogModal={() => setIsLogModalOpen(true)}
          onShareSetup={handleShareSetup}
        />

        {/* Dynamic View Content */}
        <div className="app-content">
          {activeView === 'dashboard' && (
            <>
              {/* Always display KPI Summary Cards for calculator */}
              <KPICards condorEval={condorEval} />

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
                  onOpenLogModal={() => setIsLogModalOpen(true)}
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

          {activeView === 'journal' && (
            <JournalView onLoadIntoCalculator={handleLoadJournalTradeIntoCalculator} />
          )}

          {activeView === '3d-surface' && (
            <SceneContainer condorEval={condorEval} params={params} />
          )}

          {activeView === 'monte-carlo' && (
            <MonteCarloView condorEval={condorEval} params={params} />
          )}
        </div>
      </div>

      {/* 3. 1-Click Calculator to Journal Bridge Modal */}
      <LogCalculatorTradeModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        params={params}
        condorEval={condorEval}
        strategyMode={strategyMode}
        onSaveTrade={handleSaveLoggedTrade}
      />

      {/* 4. Excel Audit Bridge Modal & Export */}
      <ExcelAuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        condorEval={condorEval}
        params={params}
        callShort={callShort}
        callLong={callLong}
        callCredit={callCredit}
        putShort={putShort}
        putLong={putLong}
        putCredit={putCredit}
        onApplyParsedData={handleApplyParsedData}
      />

      {/* 5. Quick Command Palette (Cmd+K) */}
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
        onOpenLogModal={() => setIsLogModalOpen(true)}
        theme={theme}
      />
    </div>
  );
};
export default App;

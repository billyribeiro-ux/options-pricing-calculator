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
import { estimateSpreadCredit } from './quant/blackScholes';
import { ParsedSpreadsheetData } from './utils/xlsxParser';
import { JournalEntry } from './journal/types';

const CALC_STORAGE_KEY = 'optionsquant_calc_state_v2';

const ZERO_PARAMS: UnderlyingParams = {
  symbol: '',
  spotPrice: 0,
  atmIV: 0.18,
  dte: 10,
  riskFreeRate: 0.045,
  dividendYield: 0,
  contracts: 1,
  strikeGap: 5,
  atmStraddleAsk: 0,
  straddleFactor: 0.85,
  skewSlope: 0
};

function loadInitialCalcState() {
  if (typeof window !== 'undefined') {
    const sp = new URLSearchParams(window.location.search);
    if (sp.has('sym') && sp.has('s0')) {
      const s0 = parseFloat(sp.get('s0') || '0') || 0;
      return {
        params: {
          ...ZERO_PARAMS,
          symbol: (sp.get('sym') || '').toUpperCase(),
          spotPrice: s0,
          atmIV: parseFloat(sp.get('iv') || '0.18') || 0.18,
          dte: parseInt(sp.get('dte') || '10', 10) || 10,
          contracts: parseInt(sp.get('qty') || '1', 10) || 1,
          strikeGap: parseFloat(sp.get('gap') || '5') || 5,
          skewSlope: parseFloat(sp.get('skew') || '0') || 0
        },
        strategyMode: (sp.get('mode') as StrategyMode) || 'iron-condor',
        callShort: s0 > 0 ? parseFloat(sp.get('cs') || '0') || 0 : 0,
        callLong: s0 > 0 ? parseFloat(sp.get('cl') || '0') || 0 : 0,
        callCredit: s0 > 0 ? parseFloat(sp.get('cc') || '0') || 0 : 0,
        putShort: s0 > 0 ? parseFloat(sp.get('ps') || '0') || 0 : 0,
        putLong: s0 > 0 ? parseFloat(sp.get('pl') || '0') || 0 : 0,
        putCredit: s0 > 0 ? parseFloat(sp.get('pc') || '0') || 0 : 0
      };
    }
    try {
      const raw = localStorage.getItem(CALC_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.params) {
          const s0 = Number(parsed.params.spotPrice) || 0;
          return {
            params: { ...ZERO_PARAMS, ...parsed.params, spotPrice: s0 },
            strategyMode: (parsed.strategyMode as StrategyMode) || 'iron-condor',
            callShort: s0 > 0 ? (parsed.callShort ?? 0) : 0,
            callLong: s0 > 0 ? (parsed.callLong ?? 0) : 0,
            callCredit: s0 > 0 ? (parsed.callCredit ?? 0) : 0,
            putShort: s0 > 0 ? (parsed.putShort ?? 0) : 0,
            putLong: s0 > 0 ? (parsed.putLong ?? 0) : 0,
            putCredit: s0 > 0 ? (parsed.putCredit ?? 0) : 0
          };
        }
      }
    } catch {
      // Fallback to zero state
    }
  }
  return {
    params: ZERO_PARAMS,
    strategyMode: 'iron-condor' as StrategyMode,
    callShort: 0,
    callLong: 0,
    callCredit: 0,
    putShort: 0,
    putLong: 0,
    putCredit: 0
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
    setParams(ZERO_PARAMS);
    setCallShort(0);
    setCallLong(0);
    setCallCredit(0);
    setPutShort(0);
    setPutLong(0);
    setPutCredit(0);
    setStrategyMode('iron-condor');
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleLoadTickerPreset = (
    ticker: string,
    price: number,
    iv: number,
    presetContracts = 10,
    presetCallShort?: number,
    presetCallLong?: number,
    presetCallCredit?: number,
    presetPutShort?: number,
    presetPutLong?: number,
    presetPutCredit?: number
  ) => {
    if (price <= 0) {
      handleResetDefaults();
      return;
    }
    const gap = price > 300 ? 5 : price > 100 ? 2.5 : 1;
    const nearest = Math.round(price / gap) * gap;
    const nextParams: UnderlyingParams = {
      ...params,
      symbol: ticker,
      spotPrice: price,
      atmIV: iv,
      dte: params.dte > 0 ? params.dte : 10,
      contracts: presetContracts,
      strikeGap: gap
    };
    const cs = presetCallShort ?? nearest + gap;
    const cl = presetCallLong ?? nearest + gap * 2;
    const ps = presetPutShort ?? nearest - gap;
    const pl = presetPutLong ?? nearest - gap * 2;
    const hasWings = strategyMode !== 'short-strangle';

    setParams(nextParams);
    setCallShort(cs);
    setCallLong(cl);
    setCallCredit(presetCallCredit ?? estimateSpreadCredit('call', cs, cl, nextParams, hasWings));
    setPutShort(ps);
    setPutLong(pl);
    setPutCredit(presetPutCredit ?? estimateSpreadCredit('put', ps, pl, nextParams, hasWings));
  };

  const handleChangeParams = (newP: Partial<UnderlyingParams>) => {
    setParams((prev) => {
      const merged = { ...prev, ...newP };
      if (newP.spotPrice !== undefined) {
        if (newP.spotPrice <= 0) {
          setCallShort(0);
          setCallLong(0);
          setCallCredit(0);
          setPutShort(0);
          setPutLong(0);
          setPutCredit(0);
        } else if (prev.spotPrice <= 0 || callShort <= 0 || putShort <= 0) {
          const gap = merged.strikeGap > 0 ? merged.strikeGap : merged.spotPrice > 300 ? 5 : 2.5;
          const nearest = Math.round(merged.spotPrice / gap) * gap;
          const cs = nearest + gap;
          const cl = nearest + gap * 2;
          const ps = nearest - gap;
          const pl = nearest - gap * 2;
          const hasWings = strategyMode !== 'short-strangle';
          setCallShort(cs);
          setCallLong(cl);
          setCallCredit(estimateSpreadCredit('call', cs, cl, merged, hasWings));
          setPutShort(ps);
          setPutLong(pl);
          setPutCredit(estimateSpreadCredit('put', ps, pl, merged, hasWings));
        }
      }
      return merged;
    });
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
                  onChangeParams={handleChangeParams}
                  onLoadPreset={handleLoadTickerPreset}
                  onClearAll={handleResetDefaults}
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
                  const cl = s + params.strikeGap;
                  setCallShort(s);
                  setCallLong(cl);
                  setCallCredit(estimateSpreadCredit('call', s, cl, params, strategyMode !== 'short-strangle'));
                }}
                onSelectPutShort={(s) => {
                  const pl = s - params.strikeGap;
                  setPutShort(s);
                  setPutLong(pl);
                  setPutCredit(estimateSpreadCredit('put', s, pl, params, strategyMode !== 'short-strangle'));
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
          if (ticker === 'AAPL' && price === 698) {
            handleLoadTickerPreset('AAPL', 698, 0.174, 10, 705, 710, 0.45, 690, 685, 0.32);
          } else {
            handleLoadTickerPreset(ticker, price, iv, 10);
          }
        }}
        onSelectMode={(m) => {
          setStrategyMode(m);
          if (m === 'iron-butterfly') {
            const atm = Math.round(params.spotPrice / params.strikeGap) * params.strikeGap;
            setCallShort(atm);
            setCallLong(atm + params.strikeGap * 2);
            setPutShort(atm);
            setPutLong(atm - params.strikeGap * 2);
          }
        }}
        onShareSetup={handleShareSetup}
        onToggleSkew={() =>
          setParams((prev) => ({
            ...prev,
            skewSlope: (prev.skewSlope || 0) > 0 ? 0 : 0.15
          }))
        }
        onToggleTheme={handleToggleTheme}
        onOpenLogModal={() => setIsLogModalOpen(true)}
        theme={theme}
      />
    </div>
  );
};
export default App;

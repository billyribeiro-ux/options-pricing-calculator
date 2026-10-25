# OptionsQuant 🚀
### Institutional-Grade Options Pricing, Volatility Surface & Trader Journaling Platform

**OptionsQuant** is a modern, high-performance cross-platform application (Web & macOS Desktop) built to supersede traditional options calculation spreadsheets (such as `Option Pricing.xlsx`) with mathematically exact quantitative finance models, Google Material Design 3 (Material You) in pure CSS (zero Tailwind), GPU-accelerated 3D visualizations, and an institutional-grade **Trader Journal & Behavioral Analytics Platform**.

---

## 🌟 Key Features

### 1. Hard-Evidence Quantitative Engineering (Fixing Spreadsheet Flaws)
* **Exact Continuous Expectation Integrals**: Replaces the spreadsheet's binary "all-or-nothing" loss assumption (which assumes 100% loss at the short strike) with the exact continuous integral over the partial loss zone $[K_{\text{short}}, K_{\text{long}}]$ and max loss zone beyond $K_{\text{long}}$.
* **Joint Iron Condor Modeling**: Evaluates the Iron Condor as a unified payoff structure where the total credit collected ($\text{Call Credit} + \text{Put Credit}$) permanently reduces max risk on whichever wing is breached.
* **True Max Risk**: Corrects the spreadsheet's omission of net credit from the loss calculation ($\text{True Max Loss} = \text{Spread Width} - \text{Total Credit}$).
* **Complete Greeks Engine**: Real-time analytical computation of Delta ($\Delta$), Gamma ($\Gamma$), Theta ($\Theta$), Vega ($\mathcal{V}$), Rho ($\rho$), Vanna, and Volga across individual legs and multi-leg strategies.
* **Volatility Bands**: Computes $1\sigma$, $2\sigma$ lognormal price boundaries and Market Maker Move derived from the at-the-money straddle ($\text{Straddle} \times 0.85$).

### 2. Comprehensive Trader Journal & Behavioral Analytics
* **1-Click Calculator Bridge**: Directly log any trade configured in the Options Calculator with a single click (`[⚡ Log Strategy]`). Captures strikes, credits, entry spot, ATM IV, DTE, Greeks, and exact model EV at execution.
* **Psychological & Discipline Tracker**: Pre-trade & post-trade mindset tags (`Disciplined`, `Patient`, `FOMO`, `Revenge Trade`), confidence sliders ($1$ to $10$), and a trading plan rules adherence checklist generating an automated **Discipline Score**.
* **Calendar Heatmap**: GitHub-style interactive annual and monthly P&L heatmaps with green/red intensity and day-by-day trade inspection.
* **Institutional Performance KPIs**: Cumulative Net P&L, Win Rate %, Profit Factor, Mathematical Expectancy, Sharpe Ratio, Sortino Ratio, and Max Drawdown depth & recovery.
* **Multi-Broker CSV Import & Export Studio**: Ingest trade logs from ThinkorSwim / Charles Schwab, Tastytrade, Interactive Brokers (IBKR), Robinhood, or export encrypted JSON backups.

### 3. GPU-Accelerated 3D & 2D Interactive Graphics (Three.js)
* **3D Portfolio Equity & Drawdown Mountain**: Mountainous terrain visualizing equity peaks and drawdown valleys over time with interactive orbit controls.
* **3D Trade Clustering Topology**: Interactive 3D scatter spheres mapping DTE ($X$) vs. Return on Risk ($Y$) vs. Implied Volatility ($Z$) with node inspection.
* **3D P&L Payoff Landscape**: 3D interactive surface mapping Underlying Price ($X$) vs. Days Elapsed ($Y$) vs. Strategy P&L ($Z$).
* **3D Volatility Skew Surface**: Interactive Strike vs. Expiration vs. Implied Volatility surface modeling equity volatility smirk.
* **2D Payoff & Probability Density Curves**: Real-time canvas overlaying Black-Scholes curve today ($T=0$), expiration payoff, and normal probability density $\phi(S)$.
* **Monte Carlo Simulation**: 10,000-path Geometric Brownian Motion simulation with empirical win rate, Value at Risk (VaR 95%, VaR 99%), and Expected Shortfall (CVaR).

### 4. UI / UX Design: Google Material Design 3 (No Tailwind)
* **Pure CSS Design Tokens**: Strict implementation of Google Material Design 3 (Material You) using CSS Custom Properties (`--md-sys-color-*`, `--md-sys-elevation-*`, `--md-sys-shape-*`). Zero Tailwind dependencies.
* **Google MD3 Window Size Class Responsiveness**: Full adaptive responsiveness across all 5 official MD3 breakpoints:
  * **Compact** (`< 600px`): Automatically shifts navigation rail to an adaptive bottom navigation bar, single-column fluid cards, mobile top app bar.
  * **Medium** (`600px - 839px`): Compact 72px navigation rail, 2-column KPI grid.
  * **Expanded** (`840px - 1199px`): 80px navigation rail, 2-column split views.
  * **Large** (`1200px - 1599px`): 5-column KPI grid, desktop multi-pane layout.
  * **Extra Large** (`>= 1600px`): Max-width institutional cockpit layout.
* **macOS Window Vibrancy**: Native glassmorphism backdrop blur on macOS with dark/light dynamic theme switching.
* **macOS Command Palette (`Cmd+K`)**: Instant keyboard navigation, ticker switching, strategy solvers, and journal logging.

---

## 🛠️ Tech Stack (As of Oct 25, 2026)

* **Frontend**: React `19.3.1`, TypeScript `7.0.2`, Vite `8.3.5` (Rolldown Rust bundler)
* **Styling**: Google Material Design 3 in pure CSS (Custom Properties, zero Tailwind)
* **3D Graphics**: Three.js `0.186.1` (WebGL with orbit controls & custom shaders)
* **Desktop Shell**: Tauri v2 (`2.0.0` / `@tauri-apps/api 2.12.4` with window vibrancy)
* **Spreadsheet Engine**: SheetJS `0.20.3` (OpenXML XLSX parsing)

---

## 🚀 Getting Started

### Development Server (Web)
```bash
# Install dependencies
pnpm install

# Start local dev server (http://localhost:5173)
pnpm dev
```

### Run Automated Quantitative Tests
```bash
# Verify calculations against Option Pricing.xlsx
pnpm test
```

### Production Web Build
```bash
pnpm build
```

### Run Native macOS Desktop App
```bash
# Launch Tauri v2 native macOS window
pnpm tauri dev

# Build native macOS DMG / App bundle
pnpm tauri build
```

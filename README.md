# OptionsQuant 🚀
### Institutional-Grade Options Pricing, Volatility Surface & Iron Condor Analytics Platform

**OptionsQuant** is a modern, high-performance cross-platform application (Web & macOS Desktop) built to supersede traditional options calculation spreadsheets (such as `Option Pricing.xlsx`) with mathematically exact quantitative finance models, Google Material Design 3 (Material You) in pure CSS (zero Tailwind), and GPU-accelerated 3D visualizations.

---

## 🌟 Key Features

### 1. Hard-Evidence Quantitative Engineering (Fixing Spreadsheet Flaws)
* **Exact Continuous Expectation Integrals**: Replaces the spreadsheet's binary "all-or-nothing" loss assumption (which assumes 100% loss at the short strike) with the exact continuous integral over the partial loss zone $[K_{\text{short}}, K_{\text{long}}]$ and max loss zone beyond $K_{\text{long}}$.
* **Joint Iron Condor Modeling**: Evaluates the Iron Condor as a unified payoff structure where the total credit collected ($\text{Call Credit} + \text{Put Credit}$) permanently reduces max risk on whichever wing is breached.
* **True Max Risk**: Corrects the spreadsheet's omission of net credit from the loss calculation ($\text{True Max Loss} = \text{Spread Width} - \text{Total Credit}$).
* **Complete Greeks Engine**: Real-time analytical computation of Delta ($\Delta$), Gamma ($\Gamma$), Theta ($\Theta$), Vega ($\mathcal{V}$), Rho ($\rho$), Vanna, and Volga across individual legs and multi-leg strategies.
* **Volatility Bands**: Computes $1\sigma$, $2\sigma$ lognormal price boundaries and Market Maker Move derived from the at-the-money straddle ($\text{Straddle} \times 0.85$).

### 2. UI / UX Design: Google Material Design 3 (No Tailwind)
* **Pure CSS Design Tokens**: Strict implementation of Google Material Design 3 (Material You) using CSS Custom Properties (`--md-sys-color-*`, `--md-sys-elevation-*`, `--md-sys-shape-*`).
* **Zero Tailwind Dependencies**: 100% custom, semantic CSS architecture.
* **macOS Window Vibrancy**: Native glassmorphism backdrop blur on macOS with dark/light dynamic theme switching.
* **macOS Command Palette (`Cmd+K`)**: Instant keyboard navigation, ticker switching, and strategy solvers.

### 3. GPU-Accelerated 3D & 2D Interactive Graphics
* **3D P&L Payoff Landscape (Time-Decay Waterfall)**: 3D interactive surface mapping Underlying Price ($X$) vs. Days Elapsed ($Y$) vs. Strategy P&L ($Z$) with green profit peaks and red loss valleys.
* **3D Volatility Skew Surface**: Interactive Strike vs. Expiration vs. Implied Volatility surface modeling equity volatility smirk.
* **2D Payoff & Probability Density Curves**: Real-time canvas overlaying Black-Scholes curve today ($T=0$), expiration payoff, and normal probability density $\phi(S)$.
* **Monte Carlo Simulation**: 10,000-path Geometric Brownian Motion simulation with empirical win rate, Value at Risk (VaR 95%, VaR 99%), and Expected Shortfall (CVaR).

### 4. Excel Bi-Directional Bridge
* **Drag-and-Drop XLSX Import**: Drag any options spreadsheet (including `Option Pricing.xlsx`) directly onto the app to auto-populate parameters.
* **Side-by-Side Audit Modal**: Clear tabular breakdown explaining why the spreadsheet's numbers diverge from exact mathematical reality.

---

## 🛠️ Tech Stack

* **Frontend**: React 19, TypeScript, Vite
* **Styling**: Google Material Design 3 in pure CSS (Custom Properties, zero Tailwind)
* **3D Graphics**: Three.js (WebGL with orbit controls & custom shaders)
* **Desktop Shell**: Tauri v2 (Rust + native macOS WebKit with window vibrancy)
* **Spreadsheet Engine**: SheetJS (OpenXML XLSX parsing)

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

---

## 📊 Comparison with Legacy Excel Spreadsheet

| Feature / Metric | Legacy `Option Pricing.xlsx` | OptionsQuant Platform |
| :--- | :--- | :--- |
| **Loss Calculation** | Binary (100% loss at short strike) | Continuous exact expectation integral |
| **Call Spread EV (AAPL 705/710)** | -$1,536.49 (overstated loss) | Exact continuous mathematical EV |
| **Put Spread EV (AAPL 690/685)** | -$1,512.66 (overstated loss) | Exact continuous mathematical EV |
| **Iron Condor Payoff** | Isolated sum of two separate spreadsheets | Unified joint payoff & margin calculation |
| **Max Risk** | Spread Width $\times 100$ ($5,000) | (Spread Width - Net Credit) $\times 100$ ($4,230) |
| **Visualizations** | None (static numbers in cells) | Interactive 2D Payoff, 3D Time-Decay Surface, 3D Volatility Skew |
| **Risk Simulation** | None | 10,000-path Monte Carlo (VaR 95%, CVaR 95%) |
| **Desktop Platform** | Requires Microsoft Excel | Standalone native macOS app + Web PWA |

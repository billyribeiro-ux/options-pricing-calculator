# OptionsQuant — Tech Stack & Version Manifest

This document outlines the complete technology stack, runtimes, package versions, and architectural decisions used in **OptionsQuant**. All packages are on the cutting-edge latest versions as of **October 25, 2026**.

---

## 1. System Environment & Runtimes

| Component | Version | Environment / Path | Purpose |
| :--- | :--- | :--- | :--- |
| **Operating System** | macOS (Darwin aarch64) | Apple Silicon (ARM64) | Host desktop platform |
| **Node.js** | `v24.22.0` | Managed via `mise` | JavaScript/TypeScript runtime & test runner |
| **pnpm** | `12.14.0` | Global package manager | Fast, content-addressable dependency management |
| **Bun** | `1.4.3` | Alternative runtime | Optional ultra-fast bundler / script execution |
| **Rust / Cargo** | `1.99.1` (`5f94df478`) | `~/.cargo/bin/cargo` | Native compilation for Tauri v2 macOS shell |
| **Cargo Tauri CLI**| `2.12.3` | Global cargo binary | Desktop app packaging & window vibrancy control |

---

## 2. Core Frontend & Application Framework

| Package / Library | Resolved Version | Scope | Role & Description |
| :--- | :--- | :--- | :--- |
| **React** | `19.3.1` | `dependencies` | UI component tree with Concurrent Mode & modern primitives |
| **React DOM** | `19.3.1` | `dependencies` | DOM rendering layer |
| **TypeScript** | `7.0.2` | `devDependencies`| Strict typing for financial contracts, matrices, and Greeks |
| **Vite** | `8.3.5` | `devDependencies`| Next-gen Rolldown Rust-based bundler and HMR dev server (158ms builds!) |
| **@vitejs/plugin-react** | `6.1.2` | `devDependencies`| React 19 Fast Refresh integration |
| **Lucide React** | `1.61.0` | `dependencies` | Clean vector iconography aligned with Material Design 3 |

---

## 3. 3D Graphics & Data Visualization

| Technology | Resolved Version | Role in Architecture |
| :--- | :--- | :--- |
| **Three.js** | `0.186.1` | GPU-accelerated WebGL rendering for 3D surfaces & trade topology |
| **@types/three** | `0.186.0` | TypeScript type declarations for Three.js geometry, shaders, and lighting |
| **3D Equity Mountain** | Custom Three.js | Mountainous terrain mesh visualizing cumulative equity peaks and drawdown valleys |
| **3D Trade Clusters** | Custom Three.js | 3D scatter topology mapping DTE ($X$) vs. Return on Risk ($Y$) vs. Implied Volatility ($Z$) |
| **3D P&L Payoff** | Custom Three.js | Time-Decay Waterfall surface mapping Price vs. Time vs. Strategy P&L |
| **3D Volatility Skew**| Custom Three.js | Strike vs. Expiration vs. Implied Volatility surface modeling equity smirk |
| **HTML5 Canvas 2D** | Native Web API | Sub-millisecond 2D payoff curves, normal probability density overlays, and crosshair hover |
| **Canvas Monte Carlo** | Custom WebGL/Canvas | Visual rendering of 25 sample geometric Brownian motion trajectories & P&L histograms |

---

## 4. Design System & Styling (Google Material Design 3)

> **Zero Tailwind CSS**: The styling is 100% custom, token-driven, and semantic. No CSS utility bloat or third-party CSS preprocessor dependencies.

### Google MD3 Window Size Class Responsive Breakpoints
* **Compact (`< 600px`)**: Shifts navigation rail to an adaptive bottom navigation bar, single-column fluid cards, mobile top app bar.
* **Medium (`600px - 839.98px`)**: Compact 72px navigation rail, 2-column KPI grid.
* **Expanded (`840px - 1199.98px`)**: 80px navigation rail, 2-column split views.
* **Large (`1200px - 1599.98px`)**: 5-column KPI grid, desktop multi-pane layout.
* **Extra Large (`>= 1600px`)**: Max-width institutional cockpit layout.

| Module | Source File | Description |
| :--- | :--- | :--- |
| **Tokens & Colors** | [`src/styles/tokens.css`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/styles/tokens.css) | Google MD3 tokens: `--md-sys-color-*`, `--md-sys-elevation-*`, `--md-sys-shape-*` |
| **Theme Engine** | [`src/styles/theme.css`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/styles/theme.css) | Dynamic Dark & Light mode switching + macOS glassmorphism (`backdrop-filter: blur(28px)`) |
| **Typography Scale**| [`src/styles/typography.css`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/styles/typography.css) | Google MD3 type scale: Display, Headline, Title, Body, Label, and tabular `mono-*` |
| **Layout & Shell** | [`src/styles/layout.css`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/styles/layout.css) | MD3 Window Size Classes, macOS titlebar drag regions, navigation rail & bottom bar |
| **UI Components** | [`src/styles/components.css`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/styles/components.css) | Elevated/tonal cards, segmented buttons, input fields, strike matrix table, dialogs |

---

## 5. Desktop Application Shell (Tauri v2 macOS)

| Dependency | Version | Target | Role & Capabilities |
| :--- | :--- | :--- | :--- |
| **@tauri-apps/api** | `2.12.4` | Frontend (`dependencies`) | Inter-Process Communication (IPC) between web view and native macOS |
| **Tauri (Rust)** | `2.0.0` | Rust (`src-tauri/Cargo.toml`) | Native macOS WebKit shell with `macos-private-api` |
| **Tauri Build** | `2.0.0` | Rust (`build-dependencies`) | Desktop bundle generator (`.app`, `.dmg`) |
| **Serde / Serde JSON** | `1.0` | Rust (`src-tauri/Cargo.toml`) | High-speed Rust JSON serialization |
| **Window Vibrancy** | macOS Cocoa API | Native Window | Transparent acrylic backdrop blur with native traffic light buttons |

---

## 6. Financial Engineering & Data Processing

| Engine / Library | Version | File Location | Purpose & Methodology |
| :--- | :--- | :--- | :--- |
| **SheetJS (`xlsx`)** | `0.20.3` | `dependencies` | Direct in-memory parsing of Excel spreadsheets (`Option Pricing.xlsx`) |
| **Distributions Core**| Custom Pure TS | [`src/quant/distributions.ts`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/quant/distributions.ts) | High-precision Normal CDF (`Phi`), PDF (`phi`), and Beasley-Springer-Moro inverse CDF |
| **Black-Scholes-Merton**| Custom Pure TS | [`src/quant/blackScholes.ts`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/quant/blackScholes.ts) | European analytical pricing, intrinsic/extrinsic value, and Brent's method IV solver |
| **Exact Continuous EV**| Custom Pure TS | [`src/quant/expectations.ts`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/quant/expectations.ts) | Replaces spreadsheet's binary loss assumption with continuous risk-neutral integrals |
| **Iron Condor Model**| Custom Pure TS | [`src/quant/ironCondor.ts`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/quant/ironCondor.ts) | Unified joint Iron Condor payoff, true margin, and mutual exclusivity risk modeling |
| **Greeks Engine** | Custom Pure TS | [`src/quant/greeks.ts`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/quant/greeks.ts) | Position Delta ($\Delta$), Gamma ($\Gamma$), Theta ($\Theta$), Vega ($\mathcal{V}$), Rho ($\rho$) |
| **Monte Carlo Engine**| Custom Pure TS | [`src/quant/monteCarlo.ts`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/quant/monteCarlo.ts) | 10,000-path Geometric Brownian Motion simulation, VaR 95/99%, CVaR 95% |
| **Trader Journal Engine**| Custom Pure TS | [`src/journal/`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/journal/) | Local-first trade storage, 1-click calculator bridge, calendar heatmap, and psychology audit |

---

## 7. Command Reference

| Action | Command | Description |
| :--- | :--- | :--- |
| **Start Dev Server** | `pnpm dev` | Starts local web app at `http://localhost:5173` |
| **Run Unit Tests** | `pnpm test` | Runs quantitative verification tests against `Option Pricing.xlsx` |
| **Build Web App** | `pnpm build` | Compiles TypeScript and builds optimized production assets in `/dist` |
| **Launch Desktop App**| `pnpm tauri dev` | Runs live native macOS application with window vibrancy |
| **Package macOS App** | `pnpm tauri build` | Creates release `.app` and `.dmg` installer packages |

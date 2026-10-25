# OptionsQuant — Tech Stack & Version Manifest

This document outlines the complete technology stack, runtimes, package versions, and architectural decisions used in **OptionsQuant**.

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
| **TypeScript** | `5.9.3` | `devDependencies`| Strict typing for financial contracts, matrices, and Greeks |
| **Vite** | `6.4.5` | `devDependencies`| Lightning-fast HMR dev server and ESBuild/Rollup production bundler |
| **@vitejs/plugin-react** | `4.7.0` | `devDependencies`| Fast Refresh (Babel/SWC) for React components |
| **Lucide React** | `0.475.0` | `dependencies` | Clean vector iconography aligned with Material Design 3 |

---

## 3. 3D Graphics & Data Visualization

| Technology | Resolved Version | Role in Architecture |
| :--- | :--- | :--- |
| **Three.js** | `0.174.0` | GPU-accelerated WebGL rendering for 3D P&L Payoff Surface & 3D Volatility Skew |
| **@types/three** | `0.174.0` | TypeScript type declarations for Three.js geometry, shaders, and lighting |
| **HTML5 Canvas 2D** | Native Web API | Sub-millisecond 2D payoff curves, normal probability density overlays, and crosshair hover |
| **Canvas Monte Carlo** | Custom WebGL/Canvas | Visual rendering of 25 sample geometric Brownian motion trajectories & P&L histograms |

---

## 4. Design System & Styling (Google Material Design 3)

> **Zero Tailwind CSS**: The styling is 100% custom, token-driven, and semantic. No CSS utility bloat or third-party CSS preprocessor dependencies.

| Module | Source File | Description |
| :--- | :--- | :--- |
| **Tokens & Colors** | [`src/styles/tokens.css`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/styles/tokens.css) | Google MD3 tokens: `--md-sys-color-*`, `--md-sys-elevation-*`, `--md-sys-shape-*` |
| **Theme Engine** | [`src/styles/theme.css`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/styles/theme.css) | Dynamic Dark & Light mode switching + macOS glassmorphism (`backdrop-filter: blur(28px)`) |
| **Typography Scale**| [`src/styles/typography.css`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/styles/typography.css) | Google MD3 type scale: Display, Headline, Title, Body, Label, and tabular `mono-*` |
| **Layout & Shell** | [`src/styles/layout.css`](file:///Users/billyribeiro/dev/options-pricing-calculator/src/styles/layout.css) | macOS titlebar drag regions, navigation rail, and responsive dashboard grid |
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

---

## 7. Build Output & Bundle Analysis

* **Total Production Build Time**: `~1.3 seconds`
* **Bundle Optimization**: Manual code-splitting implemented in [`vite.config.ts`](file:///Users/billyribeiro/dev/options-pricing-calculator/vite.config.ts)

```
dist/index.html                   1.15 kB │ gzip:   0.57 kB
dist/assets/index-CjIg9ORm.css   18.53 kB │ gzip:   3.39 kB
dist/assets/vendor-BhVDo5vu.js   28.37 kB │ gzip:   8.08 kB
dist/assets/index-r4h4Zlci.js   272.57 kB │ gzip:  81.85 kB
dist/assets/xlsx-BsABTNv4.js    356.35 kB │ gzip: 119.92 kB
dist/assets/three-DUkobP1-.js   469.79 kB │ gzip: 117.13 kB
```

---

## 8. Command Reference

| Action | Command | Description |
| :--- | :--- | :--- |
| **Start Dev Server** | `pnpm dev` | Starts local web app at `http://localhost:5173` |
| **Run Unit Tests** | `pnpm test` | Runs quantitative verification tests against `Option Pricing.xlsx` |
| **Build Web App** | `pnpm build` | Compiles TypeScript and builds optimized production assets in `/dist` |
| **Launch Desktop App**| `pnpm tauri dev` | Runs live native macOS application with window vibrancy |
| **Package macOS App** | `pnpm tauri build` | Creates release `.app` and `.dmg` installer packages |

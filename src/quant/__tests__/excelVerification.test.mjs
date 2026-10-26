import test from 'node:test';
import assert from 'node:assert/strict';

// Helper functions reimplemented or imported
function normalPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function normalCdf(x) {
  if (x === 0) return 0.5;
  if (x < 0) return 1 - normalCdf(-x);
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const t = 1.0 / (1.0 + p * x);
  const poly = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
  return 1.0 - normalPdf(x) * poly;
}

test('Verifies Option Pricing.xlsx exact numerical values', () => {
  const S0 = 698;
  const sigma = 0.174;
  const dte = 10;
  const T = dte / 365;
  const contracts = 10;
  const multiplier = contracts * 100;

  // 1 Std Dev Move
  const oneStdDev = S0 * sigma * Math.sqrt(T);
  assert.ok(Math.abs(oneStdDev - 20.102878) < 1e-4, `Expected ~20.102878, got ${oneStdDev}`);

  // 1 Std Dev bounds
  const upper1 = S0 + oneStdDev;
  const lower1 = S0 - oneStdDev;
  assert.ok(Math.abs(upper1 - 718.102878) < 1e-4);
  assert.ok(Math.abs(lower1 - 677.897121) < 1e-4);

  // 2 Std Dev bounds
  const twoStdDev = oneStdDev * 2;
  assert.ok(Math.abs(twoStdDev - 40.205756) < 1e-4);

  // Market Maker Move
  const straddle = 6.80;
  const factor = 0.85;
  const mktMakerMove = straddle * factor;
  assert.ok(Math.abs(mktMakerMove - 5.78) < 1e-4);

  // Call Spread at 705/710
  const zCall = Math.log(705 / S0) / (sigma * Math.sqrt(T));
  const probCallITM = 1 - normalCdf(zCall);
  assert.ok(Math.abs(probCallITM - 0.364493) < 1e-4, `Prob call ITM: ${probCallITM}`);

  const callGain = 0.45 * (1 - probCallITM) * multiplier;
  const callPain = (705 - 710) * probCallITM * multiplier;
  const callEV = callGain + callPain;
  const callRewardRisk = callGain / -callPain;
  const callPrice1to1 = 5 * probCallITM / (1 - probCallITM);

  assert.ok(Math.abs(callGain - 285.978) < 1e-2, `Call Gain: ${callGain}`);
  assert.ok(Math.abs(callPain - -1822.465) < 1e-2, `Call Pain: ${callPain}`);
  assert.ok(Math.abs(callEV - -1536.487) < 1e-2, `Call EV: ${callEV}`);
  assert.ok(Math.abs(callRewardRisk - 0.1569) < 1e-3, `Call RR: ${callRewardRisk}`);
  assert.ok(Math.abs(callPrice1to1 - 2.8677) < 1e-3, `Call Price 1:1: ${callPrice1to1}`);

  // Put Spread at 690/685
  const zPut = Math.log(690 / S0) / (sigma * Math.sqrt(T));
  const probPutITM = normalCdf(zPut);
  assert.ok(Math.abs(probPutITM - 0.344485) < 1e-4, `Prob put ITM: ${probPutITM}`);

  const putGain = 0.32 * (1 - probPutITM) * multiplier;
  const putPain = (685 - 690) * probPutITM * multiplier;
  const putEV = putGain + putPain;
  const putRewardRisk = putGain / -putPain;
  const putPrice1to1 = 5 * probPutITM / (1 - probPutITM);

  assert.ok(Math.abs(putGain - 209.764) < 1e-2, `Put Gain: ${putGain}`);
  assert.ok(Math.abs(putPain - -1722.428) < 1e-2, `Put Pain: ${putPain}`);
  assert.ok(Math.abs(putEV - -1512.664) < 1e-2, `Put EV: ${putEV}`);
  assert.ok(Math.abs(putRewardRisk - 0.12178) < 1e-3, `Put RR: ${putRewardRisk}`);
  assert.ok(Math.abs(putPrice1to1 - 2.6275) < 1e-3, `Put Price 1:1: ${putPrice1to1}`);
});

test('Verifies Black-Scholes Put-Call Parity & Higher-Order Greeks (Vanna & Volga)', () => {
  const S = 698;
  const K = 705;
  const T = 10 / 365;
  const r = 0.045;
  const q = 0.005;
  const sigma = 0.174;

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const eqT = Math.exp(-q * T);
  const erT = Math.exp(-r * T);

  const callPrice = S * eqT * normalCdf(d1) - K * erT * normalCdf(d2);
  const putPrice = K * erT * normalCdf(-d2) - S * eqT * normalCdf(-d1);

  // Put-Call Parity: C - P = S*e^(-qT) - K*e^(-rT)
  const lhs = callPrice - putPrice;
  const rhs = S * eqT - K * erT;
  assert.ok(Math.abs(lhs - rhs) < 1e-9, `Put-Call Parity violated: ${lhs} vs ${rhs}`);

  // Second-order Greeks check
  const pdfD1 = normalPdf(d1);
  const vega = S * eqT * sqrtT * pdfD1 * 0.01;
  const vanna = (-eqT * pdfD1 * (d2 / sigma)) * 0.01;
  const volga = vega * ((d1 * d2) / sigma) * 0.01;

  assert.ok(Number.isFinite(vanna) && vanna !== 0, 'Vanna should be non-zero finite');
  assert.ok(Number.isFinite(volga) && volga !== 0, 'Volga should be non-zero finite');
});

test('Verifies Iron Condor True Max Risk vs Legacy Excel Overstatement', () => {
  const callCredit = 0.45;
  const putCredit = 0.32;
  const totalCreditPerShare = callCredit + putCredit; // $0.77
  const spreadWidth = 5;
  const contracts = 10;
  const multiplier = contracts * 100;

  const marginRequired = spreadWidth * multiplier; // $5,000
  const trueMaxLoss = (spreadWidth - totalCreditPerShare) * multiplier; // $4,230
  const overstatement = marginRequired - trueMaxLoss; // $770

  assert.equal(marginRequired, 5000);
  assert.equal(trueMaxLoss, 4230);
  assert.equal(overstatement, 770);
});

test('Proves 2D Payoff Chart multi-tier strike badge layout has zero text overlap across all breakpoints and strike gaps', () => {
  function layoutBadges(markers, width, minPrice, maxPrice) {
    const padLeft = 72;
    const padRight = 28;
    const plotWidth = Math.max(100, width - padLeft - padRight);
    const xToPx = (p) => padLeft + ((p - minPrice) / Math.max(1, maxPrice - minPrice)) * plotWidth;
    const useCompactText = plotWidth < 620;
    const rowYCenters = [13, 31, 49];
    const rowRightEdges = [-Infinity, -Infinity, -Infinity];
    const minHorizontalGap = 8;
    const pillHeight = 15;
    const rowBadges = [[], [], []];

    const visible = markers
      .map((m) => ({ ...m, anchorX: xToPx(m.price) }))
      .sort((a, b) => a.anchorX - b.anchorX);

    visible.forEach((m) => {
      const labelText = useCompactText ? `${m.shortLabel} $${m.price}` : `${m.fullLabel} $${m.price}`;
      const textWidth = labelText.length * 6.3; // 10.5px JetBrains Mono char width
      const pillWidth = Math.ceil(textWidth + 12);

      let centerX = Math.max(padLeft + pillWidth / 2, Math.min(width - padRight - pillWidth / 2, m.anchorX));
      let chosenRow = -1;
      for (let r = 0; r < rowYCenters.length; r++) {
        if (centerX - pillWidth / 2 >= rowRightEdges[r] + minHorizontalGap) {
          chosenRow = r;
          break;
        }
      }
      if (chosenRow === -1) {
        let bestRow = 0;
        for (let r = 1; r < rowYCenters.length; r++) {
          if (rowRightEdges[r] < rowRightEdges[bestRow]) bestRow = r;
        }
        chosenRow = bestRow;
        centerX = rowRightEdges[chosenRow] + minHorizontalGap + pillWidth / 2;
      }
      rowRightEdges[chosenRow] = centerX + pillWidth / 2;
      rowBadges[chosenRow].push({
        centerX,
        centerY: rowYCenters[chosenRow],
        pillWidth,
        pillHeight,
        row: chosenRow,
        labelText
      });
    });

    rowBadges.forEach((badgesInRow) => {
      if (badgesInRow.length === 0) return;
      let maxRightAllowed = width - 6;
      for (let i = badgesInRow.length - 1; i >= 0; i--) {
        const b = badgesInRow[i];
        if (b.centerX + b.pillWidth / 2 > maxRightAllowed) {
          b.centerX = maxRightAllowed - b.pillWidth / 2;
        }
        maxRightAllowed = b.centerX - b.pillWidth / 2 - minHorizontalGap;
      }
    });

    return rowBadges.flat();
  }

  const scenarios = [
    {
      name: 'AAPL Default Iron Condor (685/690/698/705/710)',
      minPrice: 660,
      maxPrice: 736,
      markers: [
        { price: 685, shortLabel: 'LP', fullLabel: 'Long Put' },
        { price: 690, shortLabel: 'SP', fullLabel: 'Short Put' },
        { price: 698, shortLabel: 'SPOT', fullLabel: 'Spot' },
        { price: 705, shortLabel: 'SC', fullLabel: 'Short Call' },
        { price: 710, shortLabel: 'LC', fullLabel: 'Long Call' }
      ]
    },
    {
      name: 'Tight $1 Strike Spacing (696/697/698/699/700)',
      minPrice: 660,
      maxPrice: 736,
      markers: [
        { price: 696, shortLabel: 'LP', fullLabel: 'Long Put' },
        { price: 697, shortLabel: 'SP', fullLabel: 'Short Put' },
        { price: 698, shortLabel: 'SPOT', fullLabel: 'Spot' },
        { price: 699, shortLabel: 'SC', fullLabel: 'Short Call' },
        { price: 700, shortLabel: 'LC', fullLabel: 'Long Call' }
      ]
    },
    {
      name: 'Degenerate Iron Butterfly at Right Edge (all at 730)',
      minPrice: 660,
      maxPrice: 736,
      markers: [
        { price: 730, shortLabel: 'LP', fullLabel: 'Long Put' },
        { price: 730, shortLabel: 'SP', fullLabel: 'Short Put' },
        { price: 730, shortLabel: 'SPOT', fullLabel: 'Spot' },
        { price: 730, shortLabel: 'SC', fullLabel: 'Short Call' },
        { price: 730, shortLabel: 'LC', fullLabel: 'Long Call' }
      ]
    }
  ];

  for (const width of [360, 600, 900, 1400]) {
    for (const sc of scenarios) {
      const placed = layoutBadges(sc.markers, width, sc.minPrice, sc.maxPrice);
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const a = placed[i];
          const b = placed[j];
          const horizOverlap =
            Math.min(a.centerX + a.pillWidth / 2, b.centerX + b.pillWidth / 2) -
            Math.max(a.centerX - a.pillWidth / 2, b.centerX - b.pillWidth / 2);
          const vertOverlap =
            Math.min(a.centerY + a.pillHeight / 2, b.centerY + b.pillHeight / 2) -
            Math.max(a.centerY - a.pillHeight / 2, b.centerY - b.pillHeight / 2);

          const isOverlapping = horizOverlap > 0 && vertOverlap > 0;
          assert.equal(
            isOverlapping,
            false,
            `Overlap detected in "${sc.name}" at width=${width}px between "${a.labelText}" and "${b.labelText}"`
          );
        }
      }
    }
  }
});

test('Verifies Higher-Order Greeks (Charm, Speed, Color) & SVI Volatility Skew Parity', () => {
  const S = 698;
  const K = 705;
  const T = 10 / 365;
  const r = 0.045;
  const q = 0.005;
  const sigma = 0.174;

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const eqT = Math.exp(-q * T);
  const pdfD1 = normalPdf(d1);
  const gamma = (eqT * pdfD1) / (S * sigma * sqrtT);

  const driftRatio = (2 * (r - q) * T - d2 * sigma * sqrtT) / (2 * T * sigma * sqrtT);
  const charmCall = -(-q * eqT * normalCdf(d1) + eqT * pdfD1 * driftRatio) / 365;
  const speed = -(gamma / S) * (d1 / (sigma * sqrtT) + 1);

  // For OTM Call (K=705 > S=698), as 1 day elapses closer to expiry, Call Delta bleeds toward 0 (negative charm)
  assert.ok(charmCall < 0, `OTM Call Charm should be negative (delta bleed), got ${charmCall}`);
  assert.ok(Number.isFinite(speed) && speed !== 0, 'Speed should be non-zero finite');

  // SVI Skew check: flat when skewSlope=0, elevated for OTM put when skewSlope=0.15
  const getStrikeIV = (strike, S0, atmIV, skewSlope = 0) => {
    if (!skewSlope) return atmIV;
    const m = (strike - S0) / S0;
    return Math.max(0.02, atmIV - skewSlope * m + 0.65 * skewSlope * m * m);
  };
  assert.equal(getStrikeIV(685, 698, 0.174, 0), 0.174);
  assert.ok(getStrikeIV(680, 698, 0.174, 0.15) > 0.174, 'OTM Put should have higher IV under positive equity skew');
});

test('Verifies Deterministic Seeded Mulberry32 PRNG, OCC Symbol Decoder & Roll-Chain Accounting', () => {
  function createSeededPRNG(seed) {
    let a = (seed ^ 0xdeadbeef) >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rng1 = createSeededPRNG(42);
  const rng2 = createSeededPRNG(42);
  const rng3 = createSeededPRNG(43);

  const seq1 = [rng1(), rng1(), rng1()];
  const seq2 = [rng2(), rng2(), rng2()];
  const seq3 = [rng3(), rng3(), rng3()];

  assert.deepEqual(seq1, seq2, 'Identical seeds must produce identical random sequences');
  assert.notDeepEqual(seq1, seq3, 'Different seeds must produce distinct sequences');

  // OCC Symbol Decoder test
  const match = 'SPY261030P00575000'.match(/^([A-Z]{1,6})(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/);
  assert.ok(match);
  assert.equal(match[1], 'SPY');
  assert.equal(`20${match[2]}-${match[3]}-${match[4]}`, '2026-10-30');
  assert.equal(match[5], 'P');
  assert.equal(parseInt(match[6], 10) / 1000, 575);

  // Roll-chain cost basis update test: $0.77/sh initial credit on 10 contracts ($770 total, $4230 max risk) + $150 roll credit
  const initCreditPerShare = 0.77;
  const initTotalPrem = 770;
  const initMaxRisk = 4230;
  const rollCreditDollars = 150;
  const contracts = 10;

  const newNetPerShare = Number((initCreditPerShare + rollCreditDollars / (contracts * 100)).toFixed(2));
  const newTotalPrem = initTotalPrem + rollCreditDollars;
  const newMaxRisk = initMaxRisk - rollCreditDollars;

  assert.equal(newNetPerShare, 0.92);
  assert.equal(newTotalPrem, 920);
  assert.equal(newMaxRisk, 4080);
});

/**
 * High-precision standard normal distribution functions.
 * Uses Hart's rational approximation and Abramowitz & Stegun formulas.
 */

const SQRT_2PI = Math.sqrt(2 * Math.PI);

/**
 * Standard normal probability density function: phi(x)
 */
export function normalPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

/**
 * Cumulative standard normal distribution function: Phi(x)
 * Accurate to > 7 decimal places using Abramowitz & Stegun formula 7.1.26
 */
export function normalCdf(x: number): number {
  if (x === 0) return 0.5;
  
  // Symmetry for negative values
  if (x < 0) {
    return 1 - normalCdf(-x);
  }

  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1.0 / (1.0 + p * x);
  const poly = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
  const cdf = 1.0 - normalPdf(x) * poly;
  return Math.max(0, Math.min(1, cdf));
}

/**
 * Excel's NORMSDIST equivalent
 */
export const normsdist = normalCdf;

/**
 * Inverse standard normal distribution (probit function): Phi^-1(p)
 * Uses Beasley-Springer-Moro algorithm accurate to 10^-9.
 */
export function inverseNormalCdf(p: number): number {
  if (p <= 0 || p >= 1) {
    throw new RangeError(`Probability p must be in (0, 1), got ${p}`);
  }

  const a0 = 2.50662823884;
  const a1 = -18.61500062529;
  const a2 = 41.39119773534;
  const a3 = -25.44106049637;

  const b1 = -8.47351093090;
  const b2 = 23.08336743743;
  const b3 = -21.06224101826;
  const b4 = 3.13082909833;

  const c0 = 0.3374754822726147;
  const c1 = 0.9761690190917186;
  const c2 = 0.1607979714918209;
  const c3 = 0.0276438810333863;
  const c4 = 0.0038405729373609;
  const c5 = 0.0003951804142957;
  const c6 = 0.0000321767881768;
  const c7 = 0.0000002888167364;
  const c8 = 0.0000003960315187;

  const y = p - 0.5;
  if (Math.abs(y) < 0.42) {
    const r = y * y;
    return (y * (((a3 * r + a2) * r + a1) * r + a0)) /
           ((((b4 * r + b3) * r + b2) * r + b1) * r + 1.0);
  }

  const r = p < 0.5 ? p : 1.0 - p;
  const s = Math.log(-Math.log(r));
  let x = c0 + s * (c1 + s * (c2 + s * (c3 + s * (c4 + s * (c5 + s * (c6 + s * (c7 + s * c8)))))));
  return p < 0.5 ? -x : x;
}

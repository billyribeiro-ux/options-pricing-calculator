/**
 * Formatting utilities for financial metrics
 */

export function formatCurrency(value: number, decimals = 2): string {
  const isNegative = value < 0;
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(abs);

  return isNegative ? `-${formatted}` : formatted;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatMultiplier(value: number, decimals = 2): string {
  if (!isFinite(value)) return '∞';
  return `${value.toFixed(decimals)}x`;
}

export function formatDelta(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

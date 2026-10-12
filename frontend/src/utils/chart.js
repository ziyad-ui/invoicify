import { formatCurrency } from "./format.js";

/**
 * Round the top of an axis up to a "nice" number and return evenly spaced ticks,
 * e.g. a max of 1,327,500 -> ticks 0, 500,000, 1,000,000, 1,500,000.
 */
export function niceScale(rawMax, targetTicks = 5) {
  const max = Math.max(Number(rawMax) || 0, 0);
  if (max === 0) return { max: 1000, step: 250, ticks: [0, 250, 500, 750, 1000] };

  const rough = max / (targetTicks - 1);
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const frac = rough / pow;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  const step = nice * pow;
  const top = Math.ceil(max / step - 1e-9) * step;

  const ticks = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { max: top, step, ticks };
}

/** ₱1.33M / ₱450K / ₱950 — used for on-chart labels when there isn't room for the full amount. */
export function formatCompactCurrency(amount) {
  const n = Number(amount) || 0;
  const abs = Math.abs(n);
  const trim = (v) => String(Math.round(v * 100) / 100);
  if (abs >= 1_000_000) return `₱${trim(n / 1_000_000)}M`;
  if (abs >= 1_000) return `₱${trim(n / 1_000)}K`;
  return `₱${trim(n)}`;
}

/** Full amount when it fits the available width, compact otherwise. */
export function fitCurrency(amount, availableWidth, charWidth = 6.8) {
  const full = formatCurrency(amount);
  return full.length * charWidth <= availableWidth ? full : formatCompactCurrency(amount);
}

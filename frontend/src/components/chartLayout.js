import { niceScale } from "../utils/chart.js";
import { formatCurrency } from "../utils/format.js";

const HEIGHT = 300;
const PAD = { top: 34, right: 16, bottom: 34 };

/** Pixel layout shared by BarChart and LineChart so both read the same way. */
export function layoutChart(data, valueKey, width) {
  const scale = niceScale(Math.max(...data.map((d) => Number(d[valueKey]) || 0), 0));
  const longestTick = Math.max(...scale.ticks.map((t) => formatCurrency(t).length));
  const left = Math.min(Math.max(longestTick * 6.8 + 16, 56), 120);

  const innerW = Math.max(width - left - PAD.right, 40);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const band = innerW / Math.max(data.length, 1);

  return {
    height: HEIGHT,
    pad: { ...PAD, left },
    scale,
    innerW,
    innerH,
    band,
    xCenter: (i) => left + band * i + band / 2,
    y: (value) => PAD.top + innerH - ((Number(value) || 0) / scale.max) * innerH,
    baseline: PAD.top + innerH,
  };
}

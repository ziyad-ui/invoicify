import React from "react";

/** Small floating readout positioned over a chart (x/y are pixels inside the chart container). */
export default function ChartTooltip({ x, y, containerWidth, title, value }) {
  const half = 80; // keeps the box inside the container at the edges
  const left = Math.min(Math.max(x, half), Math.max(containerWidth - half, half));

  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg"
      style={{ left, top: Math.max(y - 10, 0) }}
      role="status"
    >
      <p className="text-white/60">{title}</p>
      <p className="num mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

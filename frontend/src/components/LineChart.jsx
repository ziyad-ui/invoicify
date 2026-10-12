import React, { useState } from "react";
import ChartTooltip from "./ChartTooltip.jsx";
import useElementWidth from "../hooks/useElementWidth.js";
import { layoutChart } from "./chartLayout.js";
import { fitCurrency } from "../utils/chart.js";
import { formatCurrency } from "../utils/format.js";

/**
 * Collection trend as a line with a marker on every month: money-formatted Y axis, month labels on the X axis,
 * the amount called out above each marker, and a hover/focus tooltip with the exact figure.
 * data: [{ month: "Oct", label?: "October 2026", amount: 1327500 }]
 */
export default function LineChart({ data, valueKey = "amount", labelKey = "month", titleKey = "label" }) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState(null);

  if (!data?.length) return <p className="text-sm text-gray-400">No data to show yet.</p>;

  const L = layoutChart(data, valueKey, width);
  const points = data.map((d, i) => ({ x: L.xCenter(i), y: L.y(d[valueKey]), value: Number(d[valueKey]) || 0, d }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${points[points.length - 1].x},${L.baseline} L${points[0].x},${L.baseline} Z`;
  const total = points.reduce((s, p) => s + p.value, 0);
  const active = hover !== null ? points[hover] : null;

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={width}
        height={L.height}
        role="img"
        aria-label={`Monthly collection trend, total ${formatCurrency(total)}`}
        className="block overflow-visible"
      >
        {/* Y axis: gridlines + money labels */}
        {L.scale.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={L.pad.left}
              x2={L.pad.left + L.innerW}
              y1={L.y(tick)}
              y2={L.y(tick)}
              stroke="currentColor"
              strokeDasharray={tick === 0 ? undefined : "3 4"}
              className="text-gray-200"
            />
            <text x={L.pad.left - 10} y={L.y(tick)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="currentColor" className="num text-gray-500">
              {formatCurrency(tick)}
            </text>
          </g>
        ))}

        {/* X axis: months */}
        {points.map((p) => (
          <text key={p.d[labelKey]} x={p.x} y={L.baseline + 20} textAnchor="middle" fontSize="12" fill="currentColor" className="text-gray-500">
            {p.d[labelKey]}
          </text>
        ))}

        {/* trend line + soft fill */}
        <path d={area} className="fill-accent" opacity="0.08" />
        <path d={line} fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className="stroke-accent" />

        {/* hover guide */}
        {active && (
          <line x1={active.x} x2={active.x} y1={L.pad.top} y2={L.baseline} stroke="currentColor" strokeDasharray="3 3" className="text-gray-300" />
        )}

        {points.map((p, i) => (
          <g key={p.d[labelKey]}>
            <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor" className="num text-ink">
              {fitCurrency(p.value, L.band - 6)}
            </text>
            <circle cx={p.x} cy={p.y} r={hover === i ? 7 : 5} strokeWidth="2.5" className="fill-white stroke-accent transition-all" />
            <rect
              x={p.x - L.band / 2}
              y={L.pad.top}
              width={L.band}
              height={L.innerH + L.pad.bottom}
              fill="transparent"
              tabIndex={0}
              aria-label={`${p.d[titleKey] || p.d[labelKey]}: ${formatCurrency(p.value)}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              style={{ outline: "none" }}
            />
          </g>
        ))}
      </svg>

      {total === 0 && (
        <p className="mt-2 text-center text-xs text-gray-400">No collections have been recorded in this period yet.</p>
      )}

      {active && (
        <ChartTooltip
          x={active.x}
          y={active.y - 8}
          containerWidth={width}
          title={active.d[titleKey] || active.d[labelKey]}
          value={formatCurrency(active.value)}
        />
      )}
    </div>
  );
}

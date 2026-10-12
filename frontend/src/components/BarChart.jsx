import React, { useState } from "react";
import ChartTooltip from "./ChartTooltip.jsx";
import useElementWidth from "../hooks/useElementWidth.js";
import { layoutChart } from "./chartLayout.js";
import { fitCurrency } from "../utils/chart.js";
import { formatCurrency } from "../utils/format.js";

/**
 * Monthly collections as bars, with a labelled money axis, the amount printed above every bar,
 * and a hover/focus tooltip showing the exact figure.
 * data: [{ month: "Oct", label?: "October 2026", amount: 1327500 }]
 */
export default function BarChart({ data, valueKey = "amount", labelKey = "month", titleKey = "label" }) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState(null);

  if (!data?.length) return <p className="text-sm text-gray-400">No data to show yet.</p>;

  const L = layoutChart(data, valueKey, width);
  const barW = Math.min(L.band * 0.55, 72);
  const total = data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0);
  const active = hover !== null ? data[hover] : null;

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={width}
        height={L.height}
        role="img"
        aria-label={`Monthly collections, total ${formatCurrency(total)}`}
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

        {data.map((d, i) => {
          const value = Number(d[valueKey]) || 0;
          const top = L.y(value);
          const h = Math.max(L.baseline - top, value > 0 ? 3 : 2);
          const x = L.xCenter(i);
          const isActive = hover === i;

          return (
            <g key={d[labelKey]}>
              <rect
                x={x - barW / 2}
                y={L.baseline - h}
                width={barW}
                height={h}
                rx="5"
                className={isActive ? "fill-accent-dark" : "fill-accent"}
                opacity={value === 0 ? 0.35 : 1}
              />
              <text x={x} y={L.baseline - h - 8} textAnchor="middle" fontSize="11" fontWeight="600" fill="currentColor" className="num text-ink">
                {fitCurrency(value, L.band - 6)}
              </text>
              <text x={x} y={L.baseline + 20} textAnchor="middle" fontSize="12" fill="currentColor" className="text-gray-500">
                {d[labelKey]}
              </text>
              {/* generous invisible hit area for hover / keyboard focus */}
              <rect
                x={x - L.band / 2}
                y={L.pad.top}
                width={L.band}
                height={L.innerH + L.pad.bottom}
                fill="transparent"
                tabIndex={0}
                aria-label={`${d[titleKey] || d[labelKey]}: ${formatCurrency(value)}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                style={{ outline: "none" }}
              />
            </g>
          );
        })}
      </svg>

      {active && (
        <ChartTooltip
          x={L.xCenter(hover)}
          y={L.y(Number(active[valueKey]) || 0) - 22}
          containerWidth={width}
          title={active[titleKey] || active[labelKey]}
          value={formatCurrency(Number(active[valueKey]) || 0)}
        />
      )}
    </div>
  );
}

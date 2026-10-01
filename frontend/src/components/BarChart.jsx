import React from "react";
import { formatCurrency } from "../utils/format.js";

export default function BarChart({ data, valueKey = "amount", labelKey = "month" }) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);

  return (
    <div className="flex h-48 items-end gap-3">
      {data.map((d) => {
        const heightPct = Math.max((d[valueKey] / max) * 100, 4);
        return (
          <div key={d[labelKey]} className="group flex flex-1 flex-col items-center gap-2">
            <div className="relative flex h-36 w-full items-end">
              <div
                className="w-full rounded-t-md bg-accent transition-all group-hover:bg-accent-dark"
                style={{ height: `${heightPct}%` }}
                title={formatCurrency(d[valueKey])}
              />
            </div>
            <span className="text-xs text-gray-500">{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

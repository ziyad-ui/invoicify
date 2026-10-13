import React from "react";

/** Small summary tile with an icon: used across the client portal pages. */
export default function StatTile({ icon: Icon, label, value, hint }) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {Icon && (
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon width={19} height={19} />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="num mt-1 truncate text-base font-semibold text-ink">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}

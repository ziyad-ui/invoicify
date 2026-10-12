import React from "react";

/**
 * Underline tabs.  tabs: [{ key, label, count? }]
 * Used to split long pages (e.g. a client's invoices vs. payment history) into one view at a time.
 */
export default function Tabs({ tabs, active, onChange, className = "" }) {
  return (
    <div role="tablist" className={`flex gap-1 border-b border-gray-200 ${className}`}>
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              selected ? "border-accent text-accent" : "border-transparent text-gray-500 hover:text-ink"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  selected ? "bg-accent-soft text-accent" : "bg-gray-100 text-gray-500"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

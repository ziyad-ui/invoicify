import React from "react";

/** `flush` removes the inner padding so a Table can run edge to edge (the header keeps its own padding). */
export default function Card({ title, subtitle, action, className = "", flush = false, children }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${flush ? "overflow-hidden" : "p-5"} ${className}`}>
      {(title || action) && (
        <div className={`flex items-center justify-between gap-3 ${flush ? "px-5 pb-4 pt-5" : "mb-4"}`}>
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

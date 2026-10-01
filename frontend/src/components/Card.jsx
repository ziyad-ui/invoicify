import React from "react";

export default function Card({ title, action, className = "", children }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

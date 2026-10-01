import React from "react";

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

import React, { useId } from "react";

/** The Invoicify mark (invoice + paid check). Same artwork as /favicon.svg. */
export function LogoMark({ size = 32, className = "" }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="Invoicify">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#3730A3" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#g${id})`} />
      <path d="M19 13h18l10 10v26a3 3 0 0 1-3 3H19a3 3 0 0 1-3-3V16a3 3 0 0 1 3-3z" fill="#fff" />
      <path d="M37 13v8a2 2 0 0 0 2 2h8z" fill="#C7D2FE" />
      <rect x="22" y="29" width="18" height="3.5" rx="1.75" fill="#6366F1" />
      <rect x="22" y="36" width="11" height="3.5" rx="1.75" fill="#A5B4FC" />
      <circle cx="45" cy="46" r="10" fill="#22C55E" stroke="#3730A3" strokeWidth="3" />
      <path d="M40.5 46l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ size = 32, tagline, dark = true }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <div className="leading-tight">
        <p className={`text-base font-bold ${dark ? "text-white" : "text-ink"}`}>Invoicify</p>
        {tagline && <p className={`text-[11px] ${dark ? "text-white/50" : "text-gray-500"}`}>{tagline}</p>}
      </div>
    </div>
  );
}

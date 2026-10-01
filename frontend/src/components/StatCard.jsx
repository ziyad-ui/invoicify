import React from "react";

export default function StatCard({ label, value, tone = "default", hint }) {
  const toneClasses =
    tone === "dark"
      ? "bg-ink text-white"
      : "bg-white text-ink border border-gray-200";

  return (
    <div className={`rounded-xl p-5 ${toneClasses}`}>
      <p
        className={`text-xs font-medium uppercase tracking-wide ${
          tone === "dark" ? "text-white/60" : "text-gray-500"
        }`}
      >
        {label}
      </p>
      <p className="num mt-2 text-2xl font-semibold">{value}</p>
      {hint && (
        <p className={`mt-1 text-xs ${tone === "dark" ? "text-white/50" : "text-gray-400"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

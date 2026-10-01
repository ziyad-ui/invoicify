import React from "react";

export default function FormField({
  label,
  error,
  as = "input",
  children,
  className = "",
  ...props
}) {
  const Tag = as;
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      {as === "select" ? (
        <select
          className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent ${
            error ? "border-red-400" : "border-gray-300"
          }`}
          {...props}
        >
          {children}
        </select>
      ) : (
        <Tag
          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-gray-400 focus:border-accent ${
            error ? "border-red-400" : "border-gray-300"
          }`}
          {...props}
        />
      )}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

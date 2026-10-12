import React from "react";

/**
 * The one text/number/select field used by every form, so inputs, focus states
 * and error styling match across all modals.
 *  - `hint`   small helper text under the field (hidden while there is an error)
 *  - `prefix` short adornment inside the field, e.g. "₱" for money
 */
const BASE =
  "w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-gray-400 focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";

export default function FormField({
  label,
  error,
  hint,
  prefix,
  as = "input",
  children,
  className = "",
  ...props
}) {
  const Tag = as;
  const border = error ? "border-red-400" : "border-gray-300";

  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
      {as === "select" ? (
        <select className={`${BASE} ${border}`} {...props}>
          {children}
        </select>
      ) : prefix ? (
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-400">
            {prefix}
          </span>
          <Tag className={`${BASE} ${border} pl-7`} {...props} />
        </div>
      ) : (
        <Tag className={`${BASE} ${border}`} {...props} />
      )}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-gray-400">{hint}</span>
      )}
    </label>
  );
}

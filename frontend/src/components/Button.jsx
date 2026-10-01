import React from "react";

const VARIANTS = {
  primary: "bg-accent text-white hover:bg-accent-dark",
  dark: "bg-ink text-white hover:bg-ink-soft",
  outline: "border border-gray-300 text-ink hover:bg-gray-50",
  ghost: "text-ink hover:bg-gray-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const SIZES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export default function Button({
  as: As = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  return (
    <As
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </As>
  );
}

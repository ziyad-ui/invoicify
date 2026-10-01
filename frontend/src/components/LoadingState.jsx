import React from "react";

export default function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-accent" />
      <p className="text-xs">{label}</p>
    </div>
  );
}

import React from "react";
import Button from "./Button.jsx";

export default function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center">
      <p className="text-sm font-medium text-red-700">
        {error?.message || "Something went wrong."}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

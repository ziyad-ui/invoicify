import React, { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

const TONE_STYLES = {
  success: "border-l-4 border-emerald-500",
  error: "border-l-4 border-red-500",
  warning: "border-l-4 border-amber-500",
  info: "border-l-4 border-accent",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, tone = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-md bg-white px-4 py-3 text-sm text-ink shadow-lg ${TONE_STYLES[t.tone]}`}
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

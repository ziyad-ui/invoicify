import React, { useEffect } from "react";
import { IconClose } from "./icons.jsx";

export default function Modal({ open, onClose, title, children, footer, width = "max-w-md" }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className={`w-full ${width} rounded-xl bg-white shadow-xl`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-ink"
            aria-label="Close"
          >
            <IconClose width={16} height={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

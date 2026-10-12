import React, { useEffect } from "react";
import { IconClose } from "./icons.jsx";

/** Right-hand slide-over panel (used for the Profile editor). Closes on Esc or a click on the dim backdrop. */
export default function Drawer({ open, onClose, title, children, width = "max-w-md" }) {
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <aside
        className={`flex h-full w-full ${width} flex-col bg-white shadow-xl`}
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
        <div className="flex-1 overflow-y-auto px-5 py-5 scrollbar-thin">{children}</div>
      </aside>
    </div>
  );
}

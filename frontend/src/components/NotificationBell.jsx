import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { IconBell } from "./icons.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";

/**
 * Top-right bell. Clicking it toggles a panel with the latest notifications.
 * The red badge counts items newer than the last time this person opened the panel
 * (remembered per user in this browser).
 *  load:      () => Promise<Array<{ id, type, subject, sentAt, status, client? }>>
 *  viewAllTo: optional route for a "View all" link
 */
export default function NotificationBell({ load, viewAllTo }) {
  const { user } = useAuth();
  const { t } = usePreferences();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [seenId, setSeenId] = useState(() => readSeen(user?.id));
  const wrapRef = useRef(null);

  const refresh = useCallback(() => {
    load()
      .then((rows) => {
        setItems((rows || []).slice(0, 8));
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [load]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const newest = items.reduce((m, i) => Math.max(m, i.id), 0);
  const unread = items.filter((i) => i.id > seenId).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      refresh();
      if (newest > seenId) {
        setSeenId(newest);
        writeSeen(user?.id, newest);
      }
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={t("header.notifications")}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink"
      >
        <IconBell width={19} height={19} />
        {unread > 0 && (
          <span className="num absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-ink">{t("header.notifications")}</p>
            {viewAllTo && (
              <Link to={viewAllTo} onClick={() => setOpen(false)} className="text-xs font-medium text-accent hover:underline">
                {t("common.viewAll")}
              </Link>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {state === "loading" && <p className="px-4 py-6 text-center text-sm text-gray-400">{t("bell.loading")}</p>}
            {state === "error" && <p className="px-4 py-6 text-center text-sm text-gray-400">{t("bell.error")}</p>}
            {state === "ready" && items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">{t("bell.empty")}</p>
            )}
            {state === "ready" && (
              <ul className="divide-y divide-gray-100">
                {items.map((n) => (
                  <li key={n.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{n.subject}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {n.client ? `${n.client} · ` : ""}
                        {n.type} · <span className="num">{n.sentAt}</span>
                      </p>
                    </div>
                    {n.status === "Failed" && <StatusBadge status="Failed" />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const seenKey = (userId) => `invoicify_notif_seen_${userId}`;
function readSeen(userId) {
  try {
    return Number(localStorage.getItem(seenKey(userId))) || 0;
  } catch {
    return 0;
  }
}
function writeSeen(userId, id) {
  try {
    localStorage.setItem(seenKey(userId), String(id));
  } catch {
    /* ignore */
  }
}

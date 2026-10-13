import React from "react";
import { NavLink } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { IconLogout, IconClose } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";

/**
 * The one sidebar used by Owner, Staff and Client. `items` = [{ to, label, icon }] (labels already translated).
 * On screens below `lg` it becomes a slide-in drawer controlled by `open` / `onClose`.
 */
export default function Sidebar({ items, tagline, open = false, onClose = () => {} }) {
  const { user, logout } = useAuth();
  const { t } = usePreferences();
  const initials = (user?.name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-shrink-0 flex-col bg-ink text-white transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Logo tagline={tagline} />
          <button onClick={onClose} className="rounded-md p-1 text-white/50 hover:text-white lg:hidden" aria-label="Close menu">
            <IconClose width={18} height={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-2">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive ? "bg-accent/20 font-medium text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-indigo-400 transition-opacity ${
                      isActive ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <item.icon width={18} height={18} className={isActive ? "text-indigo-300" : ""} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="m-3 rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs capitalize text-white/50">{user?.title || user?.role}</p>
            </div>
          </div>
          <button onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-md px-1 py-1 text-xs text-white/50 hover:text-white">
            <IconLogout width={14} height={14} />
            {t("common.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}

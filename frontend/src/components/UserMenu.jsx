import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconMenu, IconSettings, IconInfo, IconLogout } from "./icons.jsx";
import Avatar from "./Avatar.jsx";
import AboutModal from "./AboutModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";

/**
 * Hamburger (☰) menu in the top-right of every view: your profile, Settings, About, Log out.
 * Profile and Settings both live on the Settings page now.
 */
export default function UserMenu() {
  const { user, role, logout } = useAuth();
  const { t } = usePreferences();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [about, setAbout] = useState(false);
  const wrapRef = useRef(null);

  const settingsPath = role === "client" ? "/portal/settings" : "/settings";

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

  function go(path) {
    setOpen(false);
    navigate(path);
  }

  const item = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-gray-50";

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("header.menu")}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-ink"
      >
        <IconMenu width={20} height={20} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
          <button
            className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            onClick={() => go(`${settingsPath}?tab=profile`)}
          >
            <Avatar user={user} size={36} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{user?.name}</span>
              <span className="block truncate text-xs text-gray-500">{user?.email}</span>
            </span>
          </button>

          <button className={item} onClick={() => go(settingsPath)}>
            <IconSettings width={17} height={17} className="text-gray-400" /> {t("menu.settings")}
          </button>
          <button
            className={item}
            onClick={() => {
              setOpen(false);
              setAbout(true);
            }}
          >
            <IconInfo width={17} height={17} className="text-gray-400" /> {t("menu.about")}
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button className={item} onClick={logout}>
            <IconLogout width={17} height={17} className="text-gray-400" /> {t("common.logout")}
          </button>
        </div>
      )}

      <AboutModal open={about} onClose={() => setAbout(false)} />
    </div>
  );
}

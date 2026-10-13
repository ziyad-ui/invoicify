import React, { useEffect, useRef, useState } from "react";
import { IconMenu, IconUser, IconSettings, IconInfo, IconLogout } from "./icons.jsx";
import ProfileDrawer from "./ProfileDrawer.jsx";
import SettingsModal from "./SettingsModal.jsx";
import AboutModal from "./AboutModal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";

/**
 * Hamburger (☰) menu in the top-right of every view: Profile, Settings, About, Log out.
 */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = usePreferences();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(null); // "profile" | "settings" | "about"
  const wrapRef = useRef(null);

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

  function choose(name) {
    setOpen(false);
    setPanel(name);
  }

  const item =
    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-gray-50";

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
        <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
            <p className="truncate text-xs text-gray-500">{user?.email}</p>
          </div>


          <button className={item} onClick={() => choose("profile")}>
            <IconUser width={17} height={17} className="text-gray-400" /> {t("menu.profile")}
          </button>
          <button className={item} onClick={() => choose("settings")}>
            <IconSettings width={17} height={17} className="text-gray-400" /> {t("menu.settings")}
          </button>
          <button className={item} onClick={() => choose("about")}>
            <IconInfo width={17} height={17} className="text-gray-400" /> {t("menu.about")}
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button className={item} onClick={logout}>
            <IconLogout width={17} height={17} className="text-gray-400" /> {t("common.logout")}
          </button>
        </div>
      )}

      <ProfileDrawer open={panel === "profile"} onClose={() => setPanel(null)} />
      <SettingsModal open={panel === "settings"} onClose={() => setPanel(null)} />
      <AboutModal open={panel === "about"} onClose={() => setPanel(null)} />
    </div>
  );
}

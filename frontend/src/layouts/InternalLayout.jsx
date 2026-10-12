import React, { useCallback } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import TopBar from "../components/TopBar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";
import { notificationsApi } from "../api/services.js";

export default function InternalLayout() {
  const { user } = useAuth();
  const { t } = usePreferences();
  const load = useCallback(() => notificationsApi.list(), []);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          left={
            <p className="truncate text-sm text-gray-500">
              {t("header.welcome", { name: (user?.name || "").split(" ")[0] })}
            </p>
          }
          loadNotifications={load}
          notificationsLink="/notifications"
        />
        <div className="flex-1 overflow-y-auto">
          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

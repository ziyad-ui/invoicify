import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import TopBar from "../components/TopBar.jsx";

/** Shared page frame: sidebar on the left, top bar (bell + menu) on top, page content in the middle. */
export default function AppShell({ items, tagline, left, loadNotifications, notificationsLink, maxWidth = "max-w-6xl" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-surface">
      <Sidebar items={items} tagline={tagline} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          left={left}
          loadNotifications={loadNotifications}
          notificationsLink={notificationsLink}
          onMenuClick={() => setMenuOpen(true)}
        />
        <div className="flex-1 overflow-y-auto">
          <main className={`mx-auto ${maxWidth} px-4 py-6 sm:px-8`}>
            <div key={pathname} className="animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

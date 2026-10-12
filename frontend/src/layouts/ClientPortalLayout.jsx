import React, { useCallback } from "react";
import { NavLink, Outlet } from "react-router-dom";
import TopBar from "../components/TopBar.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";
import { portalApi } from "../api/services.js";

export default function ClientPortalLayout() {
  const { t } = usePreferences();
  const load = useCallback(() => portalApi.notifications(), []);

  const navItems = [
    { to: "/portal/dashboard", label: t("nav.dashboard") },
    { to: "/portal/invoices", label: t("nav.portalInvoices") },
    { to: "/portal/payments", label: t("nav.portalPayments") },
    { to: "/portal/profile", label: t("nav.portalAccount") },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <TopBar
        navItems={navItems}
        loadNotifications={load}
        left={
          <>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">IN</span>
              <p className="whitespace-nowrap text-base font-bold text-ink">
                Invoicify <span className="hidden font-normal text-gray-400 md:inline">— {t("header.portal")}</span>
              </p>
            </div>
            <nav className="hidden gap-1 sm:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
                      isActive ? "bg-accent-soft font-medium text-accent" : "text-gray-500 hover:text-ink"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </>
        }
      />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}

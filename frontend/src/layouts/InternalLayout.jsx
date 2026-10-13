import React, { useCallback } from "react";
import AppShell from "./AppShell.jsx";
import { IconDashboard, IconClients, IconInvoice, IconPayments, IconReports, IconStaff } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";
import { notificationsApi } from "../api/services.js";

export default function InternalLayout() {
  const { user, role } = useAuth();
  const { t } = usePreferences();
  const load = useCallback(() => notificationsApi.list(), []);

  const items = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: IconDashboard, roles: ["owner", "staff"] },
    { to: "/clients", label: t("nav.clients"), icon: IconClients, roles: ["owner", "staff"] },
    { to: "/invoices", label: t("nav.invoices"), icon: IconInvoice, roles: ["owner", "staff"] },
    { to: "/payments", label: t("nav.payments"), icon: IconPayments, roles: ["owner", "staff"] },
    { to: "/reports", label: t("nav.reports"), icon: IconReports, roles: ["owner"] },
    { to: "/staff", label: t("nav.staff"), icon: IconStaff, roles: ["owner"] },
  ].filter((i) => i.roles.includes(role));

  return (
    <AppShell
      items={items}
      left={<p className="truncate text-sm text-gray-500">{t("header.welcome", { name: (user?.name || "").split(" ")[0] })}</p>}
      loadNotifications={load}
      notificationsLink="/notifications"
    />
  );
}

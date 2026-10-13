import React, { useCallback } from "react";
import AppShell from "./AppShell.jsx";
import { IconDashboard, IconInvoice, IconPayments, IconMapPin, IconUser } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";
import { portalApi } from "../api/services.js";

export default function ClientPortalLayout() {
  const { user } = useAuth();
  const { t } = usePreferences();
  const load = useCallback(() => portalApi.notifications(), []);

  const items = [
    { to: "/portal/dashboard", label: t("nav.dashboard"), icon: IconDashboard },
    { to: "/portal/invoices", label: t("nav.portalInvoices"), icon: IconInvoice },
    { to: "/portal/payments", label: t("nav.portalPayments"), icon: IconPayments },
    { to: "/portal/property", label: t("nav.portalProperty"), icon: IconMapPin },
    { to: "/portal/profile", label: t("nav.portalAccount"), icon: IconUser },
  ];

  return (
    <AppShell
      items={items}
      tagline={t("header.portal")}
      left={<p className="truncate text-sm text-gray-500">{t("header.welcome", { name: (user?.name || "").split(" ")[0] })}</p>}
      loadNotifications={load}
      maxWidth="max-w-5xl"
    />
  );
}

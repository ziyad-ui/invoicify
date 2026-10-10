import React from "react";
import { NavLink } from "react-router-dom";
import {
  IconDashboard,
  IconClients,
  IconInvoice,
  IconPayments,
  IconBell,
  IconReports,
  IconStaff,
  IconLogout,
} from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: IconDashboard, roles: ["owner", "staff"] },
  { to: "/clients", label: "Clients", icon: IconClients, roles: ["owner", "staff"] },
  { to: "/invoices", label: "Invoices", icon: IconInvoice, roles: ["owner", "staff"] },
  { to: "/payments", label: "Payments", icon: IconPayments, roles: ["owner", "staff"] },
  { to: "/notifications", label: "Notifications", icon: IconBell, roles: ["owner", "staff"] },
  { to: "/reports", label: "Reports", icon: IconReports, roles: ["owner"] },
  { to: "/staff", label: "Staff", icon: IconStaff, roles: ["owner"] },
];

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col bg-ink text-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold">
          IN
        </span>
        <span className="text-base font-bold">Invoicify</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-ink-soft font-medium text-white"
                  : "text-white/60 hover:bg-ink-soft/60 hover:text-white"
              }`
            }
          >
            <item.icon width={17} height={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-xs text-white/40">Signed in as</p>
        <p className="text-sm font-semibold">{user?.name}</p>
        <p className="text-xs text-white/50">{user?.title}</p>
        <NavLink to="/change-password" className="mt-3 block text-xs text-white/50 hover:text-white">
          Change password
        </NavLink>
        <button
          onClick={logout}
          className="mt-2 flex items-center gap-2 text-xs text-white/50 hover:text-white"
        >
          <IconLogout width={14} height={14} />
          Log out
        </button>
      </div>
    </aside>
  );
}

import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/portal/dashboard", label: "Dashboard" },
  { to: "/portal/invoices", label: "Invoices" },
  { to: "/portal/payments", label: "Payment History" },
  { to: "/portal/profile", label: "Profile" },
];

export default function ClientPortalLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <p className="text-base font-bold text-ink">
            Invoicify <span className="font-normal text-gray-400">— Client Portal</span>
          </p>
          <nav className="hidden gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive ? "bg-accent-soft font-medium text-accent" : "text-gray-500 hover:text-ink"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="font-medium text-ink">{user?.name}</span>
          <span>·</span>
          <NavLink to="/change-password" className="underline hover:text-ink">
            Change password
          </NavLink>
          <span>·</span>
          <button onClick={logout} className="underline hover:text-ink">
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

import Login from "./pages/Login.jsx";
import NotFound from "./pages/NotFound.jsx";

import InternalLayout from "./layouts/InternalLayout.jsx";
import Dashboard from "./pages/internal/Dashboard.jsx";
import Clients from "./pages/internal/Clients.jsx";
import ClientProfile from "./pages/internal/ClientProfile.jsx";
import Invoices from "./pages/internal/Invoices.jsx";
import Payments from "./pages/internal/Payments.jsx";
import Notifications from "./pages/internal/Notifications.jsx";
import Reports from "./pages/internal/Reports.jsx";

import ClientPortalLayout from "./layouts/ClientPortalLayout.jsx";
import PortalDashboard from "./pages/portal/PortalDashboard.jsx";
import PortalProfile from "./pages/portal/PortalProfile.jsx";
import PortalInvoices from "./pages/portal/PortalInvoices.jsx";
import PortalPayments from "./pages/portal/PortalPayments.jsx";

export default function App() {
  const { role, initializing } = useAuth();

  if (initializing) return null; // wait for the session check before choosing a route

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={role ? (role === "client" ? "/portal/dashboard" : "/dashboard") : "/login"} replace />}
      />
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <ProtectedRoute allow={["owner", "staff"]}>
            <InternalLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientProfile />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allow={["owner"]}>
              <Reports />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        element={
          <ProtectedRoute allow={["client"]}>
            <ClientPortalLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/portal/dashboard" element={<PortalDashboard />} />
        <Route path="/portal/profile" element={<PortalProfile />} />
        <Route path="/portal/invoices" element={<PortalInvoices />} />
        <Route path="/portal/payments" element={<PortalPayments />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

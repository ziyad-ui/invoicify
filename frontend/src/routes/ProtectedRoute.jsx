import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import LoadingState from "../components/LoadingState.jsx";

export default function ProtectedRoute({ allow, children }) {
  const { role, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingState label="Restoring your session…" />
      </div>
    );
  }
  if (!role) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(role)) {
    const home = role === "client" ? "/portal/dashboard" : "/dashboard";
    return <Navigate to={home} replace />;
  }
  return children;
}

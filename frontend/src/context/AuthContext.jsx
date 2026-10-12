import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/services.js";
import { setUnauthorizedHandler, tokenStore } from "../api/http.js";

/**
 * Real authentication against the Laravel API (Sanctum bearer tokens).
 * - login()  POST /api/login  -> stores the token, sets `user`
 * - on app start, if a token exists, GET /api/me restores the session
 * - a 401 from any request logs the user out (see api/http.js)
 * Components still just read `user` and `role`, exactly as before.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(() => !!tokenStore.get());

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));

    if (!tokenStore.get()) return;
    authApi
      .me()
      .then((res) => setUser(res.user))
      .catch(() => tokenStore.clear())
      .finally(() => setInitializing(false));
  }, []);

  // Throws the axios error on failure so the login form can show field messages.
  async function login({ email, password }) {
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      tokenStore.set(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      /* token may already be invalid — still log out locally */
    }
    tokenStore.clear();
    setUser(null);
  }

  // Called after the person has successfully set their own password.
  function markPasswordChanged() {
    setUser((u) => (u ? { ...u, mustChangePassword: false } : u));
  }

  // Merge fresh fields (name, email…) returned by the profile endpoints into the session user.
  function updateUser(patch) {
    setUser((u) => (u ? { ...u, ...patch } : u));
  }

  const value = useMemo(
    () => ({ user, role: user?.role || null, loading, initializing, login, logout, markPasswordChanged, updateUser }),
    [user, loading, initializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

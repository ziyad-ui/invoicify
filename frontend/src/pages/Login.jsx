import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import AuthShell from "../components/AuthShell.jsx";
import FormField from "../components/FormField.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { authApi } from "../api/services.js";
import { parseApiError } from "../api/http.js";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [detected, setDetected] = useState(null); // "owner" | "staff" | "client" | null
  const { login, loading } = useAuth();
  const { t } = usePreferences();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Work out which kind of account the email belongs to (shown as a hint only — the server
  // decides the real role when the person signs in).
  useEffect(() => {
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setDetected(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await authApi.checkRole(value);
        if (!cancelled) setDetected(res.role || null);
      } catch {
        if (!cancelled) setDetected(null);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [email]);

  function validate() {
    const next = {};
    if (!email.trim()) next.email = "Email address is required.";
    else if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 6) next.password = "Password must be at least 6 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    try {
      const user = await login({ email, password });
      addToast(t("login.welcome", { name: user.name.split(" ")[0] }), "success");
      navigate(user.role === "client" ? "/portal/dashboard" : "/dashboard");
    } catch (err) {
      const { message, fields } = parseApiError(err);
      if (Object.keys(fields).length) setErrors(fields);
      else setErrors({ form: message });
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight text-ink">{t("login.heading")}</h1>
      <p className="mt-1.5 text-sm text-gray-500">{t("login.subtitle")}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <FormField
          label={t("login.email")}
          type="email"
          placeholder="you@example.com"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <div>
          <FormField
            label={t("login.password")}
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="rounded px-1.5 py-1 text-xs font-medium text-gray-500 hover:text-ink"
              >
                {showPassword ? t("login.hide") : t("login.show")}
              </button>
            }
          />
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-xs font-medium text-accent hover:underline">
              {t("login.forgot")}
            </Link>
          </div>
        </div>

        {errors.role && <p className="text-xs text-red-600">{errors.role}</p>}
        {errors.form && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errors.form}</p>}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {t("login.submit")}
        </Button>

        <div
          className="flex items-start gap-2.5 rounded-lg bg-accent-soft px-3.5 py-3 text-xs leading-relaxed text-accent-dark"
          aria-live="polite"
        >
          <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${detected ? "bg-emerald-500" : "bg-accent/40"}`} />
          <p>
            {detected ? (
              <>
                {t("login.signingInAs")} <strong>{t(`role.${detected}`)}</strong> — {t(`login.desc.${detected}`)}
              </>
            ) : (
              t("login.helper.default")
            )}
          </p>
        </div>
      </form>

      <p className="mt-8 text-center text-xs text-gray-400">{t("login.help")}</p>
    </AuthShell>
  );
}

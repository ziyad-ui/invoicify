import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import FormField from "../components/FormField.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { authApi } from "../api/services.js";
import { parseApiError } from "../api/http.js";
import { LANGUAGES } from "../i18n/translations.js";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [detected, setDetected] = useState(null); // "owner" | "staff" | "client" | null
  const { login, loading } = useAuth();
  const { t, language, setLanguage } = usePreferences();
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
    <div className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">
            IN
          </span>
          <h1 className="text-xl font-bold text-white">Invoicify</h1>
          <p className="mt-1 text-sm text-white/50">Client Billing &amp; Payment Console</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-xl">
          <h2 className="text-base font-semibold text-ink">{t("login.title")}</h2>
          <p className="mt-1 text-sm text-gray-500">{t("login.subtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            <FormField
              label={t("login.email")}
              type="email"
              placeholder="you@example.com"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
            <FormField
              label={t("login.password")}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />

            {errors.role && <p className="text-xs text-red-600">{errors.role}</p>}
            {errors.form && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errors.form}</p>}

            <Button type="submit" className="w-full" loading={loading}>
              {t("login.submit")}
            </Button>

            <div className="rounded-lg bg-accent-soft px-3 py-2.5 text-xs text-accent-dark" aria-live="polite">
              {detected ? (
                <>
                  {t("login.signingInAs")} <strong>{t(`role.${detected}`)}</strong> — {t(`login.desc.${detected}`)}
                </>
              ) : (
                t("login.helper.default")
              )}
            </div>
          </form>
        </div>

        <div className="mt-4 flex justify-center gap-3 text-xs text-white/50">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLanguage(l.code)}
              className={language === l.code ? "font-semibold text-white" : "hover:text-white"}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

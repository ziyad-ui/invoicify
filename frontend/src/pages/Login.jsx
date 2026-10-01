import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import FormField from "../components/FormField.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { parseApiError } from "../api/http.js";

const ROLES = [
  {
    key: "owner",
    label: "Owner",
    placeholder: "owner@loverealty.com",
    helper: (
      <>
        Signing in as <strong>Owner</strong> — you'll see the dashboard, revenue reports, and
        overall account status.
      </>
    ),
  },
  {
    key: "staff",
    label: "Staff",
    placeholder: "staff@loverealty.com",
    helper: (
      <>
        Signing in as <strong>Administrative Staff</strong> — manage clients, invoices, and
        payment records.
      </>
    ),
  },
  {
    key: "client",
    label: "Client",
    placeholder: "you@example.com",
    helper: (
      <>
        Signing in as <strong>Client</strong> — view your property, balance, and payment history.
      </>
    ),
  },
];

export default function Login() {
  const [role, setRole] = useState("owner");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const { login, loading } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const activeRole = ROLES.find((r) => r.key === role);

  function validate() {
    const next = {};
    if (!email.trim()) next.email = "Email address is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 6) next.password = "Password must be at least 6 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    try {
      const user = await login({ role, email, password });
      addToast(`Welcome back, ${user.name.split(" ")[0]}.`, "success");
      navigate(user.role === "client" ? "/portal/dashboard" : "/dashboard");
    } catch (err) {
      const { message, fields } = parseApiError(err);
      // Field-level messages (wrong password, wrong account type) or a general banner.
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
          <h2 className="text-base font-semibold text-ink">Sign in to your account</h2>
          <p className="mt-1 text-sm text-gray-500">Choose your account type to continue.</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
                I am signing in as
              </span>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1">
                {ROLES.map((r) => (
                  <button
                    type="button"
                    key={r.key}
                    onClick={() => setRole(r.key)}
                    className={`rounded-md py-1.5 text-sm font-medium transition-colors ${
                      role === r.key ? "bg-white text-ink shadow-sm" : "text-gray-500 hover:text-ink"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <FormField
              label="Email address"
              type="email"
              placeholder={activeRole.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
            <FormField
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />

            {errors.role && (
              <p className="text-xs text-red-600">{errors.role}</p>
            )}
            {errors.form && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errors.form}</p>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Sign In
            </Button>

            <div className="rounded-lg bg-accent-soft px-3 py-2.5 text-xs text-accent-dark">
              {activeRole.helper}
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

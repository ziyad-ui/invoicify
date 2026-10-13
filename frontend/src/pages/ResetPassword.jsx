import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell from "../components/AuthShell.jsx";
import Button from "../components/Button.jsx";
import FormField from "../components/FormField.jsx";
import { IconCheck, IconAlert } from "../components/icons.jsx";
import { useToast } from "../components/Toast.jsx";
import { authApi } from "../api/services.js";
import { parseApiError } from "../api/http.js";

function Rule({ ok, children }) {
  return (
    <li className={`flex items-center gap-2 text-xs ${ok ? "text-status-okText" : "text-gray-400"}`}>
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full ${ok ? "bg-status-okBg" : "bg-gray-100"}`}
      >
        {ok && <IconCheck width={10} height={10} />}
      </span>
      {children}
    </li>
  );
}

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const email = params.get("email") || "";
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const longEnough = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);

  async function handleSubmit(e) {
    e.preventDefault();
    const next = {};
    if (!(longEnough && hasLetter && hasNumber)) next.password = "Use at least 8 characters, with letters and numbers.";
    if (confirm !== password) next.passwordConfirmation = "The two passwords don't match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await authApi.resetPassword({ email, token, password, passwordConfirmation: confirm });
      addToast("Password reset. Sign in with your new password.", "success");
      navigate("/login", { replace: true });
    } catch (err) {
      const { message, fields } = parseApiError(err);
      setErrors(Object.keys(fields).length ? fields : { form: message });
    } finally {
      setSaving(false);
    }
  }

  // The link was opened without its token / email (or was cut off by the email client).
  if (!token || !email) {
    return (
      <AuthShell>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-overdueBg text-status-overdueText">
          <IconAlert width={24} height={24} />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink">This link isn't valid</h1>
        <p className="mt-2 text-sm text-gray-500">
          The reset link is incomplete or has already been used. Request a new one and try again.
        </p>
        <Link
          to="/forgot-password"
          className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-accent px-5 py-3 text-base font-medium text-white hover:bg-accent-dark"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight text-ink">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-gray-500">
        Resetting the password for <strong className="text-ink">{email}</strong>.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
        <div>
          <FormField
            label="New password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            suffix={
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="rounded px-1.5 py-1 text-xs font-medium text-gray-500 hover:text-ink"
              >
                {show ? "Hide" : "Show"}
              </button>
            }
          />
          <ul className="mt-3 space-y-1.5">
            <Rule ok={longEnough}>At least 8 characters</Rule>
            <Rule ok={hasLetter}>Contains a letter</Rule>
            <Rule ok={hasNumber}>Contains a number</Rule>
          </ul>
        </div>

        <FormField
          label="Confirm new password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.passwordConfirmation}
        />

        {errors.form && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errors.form}</p>}
        {errors.email && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {errors.email}{" "}
            <Link to="/forgot-password" className="font-semibold underline">
              Request a new link
            </Link>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" loading={saving}>
          Reset password
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-gray-500">
        <Link to="/login" className="font-medium text-accent hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

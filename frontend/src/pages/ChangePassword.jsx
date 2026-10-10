import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card.jsx";
import Button from "../components/Button.jsx";
import FormField from "../components/FormField.jsx";
import { useToast } from "../components/Toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { authApi } from "../api/services.js";
import { parseApiError } from "../api/http.js";

/**
 * Change-password screen for every role.
 * When the account still has a temporary password (mustChangePassword) this is the
 * only page that can be opened until a new password is set.
 */
export default function ChangePassword() {
  const { user, role, logout, markPasswordChanged } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const forced = !!user?.mustChangePassword;
  const home = role === "client" ? "/portal/dashboard" : "/dashboard";

  const [form, setForm] = useState({ currentPassword: "", password: "", passwordConfirmation: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  function validate() {
    const next = {};
    if (!form.currentPassword) next.currentPassword = forced ? "Enter the temporary password you were given." : "Enter your current password.";
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
      next.password = "Use at least 8 characters, with letters and numbers.";
    else if (form.password === form.currentPassword) next.password = "Choose a password different from the current one.";
    if (form.passwordConfirmation !== form.password) next.passwordConfirmation = "The two passwords don't match.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await authApi.changePassword(form);
      markPasswordChanged();
      addToast("Your password was updated.", "success");
      navigate(home, { replace: true });
    } catch (err) {
      const { message, fields } = parseApiError(err);
      if (Object.keys(fields).length) setErrors(fields);
      else addToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <p className="mb-4 text-center text-base font-bold text-ink">Invoicify</p>
        <Card>
          <h1 className="text-lg font-semibold text-ink">{forced ? "Set a new password" : "Change password"}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {forced
              ? "You signed in with a temporary password. Choose your own password to continue."
              : "You'll stay signed in here and be signed out on your other devices."}
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <FormField
              label={forced ? "Temporary password" : "Current password"}
              type="password"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={set("currentPassword")}
              error={errors.currentPassword}
            />
            <FormField
              label="New password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={set("password")}
              error={errors.password}
            />
            <FormField
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={form.passwordConfirmation}
              onChange={set("passwordConfirmation")}
              error={errors.passwordConfirmation}
            />
            <div className="flex items-center justify-between pt-1">
              {forced ? (
                <button type="button" onClick={logout} className="text-sm text-gray-500 underline hover:text-ink">
                  Log out
                </button>
              ) : (
                <Link to={home} className="text-sm text-gray-500 underline hover:text-ink">
                  Cancel
                </Link>
              )}
              <Button type="submit" loading={saving}>
                Update password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

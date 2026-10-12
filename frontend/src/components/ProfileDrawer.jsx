import React, { useEffect, useState } from "react";
import Drawer from "./Drawer.jsx";
import Button from "./Button.jsx";
import FormField from "./FormField.jsx";
import { useToast } from "./Toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";
import { profileApi } from "../api/services.js";
import { parseApiError } from "../api/http.js";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * Profile editor for every role (Owner, Staff, Client). Name, email and password each save straight to
 * the database through their own endpoint; email and password changes require the current password.
 */
export default function ProfileDrawer({ open, onClose }) {
  const { user, updateUser } = useAuth();
  const { t } = usePreferences();
  const { addToast } = useToast();

  const [name, setName] = useState("");
  const [nameErr, setNameErr] = useState({});
  const [email, setEmail] = useState({ email: "", currentPassword: "" });
  const [emailErr, setEmailErr] = useState({});
  const [pw, setPw] = useState({ currentPassword: "", password: "", passwordConfirmation: "" });
  const [pwErr, setPwErr] = useState({});
  const [busy, setBusy] = useState(null); // "name" | "email" | "password"

  // Start from the saved values every time the drawer opens.
  useEffect(() => {
    if (!open) return;
    setName(user?.name || "");
    setEmail({ email: user?.email || "", currentPassword: "" });
    setPw({ currentPassword: "", password: "", passwordConfirmation: "" });
    setNameErr({});
    setEmailErr({});
    setPwErr({});
  }, [open, user?.name, user?.email]);

  async function run(section, setErr, action, onOk, successKey) {
    setBusy(section);
    try {
      const res = await action();
      updateUser(res.user);
      onOk();
      addToast(t(successKey), "success");
    } catch (err) {
      const { message, fields } = parseApiError(err);
      if (Object.keys(fields).length) setErr(fields);
      else addToast(message, "error");
    } finally {
      setBusy(null);
    }
  }

  function saveName(e) {
    e.preventDefault();
    if (!name.trim()) return setNameErr({ name: "Name is required." });
    setNameErr({});
    run("name", setNameErr, () => profileApi.updateName(name.trim()), () => {}, "profile.nameSaved");
  }

  function saveEmail(e) {
    e.preventDefault();
    const next = {};
    if (!EMAIL_RE.test(email.email.trim())) next.email = "Enter a valid email address.";
    else if (email.email.trim().toLowerCase() === user?.email?.toLowerCase()) next.email = "That is already your email address.";
    if (!email.currentPassword) next.currentPassword = "Enter your current password to confirm.";
    setEmailErr(next);
    if (Object.keys(next).length) return;
    run(
      "email",
      setEmailErr,
      () => profileApi.updateEmail({ email: email.email.trim(), currentPassword: email.currentPassword }),
      () => setEmail((f) => ({ ...f, currentPassword: "" })),
      "profile.emailSaved"
    );
  }

  function savePassword(e) {
    e.preventDefault();
    const next = {};
    if (!pw.currentPassword) next.currentPassword = "Enter your current password.";
    if (pw.password.length < 8 || !/[A-Za-z]/.test(pw.password) || !/\d/.test(pw.password))
      next.password = "Use at least 8 characters, with letters and numbers.";
    else if (pw.password === pw.currentPassword) next.password = "Choose a password different from the current one.";
    if (pw.passwordConfirmation !== pw.password) next.passwordConfirmation = "The two passwords don't match.";
    setPwErr(next);
    if (Object.keys(next).length) return;
    run(
      "password",
      setPwErr,
      () => profileApi.changePassword(pw),
      () => setPw({ currentPassword: "", password: "", passwordConfirmation: "" }),
      "profile.passwordSaved"
    );
  }

  const section = "rounded-xl border border-gray-200 p-4";
  const heading = "mb-3 text-sm font-semibold text-ink";

  return (
    <Drawer open={open} onClose={onClose} title={t("profile.title")}>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-base font-semibold text-white">
          {(user?.name || "?").trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
          <p className="truncate text-xs text-gray-500">{user?.title}</p>
        </div>
      </div>

      <div className="space-y-4">
        <form className={section} onSubmit={saveName}>
          <h4 className={heading}>{t("profile.details")}</h4>
          <FormField label={t("profile.name")} value={name} onChange={(e) => setName(e.target.value)} error={nameErr.name} autoComplete="name" />
          <div className="mt-3 flex justify-end">
            <Button type="submit" size="sm" loading={busy === "name"}>
              {t("profile.saveName")}
            </Button>
          </div>
        </form>

        <form className={section} onSubmit={saveEmail}>
          <h4 className={heading}>{t("profile.emailSection")}</h4>
          <div className="space-y-3">
            <FormField
              label={t("profile.newEmail")}
              type="email"
              value={email.email}
              onChange={(e) => setEmail({ ...email, email: e.target.value })}
              error={emailErr.email}
              autoComplete="email"
            />
            <FormField
              label={t("profile.confirmWithPassword")}
              type="password"
              value={email.currentPassword}
              onChange={(e) => setEmail({ ...email, currentPassword: e.target.value })}
              error={emailErr.currentPassword}
              autoComplete="current-password"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button type="submit" size="sm" loading={busy === "email"}>
              {t("profile.updateEmail")}
            </Button>
          </div>
        </form>

        <form className={section} onSubmit={savePassword}>
          <h4 className={heading}>{t("profile.passwordSection")}</h4>
          <div className="space-y-3">
            <FormField
              label={t("profile.currentPassword")}
              type="password"
              value={pw.currentPassword}
              onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
              error={pwErr.currentPassword}
              autoComplete="current-password"
            />
            <FormField
              label={t("profile.newPassword")}
              type="password"
              value={pw.password}
              onChange={(e) => setPw({ ...pw, password: e.target.value })}
              error={pwErr.password}
              hint={t("profile.passwordHint")}
              autoComplete="new-password"
            />
            <FormField
              label={t("profile.confirmPassword")}
              type="password"
              value={pw.passwordConfirmation}
              onChange={(e) => setPw({ ...pw, passwordConfirmation: e.target.value })}
              error={pwErr.passwordConfirmation}
              autoComplete="new-password"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button type="submit" size="sm" loading={busy === "password"}>
              {t("profile.updatePassword")}
            </Button>
          </div>
        </form>
      </div>
    </Drawer>
  );
}

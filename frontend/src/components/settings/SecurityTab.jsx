import React, { useState } from "react";
import Card from "../Card.jsx";
import Button from "../Button.jsx";
import FormField from "../FormField.jsx";
import ConfirmModal from "../ConfirmModal.jsx";
import { IconDevice } from "../icons.jsx";
import { useToast } from "../Toast.jsx";
import { usePreferences } from "../../context/PreferencesContext.jsx";
import useFetch from "../../hooks/useFetch.js";
import { profileApi, sessionsApi } from "../../api/services.js";
import { parseApiError } from "../../api/http.js";
import { formatRelative } from "../../utils/format.js";

const BLANK = { currentPassword: "", password: "", passwordConfirmation: "" };

/** Change password + the list of devices that are signed in to this account. */
export default function SecurityTab() {
  const { t } = usePreferences();
  const { addToast } = useToast();
  const { data: sessions, loading, reload } = useFetch(() => sessionsApi.list(), []);

  const [pw, setPw] = useState(BLANK);
  const [pwErr, setPwErr] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [working, setWorking] = useState(null); // session id | "all"

  async function savePassword(e) {
    e.preventDefault();
    const next = {};
    if (!pw.currentPassword) next.currentPassword = "Enter your current password.";
    if (pw.password.length < 8 || !/[A-Za-z]/.test(pw.password) || !/\d/.test(pw.password))
      next.password = "Use at least 8 characters, with letters and numbers.";
    else if (pw.password === pw.currentPassword) next.password = "Choose a password different from the current one.";
    if (pw.passwordConfirmation !== pw.password) next.passwordConfirmation = "The two passwords don't match.";
    setPwErr(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await profileApi.changePassword(pw);
      setPw(BLANK);
      addToast(t("profile.passwordSaved"), "success");
      reload(); // every other device was signed out, so refresh the list
    } catch (err) {
      const { message, fields } = parseApiError(err);
      if (Object.keys(fields).length) setPwErr(fields);
      else addToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function signOut(id) {
    setWorking(id);
    try {
      await sessionsApi.revoke(id);
      addToast("Device signed out.", "success");
      reload();
    } catch (err) {
      addToast(parseApiError(err).message, "error");
    } finally {
      setWorking(null);
    }
  }

  async function signOutOthers() {
    setWorking("all");
    try {
      await sessionsApi.revokeOthers();
      addToast("Signed out of all other devices.", "success");
      setConfirmAll(false);
      reload();
    } catch (err) {
      addToast(parseApiError(err).message, "error");
    } finally {
      setWorking(null);
    }
  }

  const others = (sessions || []).filter((s) => !s.current);

  return (
    <div className="space-y-6">
      <Card title={t("profile.passwordSection")} subtitle={t("profile.passwordHint")}>
        <form onSubmit={savePassword} className="max-w-md space-y-4">
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
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={saving}>
              {t("profile.updatePassword")}
            </Button>
          </div>
        </form>
      </Card>

      <Card
        flush
        title="Where you're signed in"
        subtitle="Sign out any device you don't recognise."
        action={
          others.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setConfirmAll(true)}>
              Sign out all other devices
            </Button>
          )
        }
      >
        {loading ? (
          <p className="border-t border-gray-100 px-5 py-6 text-sm text-gray-400">Loading…</p>
        ) : (
          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {(sessions || []).map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                  <IconDevice width={18} height={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                    {s.device}
                    {s.current && (
                      <span className="rounded-full bg-status-okBg px-2 py-0.5 text-xs font-semibold text-status-okText">This device</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {s.current ? "Active now" : `Last active ${formatRelative(s.lastUsedAt)}`}
                  </p>
                </div>
                {!s.current && (
                  <Button size="sm" variant="ghost" loading={working === s.id} onClick={() => signOut(s.id)}>
                    Sign out
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmModal
        open={confirmAll}
        title="Sign out all other devices?"
        confirmLabel="Sign out"
        danger
        loading={working === "all"}
        onConfirm={signOutOthers}
        onClose={() => setConfirmAll(false)}
      >
        You'll stay signed in here. Every other phone or computer will need to sign in again.
      </ConfirmModal>
    </div>
  );
}

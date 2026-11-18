import React, { useEffect, useRef, useState } from "react";
import Card from "../Card.jsx";
import Button from "../Button.jsx";
import FormField from "../FormField.jsx";
import Avatar from "../Avatar.jsx";
import { IconCamera } from "../icons.jsx";
import { useToast } from "../Toast.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePreferences } from "../../context/PreferencesContext.jsx";
import { profileApi } from "../../api/services.js";
import { parseApiError } from "../../api/http.js";
import { imageToAvatarDataUrl } from "../../utils/image.js";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/** Profile picture, name and email. Each part saves on its own and updates the session instantly. */
export default function ProfileTab() {
  const { user, updateUser } = useAuth();
  const { t } = usePreferences();
  const { addToast } = useToast();
  const fileRef = useRef(null);

  const [name, setName] = useState("");
  const [nameErr, setNameErr] = useState({});
  const [email, setEmail] = useState({ email: "", currentPassword: "" });
  const [emailErr, setEmailErr] = useState({});
  const [busy, setBusy] = useState(null); // "avatar" | "name" | "email"

  useEffect(() => {
    setName(user?.name || "");
    setEmail({ email: user?.email || "", currentPassword: "" });
  }, [user?.name, user?.email]);

  async function run(section, setErr, action, onOk, successText) {
    setBusy(section);
    try {
      const res = await action();
      updateUser(res.user);
      onOk?.();
      addToast(successText, "success");
    } catch (err) {
      const { message, fields } = parseApiError(err);
      if (setErr && Object.keys(fields).length) setErr(fields);
      else addToast(message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function onPickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    setBusy("avatar");
    try {
      const dataUrl = await imageToAvatarDataUrl(file);
      const res = await profileApi.uploadAvatar(dataUrl);
      updateUser(res.user);
      addToast("Profile photo updated.", "success");
    } catch (err) {
      const parsed = err?.response ? parseApiError(err) : null;
      addToast(parsed ? parsed.fields.avatar || parsed.message : err.message, "error");
    } finally {
      setBusy(null);
    }
  }

  function saveName(e) {
    e.preventDefault();
    if (!name.trim()) return setNameErr({ name: "Name is required." });
    setNameErr({});
    run("name", setNameErr, () => profileApi.updateName(name.trim()), null, t("profile.nameSaved"));
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
      t("profile.emailSaved")
    );
  }

  return (
    <div className="space-y-6">
      <Card title="Profile photo" subtitle="Shown in the sidebar and menu. JPG, PNG or WebP; it's cropped to a square.">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative">
            <Avatar user={user} size={88} />
            {busy === "avatar" && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs font-medium text-white">…</span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.title}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
              <Button size="sm" variant="outline" disabled={busy === "avatar"} onClick={() => fileRef.current?.click()}>
                <IconCamera width={15} height={15} /> {user?.avatar ? "Change photo" : "Upload photo"}
              </Button>
              {user?.avatar && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === "avatar"}
                  onClick={() => run("avatar", null, () => profileApi.removeAvatar(), null, "Profile photo removed.")}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card title={t("profile.details")}>
        <form onSubmit={saveName}>
          <FormField label={t("profile.name")} value={name} onChange={(e) => setName(e.target.value)} error={nameErr.name} autoComplete="name" />
          <div className="mt-4 flex justify-end">
            <Button type="submit" size="sm" loading={busy === "name"}>
              {t("profile.saveName")}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={t("profile.emailSection")} subtitle="Changing your email needs your current password.">
        <form onSubmit={saveEmail} className="space-y-4">
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
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={busy === "email"}>
              {t("profile.updateEmail")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

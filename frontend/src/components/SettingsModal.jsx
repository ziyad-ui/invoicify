import React from "react";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";
import FormField from "./FormField.jsx";
import { IconSun, IconMoon } from "./icons.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";
import { LANGUAGES } from "../i18n/translations.js";

/** Language and Light/Dark mode. Changes apply instantly and are remembered on this device. */
export default function SettingsModal({ open, onClose }) {
  const { theme, setTheme, language, setLanguage, t } = usePreferences();

  const themeBtn = (value, label, Icon) => (
    <button
      type="button"
      onClick={() => setTheme(value)}
      aria-pressed={theme === value}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
        theme === value ? "border-accent bg-accent-soft text-accent" : "border-gray-300 text-gray-500 hover:text-ink"
      }`}
    >
      <Icon width={16} height={16} /> {label}
    </button>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("settings.title")}
      footer={<Button onClick={onClose}>{t("common.done")}</Button>}
    >
      <div className="space-y-5">
        <FormField
          as="select"
          label={t("settings.language")}
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          hint={t("settings.languageHint")}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </FormField>

        <div>
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500">
            {t("settings.appearance")}
          </span>
          <div className="flex gap-2">
            {themeBtn("light", t("settings.light"), IconSun)}
            {themeBtn("dark", t("settings.dark"), IconMoon)}
          </div>
        </div>
      </div>
    </Modal>
  );
}

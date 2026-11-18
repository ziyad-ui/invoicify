import React from "react";
import Card from "../Card.jsx";
import FormField from "../FormField.jsx";
import { IconSun, IconMoon } from "../icons.jsx";
import { usePreferences } from "../../context/PreferencesContext.jsx";
import { LANGUAGES } from "../../i18n/translations.js";

/** Language and Light/Dark mode. Changes apply instantly and are remembered on this device. */
export default function AppearanceTab() {
  const { theme, setTheme, language, setLanguage, t } = usePreferences();

  const themeBtn = (value, label, Icon) => (
    <button
      type="button"
      onClick={() => setTheme(value)}
      aria-pressed={theme === value}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors ${
        theme === value ? "border-accent bg-accent-soft text-accent" : "border-gray-300 text-gray-500 hover:text-ink"
      }`}
    >
      <Icon width={17} height={17} /> {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <Card title={t("settings.appearance")} subtitle="Switch between a light and a dark look. Saved on this device.">
        <div className="flex max-w-md gap-3">
          {themeBtn("light", t("settings.light"), IconSun)}
          {themeBtn("dark", t("settings.dark"), IconMoon)}
        </div>
      </Card>

      <Card title={t("settings.language")}>
        <div className="max-w-md">
          <FormField as="select" label={t("settings.language")} value={language} onChange={(e) => setLanguage(e.target.value)} hint={t("settings.languageHint")}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </FormField>
        </div>
      </Card>
    </div>
  );
}

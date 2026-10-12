import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translations } from "../i18n/translations.js";

/**
 * Per-device display preferences chosen in Settings (hamburger menu):
 *  - theme: "light" | "dark"  -> toggles the `dark` class on <html>
 *  - language: "en" | "fil"   -> t("key") looks the string up, falling back to English
 * Stored in localStorage; they are about this browser, not the account.
 */
const THEME_KEY = "invoicify_theme";
const LANG_KEY = "invoicify_lang";

const PreferencesContext = createContext(null);

function readStored(key, allowed, fallback) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function store(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode etc. — the preference just won't persist */
  }
}

export function PreferencesProvider({ children }) {
  const [theme, setThemeState] = useState(() => readStored(THEME_KEY, ["light", "dark"], "light"));
  const [language, setLanguageState] = useState(() => readStored(LANG_KEY, Object.keys(translations), "en"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language === "fil" ? "fil" : "en";
  }, [language]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    store(THEME_KEY, next);
  }, []);

  const setLanguage = useCallback((next) => {
    setLanguageState(next);
    store(LANG_KEY, next);
  }, []);

  const t = useCallback(
    (key, vars) => {
      let text = translations[language]?.[key] ?? translations.en[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, value);
      }
      return text;
    },
    [language]
  );

  const value = useMemo(
    () => ({ theme, setTheme, language, setLanguage, t }),
    [theme, setTheme, language, setLanguage, t]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}

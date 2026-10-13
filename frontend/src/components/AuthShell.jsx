import React from "react";
import Logo, { LogoMark } from "./Logo.jsx";
import { IconCheck } from "./icons.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";
import { LANGUAGES } from "../i18n/translations.js";

/**
 * Shared frame for the signed-out screens (sign in, forgot / reset / change password):
 * a brand panel on the left (desktop) and the form on the right.
 */
export default function AuthShell({ children, wide = false }) {
  const { t, language, setLanguage } = usePreferences();
  const features = [t("auth.feature1"), t("auth.feature2"), t("auth.feature3")];

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="relative hidden w-[46%] max-w-[640px] flex-shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-ink via-ink-soft to-accent-dark p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />

        <div className="relative">
          <Logo size={40} tagline="Love Realty" />
        </div>

        <div className="relative">
          <h2 className="max-w-md text-4xl font-bold leading-tight tracking-tight">{t("auth.brandTitle")}</h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">{t("auth.brandBody")}</p>
          <ul className="mt-8 space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-indigo-300">
                  <IconCheck width={14} height={14} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Love Realty · Tagum City</p>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className={`w-full ${wide ? "max-w-md" : "max-w-sm"}`}>
            <div className="mb-8 flex items-center gap-2.5 lg:hidden">
              <LogoMark size={36} />
              <span className="text-lg font-bold text-ink">Invoicify</span>
            </div>
            {children}
          </div>
        </div>
        <div className="flex justify-center gap-4 px-6 pb-6 text-xs text-gray-400">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLanguage(l.code)}
              className={language === l.code ? "font-semibold text-ink" : "hover:text-ink"}
            >
              {l.label}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

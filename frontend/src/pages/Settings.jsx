import React from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import ProfileTab from "../components/settings/ProfileTab.jsx";
import AppearanceTab from "../components/settings/AppearanceTab.jsx";
import SecurityTab from "../components/settings/SecurityTab.jsx";
import PortalTab from "../components/settings/PortalTab.jsx";
import { IconUser, IconSun, IconLock, IconMegaphone } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { usePreferences } from "../context/PreferencesContext.jsx";

/**
 * One Settings page for every role (the tab is kept in the URL: /settings?tab=security).
 * Owners also get "Client portal"; everything else is personal to the signed-in user.
 */
export default function Settings() {
  const { role } = useAuth();
  const { t } = usePreferences();
  const [params, setParams] = useSearchParams();

  const tabs = [
    { key: "profile", label: t("settings.tab.profile"), icon: IconUser, Panel: ProfileTab },
    { key: "appearance", label: t("settings.tab.appearance"), icon: IconSun, Panel: AppearanceTab },
    { key: "security", label: t("settings.tab.security"), icon: IconLock, Panel: SecurityTab },
    ...(role === "owner" ? [{ key: "portal", label: t("settings.tab.portal"), icon: IconMegaphone, Panel: PortalTab }] : []),
  ];

  const requested = params.get("tab");
  const active = tabs.find((x) => x.key === requested) || tabs[0];
  const Panel = active.Panel;

  return (
    <div>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav role="tablist" aria-orientation="vertical" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {tabs.map(({ key, label, icon: Icon }) => {
            const selected = key === active.key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={selected}
                onClick={() => setParams({ tab: key }, { replace: true })}
                className={`flex flex-shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  selected ? "bg-accent-soft text-accent" : "text-gray-500 hover:bg-gray-100 hover:text-ink"
                }`}
              >
                <Icon width={17} height={17} />
                {label}
              </button>
            );
          })}
        </nav>

        <div key={active.key} className="min-w-0 animate-fade-in">
          <Panel />
        </div>
      </div>
    </div>
  );
}

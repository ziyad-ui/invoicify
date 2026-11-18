import React from "react";
import { Link } from "react-router-dom";
import Card from "../Card.jsx";
import { usePreferences } from "../../context/PreferencesContext.jsx";

// Bar colour follows the account's status so trouble stands out at a glance.
const BAR = { Overdue: "#E24B4A", "Due Soon": "#EF9F27" };

/** Owner dashboard: installments paid vs. term for each client still paying. */
export default function PlanProgress({ rows }) {
  const { t } = usePreferences();

  return (
    <Card
      title={t("dash.progress")}
      action={
        <Link to="/clients" className="text-xs font-medium text-accent hover:underline">
          {t("dash.allClients")}
        </Link>
      }
    >
      {rows.length === 0 ? (
        <p className="py-4 text-sm text-gray-400">{t("dash.noProgress")}</p>
      ) : (
        <ul>
          {rows.map((r, i) => {
            const pct = r.term ? Math.min(100, Math.round((r.paid / r.term) * 100)) : 0;
            return (
              <li key={r.id} className={`flex items-center gap-3 py-3 ${i > 0 ? "border-t border-gray-100" : ""}`}>
                <Link to={`/clients/${r.id}`} className="w-28 flex-shrink-0 truncate text-sm font-medium text-ink hover:underline sm:w-36">
                  {r.name}
                </Link>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: BAR[r.status] || "#4F46E5" }} />
                </div>
                <span className="num w-12 flex-shrink-0 text-right text-xs text-gray-500">
                  {r.paid}/{r.term}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

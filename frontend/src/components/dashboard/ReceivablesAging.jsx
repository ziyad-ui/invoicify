import React from "react";
import Card from "../Card.jsx";
import { usePreferences } from "../../context/PreferencesContext.jsx";
import { formatCurrency } from "../../utils/format.js";

/**
 * Owner dashboard: how much is still owed, split by how late it is.
 *  aging     { notDue, days1to30, days31to60, days60plus, total, expectedThisMonth }
 *  collected what has been paid so far this month
 */
export default function ReceivablesAging({ aging, collected }) {
  const { t } = usePreferences();

  const buckets = [
    { key: "notDue", label: t("dash.notDue"), color: "#9CA3AF" },
    { key: "days1to30", label: "1–30 days", color: "#EF9F27" },
    { key: "days31to60", label: "31–60 days", color: "#D85A30" },
    { key: "days60plus", label: "60+ days", color: "#A32D2D" },
  ];

  return (
    <Card
      title={t("dash.aging")}
      action={<span className="num text-xs text-gray-400">{t("dash.agingTotal", { amount: formatCurrency(aging.total) })}</span>}
    >
      {aging.total > 0 ? (
        <>
          <div className="flex h-5 gap-0.5 overflow-hidden rounded" role="img" aria-label={t("dash.aging")}>
            {buckets
              .filter((b) => aging[b.key] > 0)
              .map((b) => (
                <div key={b.key} style={{ flex: `${aging[b.key]} 0 0`, background: b.color }} title={`${b.label}: ${formatCurrency(aging[b.key])}`} />
              ))}
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
            {buckets.map((b) => (
              <li key={b.key} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-sm" style={{ background: b.color }} />
                <span className="truncate">
                  {b.label} · <span className="num font-medium text-ink">{formatCurrency(aging[b.key])}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="py-4 text-sm text-gray-400">{t("dash.noneOwed")}</p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">{t("dash.expectedMonth")}</p>
          <p className="num mt-1.5 text-lg font-semibold text-ink">{formatCurrency(aging.expectedThisMonth)}</p>
        </div>
        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">{t("dash.collectedMonth")}</p>
          <p className="num mt-1.5 text-lg font-semibold text-ink">{formatCurrency(collected)}</p>
        </div>
      </div>
    </Card>
  );
}

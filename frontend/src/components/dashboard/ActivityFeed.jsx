import React from "react";
import { Link } from "react-router-dom";
import Card from "../Card.jsx";
import { IconCheck, IconBell, IconAlert, IconClients } from "../icons.jsx";
import { usePreferences } from "../../context/PreferencesContext.jsx";
import { formatCurrency, formatRelative } from "../../utils/format.js";

const KINDS = {
  payment: { icon: IconCheck, tone: "bg-status-okBg text-status-okText" },
  reminder: { icon: IconBell, tone: "bg-accent-soft text-accent" },
  overdue: { icon: IconAlert, tone: "bg-status-overdueBg text-status-overdueText" },
  client: { icon: IconClients, tone: "bg-accent-soft text-accent" },
};

function titleFor(e) {
  switch (e.type) {
    case "payment":
      return `Payment of ${formatCurrency(e.amount)} recorded`;
    case "reminder":
      return e.detail === "Overdue Notice" ? "Overdue notice emailed" : "Reminder emailed";
    case "overdue":
      return `Invoice ${e.detail} became overdue`;
    default:
      return "New client added";
  }
}

/** Owner dashboard: newest-first mix of payments, reminder emails, overdue invoices and new clients. */
export default function ActivityFeed({ events }) {
  const { t } = usePreferences();

  return (
    <Card title={t("dash.activity")}>
      {events.length === 0 ? (
        <p className="py-4 text-sm text-gray-400">{t("dash.noActivity")}</p>
      ) : (
        <ul className="-my-1.5">
          {events.map((e, i) => {
            const { icon: Icon, tone } = KINDS[e.type] || KINDS.client;
            return (
              <li key={`${e.type}-${e.clientId}-${e.at}-${i}`} className="flex items-start gap-3 py-2.5">
                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${tone}`}>
                  <Icon width={15} height={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{titleFor(e)}</p>
                  <p className="truncate text-xs text-gray-500">
                    {e.clientName ? (
                      <Link to={`/clients/${e.clientId}`} className="hover:text-ink hover:underline">
                        {e.clientName}
                      </Link>
                    ) : (
                      "—"
                    )}{" "}
                    · {formatRelative(e.at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

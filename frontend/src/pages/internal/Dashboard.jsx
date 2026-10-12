import React from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import StatCard from "../../components/StatCard.jsx";
import Card from "../../components/Card.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import BarChart from "../../components/BarChart.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import useFetch from "../../hooks/useFetch.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePreferences } from "../../context/PreferencesContext.jsx";
import { dashboardApi } from "../../api/services.js";
import { formatCurrency, formatDate } from "../../utils/format.js";

// GET /api/dashboard — owners receive revenue figures + monthly chart;
// staff receive operational counts + the follow-up list only.
export default function Dashboard() {
  const { role } = useAuth();
  const { t } = usePreferences();
  const { data, loading, error, reload } = useFetch(() => dashboardApi.get(), []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingState label="Loading dashboard…" />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <PageHeader title={t("dash.title")} />
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  const { stats, clients = [], monthlyCollections = [], period } = data;

  return (
    <div>
      <PageHeader title={t("dash.title")} />

      {role === "owner" ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label={t("dash.revenuePerMonth")}
              value={formatCurrency(stats.revenueThisMonth)}
              hint={period}
              tone="dark"
            />
            <StatCard label={t("dash.outstanding")} value={formatCurrency(stats.outstandingBalance)} />
            <StatCard label={t("dash.activeClients")} value={stats.activeClients} />
            <StatCard label={t("dash.pending")} value={stats.pendingPayments} />
          </div>

          <Card title={t("dash.monthly")} className="mt-6">
            <BarChart data={monthlyCollections} />
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label={t("dash.activeClients")} value={stats.activeClients} />
            <StatCard label={t("dash.pending")} value={stats.pendingPayments} />
            <StatCard label={t("dash.overdue")} value={stats.overdueAccounts} />
            <StatCard label={t("dash.dueSoon")} value={stats.dueSoon} />
          </div>

          <Card title={t("dash.followUp")} className="mt-6">
            {clients.length === 0 ? (
              <p className="text-sm text-gray-400">{t("dash.allCurrent")}</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {clients.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{c.name}</p>
                      <p className="text-xs text-gray-500">
                        {c.property?.name} · Due {formatDate(c.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="num text-sm font-medium">{formatCurrency(c.balance)}</span>
                      <StatusBadge status={c.status} />
                      <Link to={`/clients/${c.id}`} className="text-xs font-medium text-accent hover:underline">
                        View
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

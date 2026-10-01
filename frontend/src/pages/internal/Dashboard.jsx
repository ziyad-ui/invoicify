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
import { dashboardApi } from "../../api/services.js";
import { formatCurrency, formatDate } from "../../utils/format.js";

// GET /api/dashboard — owners receive revenue figures + monthly chart;
// staff receive operational counts + the follow-up list only.
export default function Dashboard() {
  const { role } = useAuth();
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
        <PageHeader title="Dashboard" />
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  const { stats, clients, monthlyCollections } = data;

  return (
    <div>
      <PageHeader title="Dashboard" />

      {role === "owner" ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Revenue Collected" value={formatCurrency(stats.revenueCollected)} tone="dark" />
            <StatCard label="Outstanding Balance" value={formatCurrency(stats.outstandingBalance)} />
            <StatCard label="Active Clients" value={stats.activeClients} />
            <StatCard label="Pending Payments" value={stats.pendingPayments} />
          </div>

          <Card title="Monthly Collections" className="mt-6">
            <BarChart data={monthlyCollections} />
          </Card>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Active Clients" value={stats.activeClients} />
          <StatCard label="Pending Payments" value={stats.pendingPayments} />
          <StatCard label="Overdue Accounts" value={stats.overdueAccounts} />
          <StatCard label="Due Soon" value={stats.dueSoon} />
        </div>
      )}

      <Card title={role === "owner" ? "Status Overview" : "Needs Follow-up"} className="mt-6">
        {role === "owner" ? (
          clients.length === 0 ? (
            <p className="text-sm text-gray-400">No clients yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {clients.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 py-1 pl-3 pr-1 text-xs"
                >
                  {c.name} <StatusBadge status={c.status} />
                </span>
              ))}
            </div>
          )
        ) : clients.length === 0 ? (
          <p className="text-sm text-gray-400">Every account is current. Nothing needs follow-up.</p>
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
    </div>
  );
}

import React from "react";
import Card from "../../components/Card.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import useFetch from "../../hooks/useFetch.js";
import { portalApi } from "../../api/services.js";
import { formatCurrency, formatDate } from "../../utils/format.js";

function Details({ rows }) {
  return (
    <dl className="divide-y divide-gray-100 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 py-3">
          <dt className="text-gray-500">{label}</dt>
          <dd className="num text-right font-medium text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function PortalProfile() {
  const { data: client, loading, error, reload } = useFetch(() => portalApi.me(), []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingState label="Loading your profile…" />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const initials = (client.name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div className="space-y-6">
      <PageHeader title="Account details" subtitle="Your property and installment plan on file with Love Realty." />

      <div className="flex flex-wrap items-center gap-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-accent-dark text-xl font-bold text-white">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="truncate text-lg font-semibold text-ink">{client.name}</h2>
            <StatusBadge status={client.status} />
          </div>
          <p className="mt-1 truncate text-sm text-gray-500">{client.email}</p>
          <p className="num mt-0.5 text-sm text-gray-500">{client.phone || "No phone on file"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Property">
          <Details
            rows={[
              ["Property", client.property?.name || "—"],
              ["Type", client.property?.type || "—"],
              ["Total contract price", formatCurrency(client.property?.totalPrice || 0)],
            ]}
          />
        </Card>
        <Card title="Installment plan">
          <Details
            rows={[
              ["Monthly installment", formatCurrency(client.plan?.monthly || 0)],
              ["Term", client.plan ? `${client.plan.termMonths} months` : "—"],
              ["Plan start date", formatDate(client.plan?.startDate)],
            ]}
          />
        </Card>
      </div>

      <p className="text-xs text-gray-400">
        You can change your name, email and password from the menu (☰) → Profile. For property or plan details, contact
        your Love Realty account officer.
      </p>
    </div>
  );
}

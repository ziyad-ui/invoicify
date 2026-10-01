import React from "react";
import Card from "../../components/Card.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import useFetch from "../../hooks/useFetch.js";
import { portalApi } from "../../api/services.js";
import { formatCurrency, formatDate } from "../../utils/format.js";

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

  const rows = [
    ["Full name", client.name],
    ["Email address", client.email],
    ["Phone", client.phone || "—"],
    ["Property", client.property?.name],
    ["Property type", client.property?.type],
    ["Total contract price", formatCurrency(client.property?.totalPrice || 0)],
    ["Monthly installment", formatCurrency(client.plan?.monthly || 0)],
    ["Plan start date", formatDate(client.plan?.startDate)],
    ["Term", client.plan ? `${client.plan.termMonths} months` : "—"],
  ];

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your account and property details on file with Love Realty." />
      <Card>
        <dl className="divide-y divide-gray-100 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-3">
              <dt className="text-gray-500">{label}</dt>
              <dd className="num font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <p className="mt-4 text-xs text-gray-400">
        To update any of this information, contact your Love Realty account officer.
      </p>
    </div>
  );
}

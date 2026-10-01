import React from "react";
import { Link } from "react-router-dom";
import Card from "../../components/Card.jsx";
import Table from "../../components/Table.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import useFetch from "../../hooks/useFetch.js";
import { portalApi } from "../../api/services.js";
import { formatCurrency, formatDate } from "../../utils/format.js";

// GET /api/portal/me — the API only ever returns the signed-in client's own record.
export default function PortalDashboard() {
  const { data: client, loading, error, reload } = useFetch(() => portalApi.me(), []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingState label="Loading your account…" />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const columns = [
    { key: "date", header: "Date", render: (r) => <span className="num">{formatDate(r.date)}</span> },
    { key: "amount", header: "Amount", render: (r) => <span className="num">{formatCurrency(r.amount)}</span> },
    { key: "reference", header: "Reference No.", render: (r) => <span className="num">{r.reference || "—"}</span> },
    { key: "type", header: "Type" },
  ];

  return (
    <div>
      <div className="rounded-xl bg-ink p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/50">Outstanding Balance</p>
            <p className="num mt-2 text-3xl font-semibold">{formatCurrency(client.balance)}</p>
          </div>
          <StatusBadge status={client.status} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Property</p>
          <p className="mt-2 text-sm font-semibold text-ink">{client.property?.name}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next Due Date</p>
          <p className="num mt-2 text-sm font-semibold text-ink">{formatDate(client.dueDate)}</p>
        </Card>
      </div>

      <Card
        title="Payment History"
        className="mt-6"
        action={
          client.payments.length > 5 && (
            <Link to="/portal/payments" className="text-xs font-medium text-accent hover:underline">
              View all
            </Link>
          )
        }
      >
        <Table
          columns={columns}
          rows={client.payments.slice(0, 5)}
          emptyTitle="No payments yet"
          emptyBody="Once a payment is recorded by Love Realty staff, it will appear here."
        />
      </Card>

      <div className="mt-6 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
        To settle your balance, pay via bank transfer, check, or in person at the Love Realty
        office, then send your receipt to your account officer for recording. Payments are
        confirmed here once verified by staff.
      </div>
    </div>
  );
}

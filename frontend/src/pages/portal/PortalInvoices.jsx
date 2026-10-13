import React, { useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import Card from "../../components/Card.jsx";
import Table from "../../components/Table.jsx";
import StatTile from "../../components/StatTile.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { IconInvoice, IconCheck, IconAlert } from "../../components/icons.jsx";
import useFetch from "../../hooks/useFetch.js";
import { portalApi } from "../../api/services.js";
import { formatCurrency, formatDate } from "../../utils/format.js";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unpaid", label: "Unpaid" },
  { key: "paid", label: "Paid" },
];

export default function PortalInvoices() {
  const { data: client, loading, error, reload } = useFetch(() => portalApi.me(), []);
  const [filter, setFilter] = useState("all");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingState label="Loading your invoices…" />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const all = client.invoices || [];
  const paid = all.filter((i) => i.status === "Paid");
  const unpaid = all.filter((i) => i.status !== "Paid");
  const overdue = all.filter((i) => i.status === "Overdue");
  const rows = filter === "paid" ? paid : filter === "unpaid" ? unpaid : all;

  const columns = [
    { key: "id", header: "Invoice #", render: (r) => <span className="num font-medium text-ink">{r.id}</span> },
    {
      key: "installment",
      header: "Installment",
      render: (r) => (
        <span className="num text-gray-600">
          {r.installment} of {client.plan?.termMonths}
        </span>
      ),
    },
    { key: "period", header: "Period" },
    { key: "amount", header: "Amount", render: (r) => <span className="num font-medium">{formatCurrency(r.amount)}</span> },
    { key: "dueDate", header: "Due date", render: (r) => <span className="num">{formatDate(r.dueDate)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices & installment schedule"
        subtitle={`${client.property?.name} · ${formatCurrency(client.plan?.monthly || 0)} / month`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={IconInvoice} label="Total invoices" value={all.length} />
        <StatTile icon={IconCheck} label="Paid" value={paid.length} hint={`${unpaid.length} remaining`} />
        <StatTile
          icon={IconAlert}
          label="Overdue"
          value={overdue.length}
          hint={overdue.length ? "Please settle as soon as you can" : "You're up to date"}
        />
      </div>

      <Card flush title="Schedule" action={
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === f.key ? "bg-white text-ink shadow-sm" : "text-gray-500 hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      }>
        <Table
          flush
          columns={columns}
          rows={rows}
          emptyTitle="No invoices here"
          emptyBody="Invoices for your installment plan will appear here once issued."
        />
      </Card>
    </div>
  );
}

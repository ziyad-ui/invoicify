import React from "react";
import PageHeader from "../../components/PageHeader.jsx";
import Card from "../../components/Card.jsx";
import Table from "../../components/Table.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import useFetch from "../../hooks/useFetch.js";
import { portalApi } from "../../api/services.js";
import { formatCurrency, formatDate } from "../../utils/format.js";

export default function PortalInvoices() {
  const { data: client, loading, error, reload } = useFetch(() => portalApi.me(), []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingState label="Loading your invoices…" />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const columns = [
    { key: "id", header: "Invoice #", render: (r) => <span className="num">{r.id}</span> },
    { key: "installment", header: "No.", render: (r) => <span className="num">{r.installment}/{client.plan?.termMonths}</span> },
    { key: "period", header: "Period" },
    { key: "amount", header: "Amount", render: (r) => <span className="num">{formatCurrency(r.amount)}</span> },
    { key: "dueDate", header: "Due Date", render: (r) => <span className="num">{formatDate(r.dueDate)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Invoices & Installment Schedule"
        subtitle={`${client.property?.name} · ${formatCurrency(client.plan?.monthly || 0)} / month`}
      />
      <Card>
        <Table
          columns={columns}
          rows={client.invoices}
          emptyTitle="No invoices yet"
          emptyBody="Invoices for your installment plan will appear here once issued."
        />
      </Card>
    </div>
  );
}

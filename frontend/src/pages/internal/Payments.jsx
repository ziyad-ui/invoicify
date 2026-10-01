import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import Card from "../../components/Card.jsx";
import Table from "../../components/Table.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Button from "../../components/Button.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import useFetch from "../../hooks/useFetch.js";
import { clientsApi, paymentsApi } from "../../api/services.js";
import { formatCurrency, formatDate } from "../../utils/format.js";

export default function Payments() {
  const [tab, setTab] = useState("pending");

  // Pending = clients who are Overdue or Due Soon; History = every recorded payment.
  const { data: rows, loading, error, reload } = useFetch(
    () => (tab === "pending" ? clientsApi.list({ status: "Overdue,Due Soon" }) : paymentsApi.list()),
    [tab]
  );

  const pendingColumns = [
    { key: "name", header: "Client", render: (c) => <span className="font-medium text-ink">{c.name}</span> },
    { key: "property", header: "Property", render: (c) => <span className="text-accent">{c.property?.name}</span> },
    { key: "balance", header: "Balance", render: (c) => <span className="num">{formatCurrency(c.balance)}</span> },
    { key: "dueDate", header: "Due Date", render: (c) => <span className="num">{formatDate(c.dueDate)}</span> },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <Link to={`/clients/${c.id}`}>
          <Button size="sm" variant="outline">
            Record Payment
          </Button>
        </Link>
      ),
    },
  ];

  const historyColumns = [
    { key: "date", header: "Date", render: (r) => <span className="num">{formatDate(r.date)}</span> },
    {
      key: "clientName",
      header: "Client",
      render: (r) => (
        <Link to={`/clients/${r.clientId}`} className="font-medium text-ink hover:text-accent">
          {r.clientName}
        </Link>
      ),
    },
    { key: "amount", header: "Amount", render: (r) => <span className="num">{formatCurrency(r.amount)}</span> },
    { key: "mode", header: "Mode" },
    { key: "reference", header: "Reference No.", render: (r) => <span className="num">{r.reference || "—"}</span> },
    { key: "receiptNumber", header: "Receipt", render: (r) => <span className="num">{r.receiptNumber}</span> },
    { key: "type", header: "Type" },
  ];

  const tabClass = (name) =>
    `rounded-md px-3 py-1.5 font-medium transition-colors ${
      tab === name ? "bg-white text-ink shadow-sm" : "text-gray-500 hover:text-ink"
    }`;

  return (
    <div>
      <PageHeader title="Payments" />

      <div className="mb-4 flex w-fit gap-1 rounded-lg bg-gray-100 p-1 text-sm">
        <button onClick={() => setTab("pending")} className={tabClass("pending")}>
          Pending Payments
        </button>
        <button onClick={() => setTab("history")} className={tabClass("history")}>
          Payment History
        </button>
      </div>

      <Card>
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : tab === "pending" ? (
          <Table
            columns={pendingColumns}
            rows={rows || []}
            loading={loading}
            emptyTitle="No accounts need attention"
            emptyBody="Every client is current on their installments."
          />
        ) : (
          <Table
            columns={historyColumns}
            rows={rows || []}
            loading={loading}
            emptyTitle="No payments recorded yet"
            emptyBody="Recorded payments will show up here as a full transaction history."
          />
        )}
      </Card>
    </div>
  );
}

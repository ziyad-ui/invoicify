import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import Card from "../../components/Card.jsx";
import Table from "../../components/Table.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import useFetch from "../../hooks/useFetch.js";
import { invoicesApi } from "../../api/services.js";
import { formatCurrency, formatDate } from "../../utils/format.js";

const FILTERS = ["All", "Overdue", "Due Soon", "Upcoming", "Paid"];

export default function Invoices() {
  const [filter, setFilter] = useState("All");
  const { data: rows, loading, error, reload } = useFetch(
    () => invoicesApi.list(filter === "All" ? {} : { status: filter }),
    [filter]
  );

  const columns = [
    { key: "id", header: "Invoice #", render: (r) => <span className="num">{r.id}</span> },
    {
      key: "clientName",
      header: "Client",
      render: (r) => (
        <Link to={`/clients/${r.clientId}`} className="font-medium text-ink hover:text-accent">
          {r.clientName}
        </Link>
      ),
    },
    { key: "period", header: "Period" },
    { key: "amount", header: "Amount", render: (r) => <span className="num">{formatCurrency(r.amount)}</span> },
    { key: "paidAmount", header: "Paid", render: (r) => <span className="num">{formatCurrency(r.paidAmount)}</span> },
    { key: "dueDate", header: "Due Date", render: (r) => <span className="num">{formatDate(r.dueDate)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Installment invoices generated for every client." />

      <Card>
        <div className="mb-4 flex w-fit gap-1 rounded-lg bg-gray-100 p-1 text-sm">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                filter === f ? "bg-white text-ink shadow-sm" : "text-gray-500 hover:text-ink"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Table
            columns={columns}
            rows={rows || []}
            loading={loading}
            emptyTitle="No invoices in this view"
            emptyBody="Try a different filter."
          />
        )}
      </Card>
    </div>
  );
}

import React, { useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import Card from "../../components/Card.jsx";
import StatCard from "../../components/StatCard.jsx";
import LineChart from "../../components/LineChart.jsx";
import Table from "../../components/Table.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Button from "../../components/Button.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { IconDownload } from "../../components/icons.jsx";
import { useToast } from "../../components/Toast.jsx";
import useFetch from "../../hooks/useFetch.js";
import { reportsApi } from "../../api/services.js";
import { parseApiError } from "../../api/http.js";
import { formatCurrency } from "../../utils/format.js";

// Owner-only. GET /api/reports/summary for the numbers,
// GET /api/reports/export for the Excel workbook.
export default function Reports() {
  const { data, loading, error, reload } = useFetch(() => reportsApi.summary(), []);
  const [exporting, setExporting] = useState(false);
  const { addToast } = useToast();

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await reportsApi.exportXlsx();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoicify-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast("Report downloaded.", "success");
    } catch (err) {
      addToast(parseApiError(err).message, "error");
    } finally {
      setExporting(false);
    }
  }

  const columns = [
    { key: "name", header: "Client", render: (c) => <span className="font-medium text-ink">{c.name}</span> },
    { key: "collected", header: "Total Collected", className: "text-right", render: (c) => <span className="num">{formatCurrency(c.collected)}</span> },
    { key: "balance", header: "Outstanding", className: "text-right", render: (c) => <span className="num">{formatCurrency(c.balance)}</span> },
    { key: "status", header: "Status", className: "pl-6", render: (c) => <StatusBadge status={c.status} /> },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingState label="Loading reports…" />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <PageHeader title="Reports" />
        <ErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  const { stats, monthlyCollections, clients } = data;

  return (
    <div>
      <PageHeader
        title="Reports"
        action={
          <Button variant="outline" onClick={handleExport} loading={exporting}>
            <IconDownload width={16} height={16} /> Export Excel
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Revenue Collected" value={formatCurrency(stats.revenueCollected)} tone="dark" />
        <StatCard label="Outstanding Balance" value={formatCurrency(stats.outstandingBalance)} />
        <StatCard label="Overdue Accounts" value={stats.overdueAccounts} />
      </div>

      <Card title="Monthly Collection Summary" className="mt-6">
        <LineChart data={monthlyCollections} />
      </Card>

      <Card title="Per-Client Performance" className="mt-6">
        <Table columns={columns} rows={clients} emptyTitle="No clients yet" />
      </Card>
    </div>
  );
}

import React, { useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import Card from "../../components/Card.jsx";
import Table from "../../components/Table.jsx";
import Button from "../../components/Button.jsx";
import Modal from "../../components/Modal.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { IconCheck } from "../../components/icons.jsx";
import useFetch from "../../hooks/useFetch.js";
import { portalApi } from "../../api/services.js";
import { formatCurrency, formatDate } from "../../utils/format.js";

export default function PortalPayments() {
  const { data: client, loading, error, reload } = useFetch(() => portalApi.me(), []);
  const [receipt, setReceipt] = useState(null);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingState label="Loading your payments…" />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const columns = [
    { key: "date", header: "Date", render: (r) => <span className="num">{formatDate(r.date)}</span> },
    { key: "amount", header: "Amount", render: (r) => <span className="num">{formatCurrency(r.amount)}</span> },
    { key: "reference", header: "Reference No.", render: (r) => <span className="num">{r.reference || "—"}</span> },
    { key: "type", header: "Type" },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => setReceipt(r)}>
          View Receipt
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Payment History" subtitle="Every verified payment recorded on your account." />
      <Card>
        <Table
          columns={columns}
          rows={client.payments}
          emptyTitle="No payments yet"
          emptyBody="Your payment history and digital receipts will appear here."
        />
      </Card>

      <Modal
        open={!!receipt}
        onClose={() => setReceipt(null)}
        title="Digital Receipt"
        footer={
          <Button variant="outline" onClick={() => setReceipt(null)}>
            Close
          </Button>
        }
      >
        {receipt && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2 rounded-lg bg-status-okBg px-3 py-2 text-status-okText">
              <IconCheck width={16} height={16} />
              Payment verified by Love Realty staff
            </div>
            <dl className="divide-y divide-gray-100">
              {[
                ["Receipt No.", receipt.receiptNumber],
                ["Client", client.name],
                ["Property", client.property?.name],
                ["Amount", formatCurrency(receipt.amount)],
                ["Date", formatDate(receipt.date)],
                ["Mode", receipt.mode],
                ["Reference No.", receipt.reference || "—"],
                ["Type", receipt.type],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="num font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {receipt.allocations?.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Applied to</p>
                <ul className="space-y-1">
                  {receipt.allocations.map((a) => (
                    <li key={a.invoice} className="flex justify-between">
                      <span className="num">{a.invoice}</span>
                      <span className="num">{formatCurrency(a.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

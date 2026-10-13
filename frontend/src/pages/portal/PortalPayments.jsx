import React, { useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import Card from "../../components/Card.jsx";
import Table from "../../components/Table.jsx";
import Button from "../../components/Button.jsx";
import Modal from "../../components/Modal.jsx";
import StatTile from "../../components/StatTile.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { LogoMark } from "../../components/Logo.jsx";
import { IconCheck, IconPayments, IconInvoice, IconEye } from "../../components/icons.jsx";
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

  const payments = client.payments || [];
  const total = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const columns = [
    { key: "date", header: "Date", render: (r) => <span className="num">{formatDate(r.date)}</span> },
    { key: "amount", header: "Amount", render: (r) => <span className="num font-medium text-ink">{formatCurrency(r.amount)}</span> },
    { key: "reference", header: "Reference No.", render: (r) => <span className="num text-gray-600">{r.reference || "—"}</span> },
    { key: "type", header: "Type" },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => setReceipt(r)}>
          <IconEye width={14} height={14} /> Receipt
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Payment history" subtitle="Every verified payment recorded on your account." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={IconPayments} label="Total paid" value={formatCurrency(total)} />
        <StatTile icon={IconInvoice} label="Payments made" value={payments.length} />
        <StatTile icon={IconCheck} label="Last payment" value={payments[0] ? formatDate(payments[0].date) : "—"} />
      </div>

      <Card flush title="Payments">
        <Table
          flush
          columns={columns}
          rows={payments}
          emptyTitle="No payments yet"
          emptyBody="Your payment history and digital receipts will appear here."
        />
      </Card>

      <Modal
        open={!!receipt}
        onClose={() => setReceipt(null)}
        title="Digital receipt"
        footer={
          <Button variant="outline" onClick={() => setReceipt(null)}>
            Close
          </Button>
        }
      >
        {receipt && (
          <div className="space-y-5 text-sm">
            <div className="rounded-xl bg-gray-50 px-4 py-5 text-center">
              <LogoMark size={36} className="mx-auto" />
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Amount paid</p>
              <p className="num mt-1 text-3xl font-semibold text-ink">{formatCurrency(receipt.amount)}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-status-okBg px-3 py-1 text-xs font-semibold text-status-okText">
                <IconCheck width={13} height={13} /> Verified by Love Realty staff
              </span>
            </div>

            <dl className="divide-y divide-gray-100">
              {[
                ["Receipt No.", receipt.receiptNumber],
                ["Client", client.name],
                ["Property", client.property?.name],
                ["Date", formatDate(receipt.date)],
                ["Mode", receipt.mode],
                ["Reference No.", receipt.reference || "—"],
                ["Type", receipt.type],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="num text-right font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            {receipt.allocations?.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Applied to</p>
                <ul className="space-y-1.5 rounded-lg border border-gray-100 p-3">
                  {receipt.allocations.map((a) => (
                    <li key={a.invoice} className="flex justify-between">
                      <span className="num text-gray-600">{a.invoice}</span>
                      <span className="num font-medium">{formatCurrency(a.amount)}</span>
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

import React, { useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import Card from "../../components/Card.jsx";
import Table from "../../components/Table.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Button from "../../components/Button.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { useToast } from "../../components/Toast.jsx";
import useFetch from "../../hooks/useFetch.js";
import { notificationsApi } from "../../api/services.js";
import { parseApiError } from "../../api/http.js";

// Log of emails sent by the backend (receipts on payment; reminders and
// overdue notices from the daily scheduled job). "Resend" re-sends one.
export default function Notifications() {
  const { data: items, loading, error, reload } = useFetch(() => notificationsApi.list(), []);
  const [resendingId, setResendingId] = useState(null);
  const { addToast } = useToast();

  async function handleResend(item) {
    setResendingId(item.id);
    try {
      const log = await notificationsApi.resend(item.id);
      addToast(
        log.status === "Sent"
          ? `"${item.type}" email re-sent to ${item.client}.`
          : `Resend to ${item.client} failed: ${log.error || "mail server error"}`,
        log.status === "Sent" ? "success" : "error"
      );
      reload();
    } catch (err) {
      addToast(parseApiError(err).message, "error");
    } finally {
      setResendingId(null);
    }
  }

  const columns = [
    { key: "sentAt", header: "Sent", render: (r) => <span className="num">{r.sentAt}</span> },
    { key: "client", header: "Client", render: (r) => <span className="font-medium text-ink">{r.client}</span> },
    { key: "type", header: "Type" },
    { key: "subject", header: "Subject", className: "max-w-xs truncate" },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <Button size="sm" variant="outline" loading={resendingId === r.id} onClick={() => handleResend(r)}>
          Resend
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Email reminders, overdue notices, and receipts sent to clients."
      />
      <Card>
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : (
          <Table
            columns={columns}
            rows={items || []}
            loading={loading}
            emptyTitle="No notification activity yet"
            emptyBody="Reminders, overdue notices, and receipts will be logged here once sent."
          />
        )}
      </Card>
    </div>
  );
}

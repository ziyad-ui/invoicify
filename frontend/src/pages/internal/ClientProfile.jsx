import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import Card from "../../components/Card.jsx";
import Table from "../../components/Table.jsx";
import Tabs from "../../components/Tabs.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Button from "../../components/Button.jsx";
import Modal from "../../components/Modal.jsx";
import ClientFormModal from "../../components/ClientFormModal.jsx";
import RecordPaymentModal from "../../components/RecordPaymentModal.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { useToast } from "../../components/Toast.jsx";
import useFetch from "../../hooks/useFetch.js";
import { clientsApi } from "../../api/services.js";
import { parseApiError } from "../../api/http.js";
import { formatCurrency, formatDate } from "../../utils/format.js";

export default function ClientProfile() {
  const { id } = useParams();
  const { data: client, loading, error, reload, setData } = useFetch(() => clientsApi.get(id), [id]);
  const { addToast } = useToast();
  const [params, setParams] = useSearchParams();

  const [tab, setTab] = useState("invoices"); // "invoices" | "payments"
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetCreds, setResetCreds] = useState(null); // { email, password } shown once

  // Links like /clients/5?pay=1 or ?edit=1 open that modal straight away.
  useEffect(() => {
    if (!client) return;
    if (params.get("pay") && client.balance > 0) setPayOpen(true);
    if (params.get("edit")) setEditOpen(true);
    if (params.get("pay") || params.get("edit")) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client?.id]);

  const totalPaid = useMemo(
    () => client?.payments.reduce((s, p) => s + p.amount, 0) || 0,
    [client]
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingState label="Loading client…" />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <PageHeader title={error.status === 404 ? "Client not found" : "Couldn't load client"} />
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
        <Link to="/clients" className="mt-4 inline-block text-sm text-accent hover:underline">
          Back to Clients
        </Link>
      </div>
    );
  }

  async function handleResetPassword() {
    setResetting(true);
    try {
      const res = await clientsApi.resetPassword(client.id);
      setResetOpen(false);
      setResetCreds({ email: res.email, password: res.temporaryPassword });
      addToast(`A new temporary password was issued for ${client.name}.`, "success");
    } catch (err) {
      addToast(parseApiError(err).message, "error");
    } finally {
      setResetting(false);
    }
  }

  const invoiceColumns = [
    { key: "id", header: "Invoice #", render: (r) => <span className="num">{r.id}</span> },
    { key: "period", header: "Period" },
    { key: "amount", header: "Amount", render: (r) => <span className="num">{formatCurrency(r.amount)}</span> },
    { key: "paidAmount", header: "Paid", render: (r) => <span className="num">{formatCurrency(r.paidAmount)}</span> },
    { key: "dueDate", header: "Due Date", render: (r) => <span className="num">{formatDate(r.dueDate)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  const paymentColumns = [
    { key: "date", header: "Date", render: (r) => <span className="num">{formatDate(r.date)}</span> },
    { key: "amount", header: "Amount", render: (r) => <span className="num">{formatCurrency(r.amount)}</span> },
    { key: "mode", header: "Mode" },
    { key: "reference", header: "Reference No.", render: (r) => <span className="num">{r.reference || "—"}</span> },
    { key: "type", header: "Type" },
    { key: "verified", header: "Status", render: (r) => <StatusBadge status={r.verified ? "Verified" : "Pending"} /> },
  ];

  return (
    <div>
      <PageHeader
        title={client.name}
        subtitle={client.email}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setResetOpen(true)}>
              Reset Portal Password
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              Edit Details
            </Button>
            <Button onClick={() => setPayOpen(true)} disabled={client.balance <= 0}>
              Record Payment
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Outstanding Balance</p>
          <p className="num mt-2 text-2xl font-semibold">{formatCurrency(client.balance)}</p>
          <div className="mt-3">
            <StatusBadge status={client.status} />
          </div>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Property</p>
          <p className="mt-2 text-sm font-semibold text-ink">{client.property?.name}</p>
          <p className="mt-1 text-xs text-gray-500">{client.property?.type}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Next Due Date</p>
          <p className="num mt-2 text-lg font-semibold">{formatDate(client.dueDate)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {formatCurrency(client.plan?.monthly || 0)} / month · Total paid {formatCurrency(totalPaid)}
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <Tabs
          className="mb-4"
          active={tab}
          onChange={setTab}
          tabs={[
            { key: "invoices", label: "Invoices & Installments", count: client.invoices.length },
            { key: "payments", label: "Payment History", count: client.payments.length },
          ]}
        />
        {tab === "invoices" ? (
          <Table
            columns={invoiceColumns}
            rows={client.invoices}
            maxHeight="26rem"
            emptyTitle="No invoices yet"
            emptyBody="Invoices generated for this client's installment plan will appear here."
          />
        ) : (
          <Table
            columns={paymentColumns}
            rows={client.payments}
            maxHeight="26rem"
            emptyTitle="No payments recorded"
            emptyBody="Payments recorded for this client will appear here."
          />
        )}
      </Card>

      <RecordPaymentModal
        open={payOpen}
        client={client}
        onClose={() => setPayOpen(false)}
        onSaved={(res) => {
          setData(res.data); // API returns the updated client (new balance, invoices, history)
          setPayOpen(false);
          setTab("payments");
          addToast(`Payment of ${formatCurrency(res.payment.amount)} recorded for ${client.name}.`, "success");
        }}
      />

      <ClientFormModal
        open={editOpen}
        mode="edit"
        client={client}
        onClose={() => setEditOpen(false)}
        onSaved={(updated) => {
          setData(updated);
          setEditOpen(false);
          addToast("Client details updated.", "success");
        }}
      />

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset portal password?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} loading={resetting}>
              Reset password
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          <strong>{client.name}</strong> will be signed out of the client portal and given a new temporary password, which
          you'll see once so you can pass it on. They'll be asked to choose their own at next sign-in.
        </p>
      </Modal>

      <Modal
        open={!!resetCreds}
        onClose={() => setResetCreds(null)}
        title="New temporary password"
        footer={<Button onClick={() => setResetCreds(null)}>Done</Button>}
      >
        {resetCreds && (
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">
              Share these sign-in details with <strong>{client.name}</strong>. The password is shown <strong>only once</strong>.
            </p>
            <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              <div className="flex justify-between px-3 py-2">
                <dt className="text-gray-500">Email</dt>
                <dd className="num font-medium">{resetCreds.email}</dd>
              </div>
              <div className="flex justify-between px-3 py-2">
                <dt className="text-gray-500">Temporary password</dt>
                <dd className="num font-medium">{resetCreds.password}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import Card from "../../components/Card.jsx";
import Table from "../../components/Table.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Button from "../../components/Button.jsx";
import Modal from "../../components/Modal.jsx";
import FormField from "../../components/FormField.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { useToast } from "../../components/Toast.jsx";
import useFetch from "../../hooks/useFetch.js";
import { clientsApi } from "../../api/services.js";
import { parseApiError } from "../../api/http.js";
import { formatCurrency, formatDate } from "../../utils/format.js";

// Payments are made OUTSIDE Invoicify (cash, bank transfer, check) and then recorded here.
const PAYMENT_MODES = ["Cash", "Bank Transfer", "Check"];
const PROPERTY_TYPES = ["Residential Condominium", "House and Lot", "Open Lot", "Beach Property"];
const today = () => new Date().toISOString().slice(0, 10);

export default function ClientProfile() {
  const { id } = useParams();
  const { data: client, loading, error, reload, setData } = useFetch(() => clientsApi.get(id), [id]);
  const { addToast } = useToast();

  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", mode: "Cash", reference: "", paidAt: today() });
  const [payErrors, setPayErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});

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

  function validatePayment() {
    const next = {};
    if (!payForm.amount || Number(payForm.amount) <= 0) next.amount = "Enter a valid payment amount.";
    else if (Number(payForm.amount) > client.balance)
      next.amount = `Amount can't exceed the outstanding balance of ${formatCurrency(client.balance)}.`;
    if (payForm.mode !== "Cash" && !payForm.reference.trim())
      next.reference = "Reference number is required for this payment mode.";
    setPayErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleRecordPayment(e) {
    e?.preventDefault();
    if (!validatePayment()) return;
    setSaving(true);
    try {
      const res = await clientsApi.recordPayment(client.id, payForm);
      setData(res.data); // API returns the updated client (new balance, invoices, history)
      setPayOpen(false);
      setPayForm({ amount: "", mode: "Cash", reference: "", paidAt: today() });
      setPayErrors({});
      addToast(`Payment of ${formatCurrency(res.payment.amount)} recorded for ${client.name}.`, "success");
    } catch (err) {
      const { message, fields } = parseApiError(err);
      if (Object.keys(fields).length) setPayErrors(fields);
      else addToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  function openEdit() {
    setEditForm({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      propertyName: client.property?.name || "",
      propertyType: client.property?.type || PROPERTY_TYPES[0],
      totalPrice: client.property?.totalPrice ?? 0,
    });
    setEditErrors({});
    setEditOpen(true);
  }

  async function handleEdit(e) {
    e?.preventDefault();
    setSaving(true);
    try {
      const updated = await clientsApi.update(client.id, editForm);
      setData(updated);
      setEditOpen(false);
      addToast("Client details updated.", "success");
    } catch (err) {
      const { message, fields } = parseApiError(err);
      if (Object.keys(fields).length) setEditErrors(fields);
      else addToast(message, "error");
    } finally {
      setSaving(false);
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
            <Button variant="outline" onClick={openEdit}>
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

      <Card title="Invoices & Installments" className="mt-6">
        <Table
          columns={invoiceColumns}
          rows={client.invoices}
          emptyTitle="No invoices yet"
          emptyBody="Invoices generated for this client's installment plan will appear here."
        />
      </Card>

      <Card title="Payment History" className="mt-6">
        <Table
          columns={paymentColumns}
          rows={client.payments}
          emptyTitle="No payments recorded"
          emptyBody="Payments recorded for this client will appear here."
        />
      </Card>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Record Payment"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} loading={saving}>
              Save Payment
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleRecordPayment}>
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent-dark">
            Invoicify does not process online payments. Record a payment only after it has been
            received and verified through cash, bank transfer, or check.
          </p>
          <FormField
            label={`Amount (balance: ${formatCurrency(client.balance)})`}
            type="number"
            min="0"
            placeholder="8500"
            value={payForm.amount}
            onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
            error={payErrors.amount}
          />
          <FormField
            as="select"
            label="Payment mode"
            value={payForm.mode}
            onChange={(e) => setPayForm({ ...payForm, mode: e.target.value })}
            error={payErrors.mode}
          >
            {PAYMENT_MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </FormField>
          <FormField
            label="Reference number"
            placeholder={payForm.mode === "Cash" ? "Optional for cash" : "e.g. BANK-55291"}
            value={payForm.reference}
            onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
            error={payErrors.reference}
          />
          <FormField
            label="Date received"
            type="date"
            max={today()}
            value={payForm.paidAt}
            onChange={(e) => setPayForm({ ...payForm, paidAt: e.target.value })}
            error={payErrors.paidAt}
          />
        </form>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Client Details"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} loading={saving}>
              Save Changes
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleEdit}>
          <FormField label="Full name" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} error={editErrors.name} />
          <FormField label="Email address" type="email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} error={editErrors.email} />
          <FormField label="Phone" value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} error={editErrors.phone} />
          <FormField label="Property" value={editForm.propertyName || ""} onChange={(e) => setEditForm({ ...editForm, propertyName: e.target.value })} error={editErrors.propertyName} />
          <FormField as="select" label="Property type" value={editForm.propertyType || ""} onChange={(e) => setEditForm({ ...editForm, propertyType: e.target.value })} error={editErrors.propertyType}>
            {PROPERTY_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </FormField>
          <FormField label="Total price (₱)" type="number" min="0" value={editForm.totalPrice ?? ""} onChange={(e) => setEditForm({ ...editForm, totalPrice: e.target.value })} error={editErrors.totalPrice} />
        </form>
      </Modal>
    </div>
  );
}

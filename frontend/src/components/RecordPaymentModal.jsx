import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";
import FormField from "./FormField.jsx";
import { useToast } from "./Toast.jsx";
import { clientsApi } from "../api/services.js";
import { parseApiError } from "../api/http.js";
import { formatCurrency } from "../utils/format.js";

// Payments are made OUTSIDE Invoicify (cash, bank transfer, check) and then recorded here.
const PAYMENT_MODES = ["Cash", "Bank Transfer", "Check"];
const today = () => new Date().toISOString().slice(0, 10);

const REFERENCE_HINT = {
  Cash: "Optional for cash",
  "Bank Transfer": "Bank transaction / reference no.",
  Check: "Check number",
};

/** The client's monthly installment, capped at what they still owe (e.g. the last, smaller instalment). */
export function defaultPaymentAmount(client) {
  const monthly = Number(client?.plan?.monthly) || 0;
  const balance = Number(client?.balance) || 0;
  const amount = balance > 0 ? Math.min(monthly || balance, balance) : 0;
  return amount ? String(Math.round(amount * 100) / 100) : "";
}

/** "Record Payment" — opens with the amount already set to the client's monthly installment. */
export default function RecordPaymentModal({ open, client, onClose, onSaved }) {
  const { addToast } = useToast();
  const [form, setForm] = useState({ amount: "", mode: "Cash", reference: "", paidAt: today() });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !client) return;
    setForm({ amount: defaultPaymentAmount(client), mode: "Cash", reference: "", paidAt: today() });
    setErrors({});
  }, [open, client]);

  if (!client) return null;

  const monthly = Number(client.plan?.monthly) || 0;
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  function validate() {
    const next = {};
    if (!form.amount || Number(form.amount) <= 0) next.amount = "Enter a valid payment amount.";
    else if (Number(form.amount) > client.balance + 0.005)
      next.amount = `Amount can't exceed the outstanding balance of ${formatCurrency(client.balance)}.`;
    if (form.mode !== "Cash" && !form.reference.trim()) next.reference = "Reference number is required for this payment mode.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      onSaved?.(await clientsApi.recordPayment(client.id, form));
    } catch (err) {
      const { message, fields } = parseApiError(err);
      if (Object.keys(fields).length) setErrors(fields);
      else addToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Payment"
      width="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Save Payment
          </Button>
        </>
      }
    >
      <form className="grid grid-cols-6 gap-x-3 gap-y-4" onSubmit={handleSubmit} noValidate>
        <p className="col-span-6 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent-dark">
          Invoicify does not process online payments. Record a payment only after it has been received and verified
          through cash, bank transfer, or check.
        </p>

        <div className="col-span-6">
          <FormField
            label={`Amount (balance: ${formatCurrency(client.balance)})`}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            prefix="₱"
            placeholder={monthly ? monthly.toFixed(2) : "Amount received"}
            value={form.amount}
            onChange={set("amount")}
            error={errors.amount}
          />
          <div className="mt-1.5 flex gap-3 text-xs">
            {monthly > 0 && (
              <button
                type="button"
                className="font-medium text-accent hover:underline"
                onClick={() => setForm({ ...form, amount: defaultPaymentAmount(client) })}
              >
                Monthly installment ({formatCurrency(Math.min(monthly, client.balance))})
              </button>
            )}
            <button
              type="button"
              className="font-medium text-accent hover:underline"
              onClick={() => setForm({ ...form, amount: String(client.balance) })}
            >
              Full balance
            </button>
          </div>
        </div>

        <FormField className="col-span-6 sm:col-span-3" as="select" label="Payment mode" value={form.mode} onChange={set("mode")} error={errors.mode}>
          {PAYMENT_MODES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </FormField>
        <FormField className="col-span-6 sm:col-span-3" label="Date received" type="date" max={today()} value={form.paidAt} onChange={set("paidAt")} error={errors.paidAt} />
        <FormField className="col-span-6" label="Reference number" placeholder={REFERENCE_HINT[form.mode]} value={form.reference} onChange={set("reference")} error={errors.reference} />
      </form>
    </Modal>
  );
}

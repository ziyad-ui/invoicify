import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import Button from "./Button.jsx";
import FormField from "./FormField.jsx";
import { useToast } from "./Toast.jsx";
import { clientsApi } from "../api/services.js";
import { parseApiError } from "../api/http.js";

export const PROPERTY_TYPES = ["Residential Condominium", "House and Lot", "Open Lot", "Beach Property"];

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  propertyName: "",
  propertyType: PROPERTY_TYPES[0],
  totalPrice: "",
  termMonths: "12",
  monthlyAmount: "",
  firstDueDate: "",
};

/** MONTHLY = TOTAL PRICE / TERM, rounded to centavos; "" when either number isn't usable yet. */
export function calcMonthly(total, term) {
  const t = Number(total);
  const n = Number(term);
  if (!(t > 0) || !(n >= 1)) return "";
  return String(Math.round((t / n) * 100) / 100);
}

/**
 * One form for both "Add New Client" (mode="add") and "Edit Client Details" (mode="edit"), so the two
 * always look and behave the same. Changing total price or term recalculates the monthly amount, which
 * stays editable for roundings or discounts.
 *  onSaved(result): add -> { data, welcomeEmail, temporaryPassword }, edit -> the updated client
 */
export default function ClientFormModal({ open, mode = "add", client, onClose, onSaved }) {
  const editing = mode === "edit";
  const { addToast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Fresh form each time the modal opens (pre-filled from the client when editing).
  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editing && client) {
      setForm({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        propertyName: client.property?.name || "",
        propertyType: client.property?.type || PROPERTY_TYPES[0],
        totalPrice: String(client.property?.totalPrice ?? ""),
        termMonths: String(client.plan?.termMonths ?? ""),
        monthlyAmount: String(client.plan?.monthly ?? ""),
        firstDueDate: client.plan?.startDate || "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, editing, client]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // Price or term changed -> recalculate the monthly amount.
  const setPlanField = (field) => (e) => {
    const next = { ...form, [field]: e.target.value };
    next.monthlyAmount = calcMonthly(next.totalPrice, next.termMonths);
    setForm(next);
  };

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Client name is required.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (!form.propertyName.trim()) next.propertyName = "Property is required.";
    if (form.totalPrice === "" || Number(form.totalPrice) < 0) next.totalPrice = "Enter the total contract price.";
    if (!form.termMonths || Number(form.termMonths) < 1) next.termMonths = "Enter the number of months.";
    if (!form.monthlyAmount || Number(form.monthlyAmount) <= 0) next.monthlyAmount = "Monthly must be greater than 0.";
    if (!editing && !form.firstDueDate) next.firstDueDate = "Choose the first due date.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const result = editing ? await clientsApi.update(client.id, form) : await clientsApi.create(form);
      onSaved?.(result);
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
      title={editing ? "Edit Client Details" : "Add New Client"}
      width="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            {editing ? "Save Changes" : "Save Client"}
          </Button>
        </>
      }
    >
      <form className="grid grid-cols-6 gap-x-3 gap-y-4" onSubmit={handleSubmit} noValidate>
        <FormField className="col-span-6" label="Full name" placeholder="e.g. Maria Santos" value={form.name} onChange={set("name")} error={errors.name} />

        <FormField className="col-span-6 sm:col-span-3" label="Email address" type="email" placeholder="name@example.com" value={form.email} onChange={set("email")} error={errors.email} />
        <FormField className="col-span-6 sm:col-span-3" label="Phone (optional)" placeholder="e.g. 0917 123 4567" value={form.phone} onChange={set("phone")} error={errors.phone} />

        <FormField className="col-span-6" label="Property" placeholder="e.g. Unit 4B, Sunview Residences" value={form.propertyName} onChange={set("propertyName")} error={errors.propertyName} />

        <FormField
          as="select"
          className={editing ? "col-span-6" : "col-span-6 sm:col-span-3"}
          label="Property type"
          value={form.propertyType}
          onChange={set("propertyType")}
          error={errors.propertyType}
        >
          {PROPERTY_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </FormField>
        {!editing && (
          <FormField className="col-span-6 sm:col-span-3" label="First due date" type="date" value={form.firstDueDate} onChange={set("firstDueDate")} error={errors.firstDueDate} />
        )}

        <FormField
          className="col-span-6 sm:col-span-2"
          label="Total price (₱)"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="Contract price"
          value={form.totalPrice}
          onChange={setPlanField("totalPrice")}
          error={errors.totalPrice}
        />
        <FormField
          className="col-span-6 sm:col-span-2"
          label="Term (months)"
          type="number"
          min="1"
          max="120"
          step="1"
          placeholder="Number of months"
          value={form.termMonths}
          onChange={setPlanField("termMonths")}
          error={errors.termMonths}
        />
        <FormField
          className="col-span-6 sm:col-span-2"
          label="Monthly (₱)"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="Auto-calculated"
          value={form.monthlyAmount}
          onChange={set("monthlyAmount")}
          error={errors.monthlyAmount}
        />

        <p className="col-span-6 -mt-1 text-xs text-gray-400">
          Monthly is calculated as total price ÷ term. You can adjust it for roundings or discounts.
          {editing
            ? " Changing the monthly amount or term updates only the installments that have no payment yet."
            : " Saving generates the full monthly invoice schedule and emails the client their portal login."}
        </p>
      </form>
    </Modal>
  );
}

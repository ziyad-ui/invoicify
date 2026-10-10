import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import Card from "../../components/Card.jsx";
import Table from "../../components/Table.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Button from "../../components/Button.jsx";
import Modal from "../../components/Modal.jsx";
import FormField from "../../components/FormField.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { IconPlus, IconEdit, IconTrash, IconEye, IconSearch } from "../../components/icons.jsx";
import { useToast } from "../../components/Toast.jsx";
import useFetch from "../../hooks/useFetch.js";
import { clientsApi } from "../../api/services.js";
import { parseApiError } from "../../api/http.js";
import { formatCurrency, formatDate } from "../../utils/format.js";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  propertyName: "",
  propertyType: "Residential Condominium",
  totalPrice: "",
  monthlyAmount: "",
  termMonths: "12",
  firstDueDate: "",
};

const PROPERTY_TYPES = ["Residential Condominium", "House and Lot", "Open Lot", "Beach Property"];

const TEMPLATE_ROWS = [
  ["Name", "Email", "Phone", "Property Name", "Property Type", "Total Price", "Monthly Amount", "Term Months", "First Due Date"],
  ["Maria Santos", "maria.santos@gmail.com", "09175550142", "Unit 12B, Sunview Residences", "Residential Condominium", "1850000", "8500", "12", "2026-11-01"],
  ["Juan Dela Cruz", "juan.delacruz@gmail.com", "09185550987", "Lot 4, Greenfield Homes", "Open Lot", "950000", "12000", "12", "2026-11-15"],
];

function downloadCsv(filename, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n"); // BOM so Excel reads UTF-8
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Clients() {
  const { data: clients, loading, error, reload } = useFetch(() => clientsApi.list(), []);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null); // { name, email, password } shown once
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null); // { message, rows: [{row, name, errors[]}], more }
  const [imported, setImported] = useState(null); // { message, imported, pastDueCount, clients[] } shown once
  const { addToast } = useToast();

  const filtered = useMemo(() => {
    const list = clients || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.property?.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [clients, query]);

  function set(field) {
    return (e) => setForm({ ...form, [field]: e.target.value });
  }

  function validate() {
    const next = {};
    if (!form.name.trim()) next.name = "Client name is required.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (!form.propertyName.trim()) next.propertyName = "Property is required.";
    if (form.totalPrice === "" || Number(form.totalPrice) < 0) next.totalPrice = "Enter the total contract price.";
    if (!form.monthlyAmount || Number(form.monthlyAmount) <= 0)
      next.monthlyAmount = "Enter a monthly installment greater than 0.";
    if (!form.termMonths || Number(form.termMonths) < 1) next.termMonths = "Enter the number of months.";
    if (!form.firstDueDate) next.firstDueDate = "Choose the first due date.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleAddClient(e) {
    e?.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await clientsApi.create(form);
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setErrors({});
      setCreated({ name: res.data.name, email: res.data.email, password: res.temporaryPassword });
      reload();
      addToast(`${res.data.name} was added as a new client.`, "success");
    } catch (err) {
      const { message, fields } = parseApiError(err);
      if (Object.keys(fields).length) setErrors(fields);
      else addToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(client) {
    try {
      await clientsApi.archive(client.id);
      addToast(`${client.name}'s profile was archived.`, "warning");
      reload();
    } catch (err) {
      addToast(parseApiError(err).message, "error");
    }
  }

  function closeImport() {
    setImportOpen(false);
    setImportFile(null);
    setImportError(null);
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    setImportError(null);
    try {
      const res = await clientsApi.importFile(importFile);
      closeImport();
      setImported(res);
      reload();
      addToast(res.message, "success");
    } catch (err) {
      const data = err.response?.data;
      setImportError({
        message: parseApiError(err).message,
        rows: data?.rowErrors || [],
        more: data?.moreErrors || 0,
      });
    } finally {
      setImporting(false);
    }
  }

  function downloadCredentials() {
    downloadCsv("client-logins.csv", [
      ["Name", "Email", "Property", "Temporary Password"],
      ...imported.clients.map((c) => [c.name, c.email, c.property, c.temporaryPassword]),
    ]);
  }

  const columns = [
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
        <div className="flex justify-end gap-2 text-gray-400">
          <Link to={`/clients/${c.id}`} className="hover:text-accent" title="View profile">
            <IconEye width={16} height={16} />
          </Link>
          <Link to={`/clients/${c.id}`} className="hover:text-accent" title="Edit">
            <IconEdit width={16} height={16} />
          </Link>
          <button onClick={() => handleArchive(c)} className="hover:text-red-500" title="Archive">
            <IconTrash width={16} height={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              Import Spreadsheet
            </Button>
            <Button onClick={() => setModalOpen(true)}>
              <IconPlus width={16} height={16} /> Add Client
            </Button>
          </div>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <Card>
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
            <IconSearch width={16} height={16} className="text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by client, property, or email"
              className="w-full text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          <Table
            columns={columns}
            rows={filtered}
            loading={loading}
            emptyTitle="No clients found"
            emptyBody="Try a different search, or add a new client to get started."
          />
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Client"
        width="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddClient} loading={saving}>
              Save Client
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleAddClient}>
          <FormField label="Full name" placeholder="e.g. Maria Santos" value={form.name} onChange={set("name")} error={errors.name} />
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Email address" type="email" placeholder="client@example.com" value={form.email} onChange={set("email")} error={errors.email} />
            <FormField label="Phone (optional)" placeholder="0917 555 0142" value={form.phone} onChange={set("phone")} error={errors.phone} />
          </div>
          <FormField label="Property" placeholder="e.g. Unit 4B, Sunview Residences" value={form.propertyName} onChange={set("propertyName")} error={errors.propertyName} />
          <div className="grid grid-cols-2 gap-3">
            <FormField as="select" label="Property type" value={form.propertyType} onChange={set("propertyType")} error={errors.propertyType}>
              {PROPERTY_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </FormField>
            <FormField label="Total price (₱)" type="number" min="0" placeholder="1850000" value={form.totalPrice} onChange={set("totalPrice")} error={errors.totalPrice} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Monthly (₱)" type="number" min="0" placeholder="8500" value={form.monthlyAmount} onChange={set("monthlyAmount")} error={errors.monthlyAmount} />
            <FormField label="Term (months)" type="number" min="1" max="120" value={form.termMonths} onChange={set("termMonths")} error={errors.termMonths} />
            <FormField label="First due date" type="date" value={form.firstDueDate} onChange={set("firstDueDate")} error={errors.firstDueDate} />
          </div>
          <p className="text-xs text-gray-400">
            Saving generates the full monthly invoice schedule and a client portal login.
          </p>
        </form>
      </Modal>

      <Modal
        open={!!created}
        onClose={() => setCreated(null)}
        title="Client portal login created"
        footer={
          <Button onClick={() => setCreated(null)}>Done</Button>
        }
      >
        {created && (
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">
              Share these sign-in details with <strong>{created.name}</strong>. The temporary
              password is shown <strong>only once</strong>.
            </p>
            <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              <div className="flex justify-between px-3 py-2">
                <dt className="text-gray-500">Email</dt>
                <dd className="num font-medium">{created.email}</dd>
              </div>
              <div className="flex justify-between px-3 py-2">
                <dt className="text-gray-500">Temporary password</dt>
                <dd className="num font-medium">{created.password}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>

      <Modal
        open={importOpen}
        onClose={closeImport}
        title="Import clients from a spreadsheet"
        width="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeImport}>
              Cancel
            </Button>
            <Button onClick={handleImport} loading={importing} disabled={!importFile}>
              Import Clients
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm text-gray-600">
          <p>
            Upload an <strong>.xlsx</strong> or <strong>.csv</strong> file with one client per row. Each client gets
            their full monthly invoice schedule and a client portal login, exactly like <em>Add Client</em>.
          </p>
          <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
            <span>Columns: Name, Email, Phone, Property Name, Property Type, Total Price, Monthly Amount, Term Months, First Due Date</span>
            <Button variant="outline" size="sm" className="ml-3 flex-shrink-0" onClick={() => downloadCsv("clients-template.csv", TEMPLATE_ROWS)}>
              Download template
            </Button>
          </div>
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
            <strong>Already-running installments?</strong> Set <em>First Due Date</em> to the client's <strong>next unpaid</strong>{" "}
            due date and <em>Term Months</em> to the months <strong>remaining</strong>. A first due date in the past makes
            those invoices overdue right away, and overdue emails will go out.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              setImportFile(e.target.files?.[0] || null);
              setImportError(null);
            }}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-gray-200"
          />
          {importError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              <p className="font-medium">{importError.message}</p>
              {importError.rows.length > 0 && (
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">
                  {importError.rows.map((r) => (
                    <li key={r.row}>
                      <strong>Row {r.row}</strong>
                      {r.name ? ` (${r.name})` : ""}: {r.errors.join(" ")}
                    </li>
                  ))}
                  {importError.more > 0 && <li>…and {importError.more} more row(s) with problems.</li>}
                </ul>
              )}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={!!imported}
        onClose={() => setImported(null)}
        title="Import complete"
        footer={
          <>
            <Button variant="outline" onClick={downloadCredentials}>
              Download client logins (CSV)
            </Button>
            <Button onClick={() => setImported(null)}>Done</Button>
          </>
        }
      >
        {imported && (
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>{imported.message}</strong> Each client has a portal login with a temporary password. The passwords
              are shown <strong>only once</strong> — download the list now and keep it somewhere safe.
            </p>
            {imported.pastDueCount > 0 && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                {imported.pastDueCount} client(s) have a first due date in the past, so their invoices are already
                overdue and overdue notices will be emailed.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

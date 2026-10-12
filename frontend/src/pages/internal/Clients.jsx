import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import Card from "../../components/Card.jsx";
import Table from "../../components/Table.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Button from "../../components/Button.jsx";
import Modal from "../../components/Modal.jsx";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import ClientFormModal from "../../components/ClientFormModal.jsx";
import Tabs from "../../components/Tabs.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { IconPlus, IconEdit, IconArchive, IconRestore, IconTrash, IconEye, IconSearch } from "../../components/icons.jsx";
import { useToast } from "../../components/Toast.jsx";
import useFetch from "../../hooks/useFetch.js";
import { clientsApi } from "../../api/services.js";
import { parseApiError } from "../../api/http.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { usePreferences } from "../../context/PreferencesContext.jsx";
import { formatCurrency, formatDate } from "../../utils/format.js";

const STATUS_FILTERS = ["All", "Overdue", "Due Soon", "Current", "Fully Paid"];

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
  const { role } = useAuth();
  const { t } = usePreferences();
  const { data: clients, loading, error, reload } = useFetch(() => clientsApi.list(), []);
  const { data: archived, loading: archivedLoading, reload: reloadArchived } = useFetch(
    () => clientsApi.list({ archived: 1 }),
    []
  );
  const [view, setView] = useState("active"); // "active" | "archives"
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(null); // client being edited
  const [created, setCreated] = useState(null); // result of adding a client, shown once
  const [confirm, setConfirm] = useState(null); // { client, action: "archive" | "delete" }
  const [working, setWorking] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null); // { message, rows: [{row, name, errors[]}], more }
  const [imported, setImported] = useState(null); // { message, imported, pastDueCount, clients[] } shown once
  const { addToast } = useToast();

  const isArchives = view === "archives";

  const filtered = useMemo(() => {
    const list = (isArchives ? archived : clients) || [];
    const q = query.trim().toLowerCase();
    return list.filter((c) => {
      if (!isArchives && statusFilter !== "All" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.property?.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    });
  }, [clients, archived, query, statusFilter, isArchives]);

  function refreshAll() {
    reload();
    reloadArchived();
  }

  function handleAdded(res) {
    setAddOpen(false);
    setCreated({
      name: res.data.name,
      email: res.data.email,
      sent: res.welcomeEmail?.sent,
      error: res.welcomeEmail?.error,
      password: res.temporaryPassword,
    });
    refreshAll();
    addToast(`${res.data.name} was added as a new client.`, "success");
  }

  function handleEdited(updated) {
    setEditing(null);
    refreshAll();
    addToast(`${updated.name}'s details were updated.`, "success");
  }

  async function handleConfirm() {
    const { client, action } = confirm;
    setWorking(true);
    try {
      if (action === "archive") {
        await clientsApi.archive(client.id);
        addToast(`${client.name} was moved to Archives.`, "warning");
      } else {
        await clientsApi.deletePermanently(client.id);
        addToast(`${client.name} was permanently deleted.`, "warning");
      }
      setConfirm(null);
      refreshAll();
    } catch (err) {
      addToast(parseApiError(err).message, "error");
    } finally {
      setWorking(false);
    }
  }

  async function handleRestore(client) {
    try {
      await clientsApi.restore(client.id);
      addToast(`${client.name} was restored.`, "success");
      refreshAll();
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
      refreshAll();
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

  const baseColumns = [
    { key: "name", header: "Client", render: (c) => <span className="font-medium text-ink">{c.name}</span> },
    { key: "property", header: "Property", render: (c) => <span className="text-accent">{c.property?.name}</span> },
    { key: "balance", header: "Balance", render: (c) => <span className="num">{formatCurrency(c.balance)}</span> },
  ];

  const activeColumns = [
    ...baseColumns,
    { key: "dueDate", header: "Due Date", render: (c) => <span className="num">{formatDate(c.dueDate)}</span> },
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => {
        const blocked = c.balance > 0;
        return (
          <div className="flex justify-end gap-3 text-gray-400">
            <Link to={`/clients/${c.id}`} className="hover:text-accent" title="View profile" aria-label={`View ${c.name}`}>
              <IconEye width={16} height={16} />
            </Link>
            <button onClick={() => setEditing(c)} className="hover:text-accent" title="Edit details" aria-label={`Edit ${c.name}`}>
              <IconEdit width={16} height={16} />
            </button>
            <button
              onClick={() => !blocked && setConfirm({ client: c, action: "archive" })}
              disabled={blocked}
              className={blocked ? "cursor-not-allowed opacity-40" : "hover:text-red-500"}
              title={blocked ? "Clear the outstanding balance before archiving" : "Archive"}
              aria-label={`Archive ${c.name}`}
            >
              <IconArchive width={16} height={16} />
            </button>
          </div>
        );
      },
    },
  ];

  const archivedColumns = [
    ...baseColumns,
    { key: "archivedAt", header: "Archived", render: (c) => <span className="num">{formatDate(c.archivedAt)}</span> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (c) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => handleRestore(c)}>
            <IconRestore width={14} height={14} /> Restore
          </Button>
          {role === "owner" && (
            <Button size="sm" variant="outline" className="text-red-600" onClick={() => setConfirm({ client: c, action: "delete" })}>
              <IconTrash width={14} height={14} /> Delete permanently
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("clients.title")}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              {t("clients.import")}
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <IconPlus width={16} height={16} /> {t("clients.add")}
            </Button>
          </div>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <Card>
          <Tabs
            className="mb-4"
            active={view}
            onChange={setView}
            tabs={[
              { key: "active", label: t("clients.tabActive"), count: clients?.length },
              { key: "archives", label: t("clients.tabArchives"), count: archived?.length },
            ]}
          />

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
              <IconSearch width={16} height={16} className="text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("clients.search")}
                aria-label={t("clients.search")}
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </div>
            {!isArchives && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label={t("clients.filter")}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 sm:w-44"
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f} value={f}>
                    {f === "All" ? t("status.all") : t(`status.${f}`)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Table
            columns={isArchives ? archivedColumns : activeColumns}
            rows={filtered}
            loading={isArchives ? archivedLoading : loading}
            emptyTitle={isArchives ? "No archived clients" : "No clients found"}
            emptyBody={
              isArchives
                ? "Clients you archive are kept here and can be restored at any time."
                : "Try a different search or status, or add a new client to get started."
            }
          />
        </Card>
      )}

      <ClientFormModal open={addOpen} mode="add" onClose={() => setAddOpen(false)} onSaved={handleAdded} />
      <ClientFormModal open={!!editing} mode="edit" client={editing} onClose={() => setEditing(null)} onSaved={handleEdited} />

      <ConfirmModal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        loading={working}
        danger
        title={confirm?.action === "archive" ? "Archive client?" : "Delete permanently?"}
        confirmLabel={confirm?.action === "archive" ? "Archive" : "Delete permanently"}
      >
        {confirm?.action === "archive" ? (
          <>
            <strong>{confirm.client.name}</strong> will be removed from the active list and their portal login will be
            switched off. Their invoices and payment history are kept, and you can restore them anytime from Archives.
          </>
        ) : (
          confirm && (
            <>
              Are you sure you want to permanently delete <strong>{confirm.client.name}</strong>? Their invoices and
              payment history will be erased and removed from revenue totals. This action cannot be undone.
            </>
          )
        )}
      </ConfirmModal>

      <Modal
        open={!!created}
        onClose={() => setCreated(null)}
        title={created?.sent ? "Client added — login emailed" : "Client added — send the login yourself"}
        footer={<Button onClick={() => setCreated(null)}>Done</Button>}
      >
        {created && (
          <div className="space-y-3 text-sm text-gray-600">
            {created.sent ? (
              <p>
                A welcome email with the portal link, sign-in email and a temporary password was sent to{" "}
                <strong>{created.email}</strong>. They will choose their own password the first time they sign in.
              </p>
            ) : (
              <>
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
                  <strong>{created.name}</strong> was added, but the welcome email could not be sent
                  {created.error ? ` (${created.error})` : ""}. Share these sign-in details with them directly — the
                  temporary password is shown <strong>only once</strong>. You can also use <em>Resend</em> in
                  Notifications later.
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
              </>
            )}
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

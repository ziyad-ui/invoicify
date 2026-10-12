import React, { useState } from "react";
import PageHeader from "../../components/PageHeader.jsx";
import Card from "../../components/Card.jsx";
import Table from "../../components/Table.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import Button from "../../components/Button.jsx";
import Modal from "../../components/Modal.jsx";
import FormField from "../../components/FormField.jsx";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { IconPlus } from "../../components/icons.jsx";
import { useToast } from "../../components/Toast.jsx";
import useFetch from "../../hooks/useFetch.js";
import { staffApi } from "../../api/services.js";
import { parseApiError } from "../../api/http.js";

const EMPTY = { name: "", email: "" };

/** Owner-only: add Administrative Staff logins, edit them, reset their passwords, deactivate or delete them. */
export default function Staff() {
  const { data: people, loading, error, reload } = useFetch(() => staffApi.list(), []);
  const { addToast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState(null); // { name, email, password, emailed } shown once
  const [confirm, setConfirm] = useState(null); // { person, action: "reset" | "deactivate" | "delete" }
  const [editing, setEditing] = useState(null); // person being edited
  const [editForm, setEditForm] = useState(EMPTY);
  const [editErrors, setEditErrors] = useState({});
  const [working, setWorking] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleAdd(e) {
    e?.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = "Name is required.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const res = await staffApi.create(form);
      setAddOpen(false);
      setForm(EMPTY);
      setCredentials({ name: res.data.name, email: res.data.email, password: res.temporaryPassword });
      reload();
      addToast(`${res.data.name} was added as staff.`, "success");
    } catch (err) {
      const { message, fields } = parseApiError(err);
      if (Object.keys(fields).length) setErrors(fields);
      else addToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(person) {
    setEditForm({ name: person.name, email: person.email });
    setEditErrors({});
    setEditing(person);
  }

  async function handleEdit(e) {
    e?.preventDefault();
    const next = {};
    if (!editForm.name.trim()) next.name = "Name is required.";
    if (!editForm.email.trim()) next.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(editForm.email)) next.email = "Enter a valid email address.";
    setEditErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await staffApi.update(editing.id, { name: editForm.name.trim(), email: editForm.email.trim() });
      addToast(`${editForm.name.trim()}'s details were updated.`, "success");
      setEditing(null);
      reload();
    } catch (err) {
      const { message, fields } = parseApiError(err);
      if (Object.keys(fields).length) setEditErrors(fields);
      else addToast(message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirm() {
    const { person, action } = confirm;
    setWorking(true);
    try {
      if (action === "reset") {
        const res = await staffApi.resetPassword(person.id);
        setCredentials({ name: person.name, email: person.email, password: res.temporaryPassword, emailed: res.emailed });
        addToast(`${person.name} was signed out and given a new temporary password.`, "success");
      } else if (action === "delete") {
        await staffApi.remove(person.id);
        addToast(`${person.name} was permanently deleted.`, "warning");
      } else {
        await staffApi.update(person.id, { is_active: !person.isActive });
        addToast(person.isActive ? `${person.name} was deactivated.` : `${person.name} was re-activated.`, person.isActive ? "warning" : "success");
      }
      setConfirm(null);
      reload();
    } catch (err) {
      addToast(parseApiError(err).message, "error");
    } finally {
      setWorking(false);
    }
  }

  const columns = [
    { key: "name", header: "Name", render: (p) => <span className="font-medium text-ink">{p.name}</span> },
    { key: "email", header: "Email", render: (p) => <span className="num">{p.email}</span> },
    { key: "title", header: "Role" },
    {
      key: "status",
      header: "Status",
      render: (p) => <StatusBadge status={p.isActive ? "Active" : "Deactivated"} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (p) =>
        p.role === "owner" ? (
          <span className="text-xs text-gray-400">Account owner</span>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirm({ person: p, action: "reset" })}>
              Reset password
            </Button>
            <Button
              variant={p.isActive ? "outline" : "primary"}
              size="sm"
              onClick={() => setConfirm({ person: p, action: "deactivate" })} // toggles: deactivates, or re-activates when already inactive
            >
              {p.isActive ? "Deactivate" : "Re-activate"}
            </Button>
            <Button variant="outline" size="sm" className="text-red-600" onClick={() => setConfirm({ person: p, action: "delete" })}>
              Delete
            </Button>
          </div>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="People who can sign in as Administrative Staff. They can manage clients, invoices, payments and notifications, but not reports or this page."
        action={
          <Button onClick={() => setAddOpen(true)}>
            <IconPlus width={16} height={16} /> Add Staff
          </Button>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <Card>
          <Table
            columns={columns}
            rows={people || []}
            loading={loading}
            emptyTitle="No staff yet"
            emptyBody="Add a staff member to give them their own login."
          />
        </Card>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Staff Member"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} loading={saving}>
              Create Login
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleAdd}>
          <FormField label="Full name" placeholder="e.g. Marites Juan" value={form.name} onChange={set("name")} error={errors.name} />
          <FormField label="Email address" type="email" placeholder="staff@yourcompany.com" value={form.email} onChange={set("email")} error={errors.email} />
          <p className="text-xs text-gray-500">
            A temporary password is generated and shown once. They'll be asked to choose their own at first sign-in.
          </p>
        </form>
      </Modal>

      <ConfirmModal
        open={confirm?.action === "delete"}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        loading={working}
        danger
        title="Delete staff member?"
        confirmLabel="Delete permanently"
      >
        {confirm?.action === "delete" && (
          <>
            Are you sure you want to permanently delete <strong>{confirm.person.name}</strong>? This action cannot be
            undone. Payments they recorded stay in the history. If you only want to stop them signing in, use
            Deactivate instead.
          </>
        )}
      </ConfirmModal>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit staff member"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} loading={saving}>
              Save Changes
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleEdit} noValidate>
          <FormField label="Full name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} error={editErrors.name} />
          <FormField label="Email address" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} error={editErrors.email} />
          <p className="text-xs text-gray-500">
            Changing the email changes what they sign in with. To give them a new password, use Reset password.
          </p>
        </form>
      </Modal>

      <Modal
        open={!!confirm && confirm.action !== "delete"}
        onClose={() => setConfirm(null)}
        title={confirm?.action === "reset" ? "Reset password?" : confirm?.person.isActive ? "Deactivate staff member?" : "Re-activate staff member?"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant={confirm?.action === "deactivate" && confirm?.person.isActive ? "danger" : "primary"}
              onClick={handleConfirm}
              loading={working}
            >
              {confirm?.action === "reset" ? "Reset password" : confirm?.person.isActive ? "Deactivate" : "Re-activate"}
            </Button>
          </>
        }
      >
        {confirm && (
          <p className="text-sm text-gray-600">
            {confirm.action === "reset" ? (
              <>
                <strong>{confirm.person.name}</strong> will be signed out everywhere and given a new temporary password,
                which you'll see once.
              </>
            ) : confirm.person.isActive ? (
              <>
                <strong>{confirm.person.name}</strong> will be signed out immediately and won't be able to sign in until
                you re-activate them. Their history stays intact.
              </>
            ) : (
              <>
                <strong>{confirm.person.name}</strong> will be able to sign in again with their existing password.
              </>
            )}
          </p>
        )}
      </Modal>

      <Modal
        open={!!credentials}
        onClose={() => setCredentials(null)}
        title="Staff login ready"
        footer={<Button onClick={() => setCredentials(null)}>Done</Button>}
      >
        {credentials && (
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">
              {credentials.emailed ? (
                <>
                  A reset email with these details was sent to <strong>{credentials.name}</strong>. The temporary password
                  is shown here <strong>only once</strong> in case you need to pass it on yourself.
                </>
              ) : (
                <>
                  Share these sign-in details with <strong>{credentials.name}</strong>. The temporary password is shown{" "}
                  <strong>only once</strong>.
                </>
              )}
            </p>
            <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              <div className="flex justify-between px-3 py-2">
                <dt className="text-gray-500">Email</dt>
                <dd className="num font-medium">{credentials.email}</dd>
              </div>
              <div className="flex justify-between px-3 py-2">
                <dt className="text-gray-500">Temporary password</dt>
                <dd className="num font-medium">{credentials.password}</dd>
              </div>
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}

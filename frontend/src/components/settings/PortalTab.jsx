import React, { useEffect, useState } from "react";
import Card from "../Card.jsx";
import Button from "../Button.jsx";
import FormField from "../FormField.jsx";
import AnnouncementBanner from "../AnnouncementBanner.jsx";
import LoadingState from "../LoadingState.jsx";
import ErrorState from "../ErrorState.jsx";
import { useToast } from "../Toast.jsx";
import useFetch from "../../hooks/useFetch.js";
import { settingsApi } from "../../api/services.js";
import { parseApiError } from "../../api/http.js";

const MAX_MESSAGE = 300;

/** Owner only: what clients see on their dashboard (announcement banner) and how they're told to pay. */
export default function PortalTab() {
  const { addToast } = useToast();
  const { data, loading, error, reload } = useFetch(() => settingsApi.getPortal(), []);

  const [ann, setAnn] = useState({ enabled: false, message: "", tone: "info", expiresOn: "" });
  const [annErr, setAnnErr] = useState({});
  const [instructions, setInstructions] = useState("");
  const [instrErr, setInstrErr] = useState({});
  const [busy, setBusy] = useState(null); // "announcement" | "instructions" | "reset"

  useEffect(() => {
    if (!data) return;
    setAnn({ ...data.announcement, expiresOn: data.announcement.expiresOn || "" });
    setInstructions(data.paymentInstructions);
  }, [data]);

  if (loading) return <LoadingState label="Loading settings…" />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  async function save(section, payload, setErr, onDone) {
    setBusy(section);
    setErr({});
    try {
      const res = await settingsApi.savePortal(payload);
      onDone(res.data);
      addToast("Settings saved.", "success");
    } catch (err) {
      const { message, fields } = parseApiError(err);
      if (Object.keys(fields).length) setErr(fields);
      else addToast(message, "error");
    } finally {
      setBusy(null);
    }
  }

  const saveAnnouncement = (e) => {
    e.preventDefault();
    save(
      "announcement",
      { announcement: { enabled: ann.enabled, message: ann.message, tone: ann.tone, expires_on: ann.expiresOn || null } },
      setAnnErr,
      () => {}
    );
  };

  const saveInstructions = (e, reset = false) => {
    e?.preventDefault?.();
    save(reset ? "reset" : "instructions", { payment_instructions: reset ? null : instructions }, setInstrErr, (d) =>
      setInstructions(d.paymentInstructions)
    );
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <Card title="Dashboard announcement" subtitle="A notice at the top of every client's dashboard, such as “Office closed on October 31”.">
        <form onSubmit={saveAnnouncement} className="space-y-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              role="switch"
              checked={ann.enabled}
              onChange={(e) => setAnn({ ...ann, enabled: e.target.checked })}
              className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-gray-300 transition-colors checked:bg-accent relative before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
            />
            <span className="text-sm font-medium text-ink">{ann.enabled ? "Showing to clients" : "Hidden from clients"}</span>
          </label>

          <FormField
            as="textarea"
            rows={3}
            label="Message"
            placeholder="e.g. Our office will be closed on October 31. Payments made that day will be recorded on November 2."
            maxLength={MAX_MESSAGE}
            value={ann.message}
            onChange={(e) => setAnn({ ...ann, message: e.target.value })}
            error={annErr["announcement.message"]}
            hint={`${ann.message.length}/${MAX_MESSAGE}`}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField as="select" label="Style" value={ann.tone} onChange={(e) => setAnn({ ...ann, tone: e.target.value })}>
              <option value="info">Information</option>
              <option value="warning">Important notice</option>
            </FormField>
            <FormField
              type="date"
              label="Hide automatically after (optional)"
              min={today}
              value={ann.expiresOn}
              onChange={(e) => setAnn({ ...ann, expiresOn: e.target.value })}
              error={annErr["announcement.expires_on"]}
            />
          </div>

          {ann.message.trim() && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">Preview</p>
              <AnnouncementBanner message={ann.message} tone={ann.tone} />
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={busy === "announcement"}>
              Save announcement
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Payment instructions" subtitle="Shown to clients on their dashboard. Add your bank name, account number or office hours here.">
        <form onSubmit={saveInstructions} className="space-y-4">
          <FormField
            as="textarea"
            rows={6}
            label="Instructions"
            maxLength={1500}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            error={instrErr.payment_instructions}
            hint={`${instructions.length}/1500`}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" loading={busy === "reset"} onClick={() => saveInstructions(null, true)}>
              Reset to default
            </Button>
            <Button type="submit" size="sm" loading={busy === "instructions"}>
              Save instructions
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

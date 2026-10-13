import React from "react";
import { Link } from "react-router-dom";
import Card from "../../components/Card.jsx";
import PageHeader from "../../components/PageHeader.jsx";
import StatTile from "../../components/StatTile.jsx";
import StatusBadge from "../../components/StatusBadge.jsx";
import LoadingState from "../../components/LoadingState.jsx";
import ErrorState from "../../components/ErrorState.jsx";
import { IconHome, IconPayments, IconInvoice, IconCheck, IconInfo } from "../../components/icons.jsx";
import useFetch from "../../hooks/useFetch.js";
import { portalApi } from "../../api/services.js";
import { formatCurrency, formatDate } from "../../utils/format.js";

function Empty({ children }) {
  return <p className="px-5 pb-6 pt-1 text-sm text-gray-400">{children}</p>;
}

// GET /api/portal/me — the API only ever returns the signed-in client's own record.
export default function PortalDashboard() {
  const { data: client, loading, error, reload } = useFetch(() => portalApi.me(), []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingState label="Loading your account…" />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const invoices = client.invoices || [];
  const payments = client.payments || [];
  const term = client.plan?.termMonths || invoices.length || 0;
  const paidCount = invoices.filter((i) => i.status === "Paid").length;
  const pct = term ? Math.min(100, Math.round((paidCount / term) * 100)) : 0;
  const upcoming = invoices.filter((i) => i.status !== "Paid").slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle={client.property?.name} />

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink via-ink-soft to-accent-dark p-6 text-white shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-white/60">Outstanding balance</p>
            <p className="num mt-2 text-4xl font-semibold tracking-tight">{formatCurrency(client.balance)}</p>
            <p className="mt-2 text-sm text-white/60">
              Next payment due <span className="num font-medium text-white">{formatDate(client.dueDate)}</span>
            </p>
          </div>
          <StatusBadge status={client.status} />
        </div>

        {term > 0 && (
          <div className="relative mt-7">
            <div className="mb-2 flex items-center justify-between text-xs text-white/60">
              <span>Installment progress</span>
              <span className="num text-white/80">
                {paidCount} of {term} paid
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={IconHome} label="Property" value={client.property?.name || "—"} hint={client.property?.type} />
        <StatTile
          icon={IconPayments}
          label="Monthly installment"
          value={client.plan ? formatCurrency(client.plan.monthly) : "—"}
          hint={client.plan ? `${client.plan.termMonths}-month plan` : undefined}
        />
        <StatTile icon={IconInvoice} label="Next due date" value={formatDate(client.dueDate)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          flush
          title="Upcoming invoices"
          subtitle="What's still to be paid"
          action={
            <Link to="/portal/invoices" className="text-xs font-medium text-accent hover:underline">
              View all
            </Link>
          }
        >
          {upcoming.length === 0 ? (
            <Empty>Nothing left to pay. Your plan is settled.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100 border-t border-gray-100">
              {upcoming.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{inv.period}</p>
                    <p className="num mt-0.5 text-xs text-gray-400">
                      {inv.id} · due {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className="num text-sm font-semibold text-ink">{formatCurrency(inv.amount)}</span>
                    <StatusBadge status={inv.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          flush
          title="Recent payments"
          subtitle="Verified by Love Realty staff"
          action={
            payments.length > 0 && (
              <Link to="/portal/payments" className="text-xs font-medium text-accent hover:underline">
                View all
              </Link>
            )
          }
        >
          {payments.length === 0 ? (
            <Empty>Once a payment is recorded by Love Realty staff, it will appear here.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100 border-t border-gray-100">
              {payments.slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-status-okBg text-status-okText">
                      <IconCheck width={15} height={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{p.type}</p>
                      <p className="num mt-0.5 truncate text-xs text-gray-400">
                        {formatDate(p.date)}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="num flex-shrink-0 text-sm font-semibold text-ink">{formatCurrency(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent-soft px-4 py-3.5 text-sm text-gray-700">
        <IconInfo width={18} height={18} className="mt-0.5 flex-shrink-0 text-accent" />
        <p>
          To settle your balance, pay via bank transfer, check, or in person at the Love Realty office, then send your
          receipt to your account officer for recording. Payments are confirmed here once verified by staff.
        </p>
      </div>
    </div>
  );
}

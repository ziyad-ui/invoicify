export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr, opts = {}) {
  if (!dateStr) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: opts.withYear === false ? undefined : "numeric",
  });
}

export function daysUntil(dateStr) {
  const today = new Date();
  const due = new Date(dateStr);
  const ms = due.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
